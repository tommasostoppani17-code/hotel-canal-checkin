import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import {
  encryptField,
  decryptField,
  decryptCheckinRow,
  isEncryptedField,
} from './crypto-fields.js';
import {
  GDPR_RETENTION_DAYS,
  RETENTION_ANCHOR_SQL,
  addDaysYmd,
  runAnonymization,
} from './gdpr-retention.js';

export { GDPR_RETENTION_DAYS };

let db;

export function getDb() {
  if (!db) throw new Error('Database non inizializzato');
  return db;
}

function ensureColumn(name) {
  // Allowlist ferrea: niente DDL da input utente (anti SQL injection su ALTER).
  const ALLOWED = {
    email: 'email TEXT',
    receptionist: 'receptionist TEXT',
    guests_count: 'guests_count INTEGER',
    coupon_token: 'coupon_token TEXT',
    coupon_sent_at: 'coupon_sent_at TEXT',
    table_booking: 'table_booking TEXT',
    stay_date: 'stay_date TEXT',
    checkout_date: 'checkout_date TEXT',
    starred_at: 'starred_at TEXT',
    anonymized_at: 'anonymized_at TEXT',
  };
  const ddl = ALLOWED[name];
  if (!ddl) {
    throw new Error(`[db] colonna non consentita: ${String(name).slice(0, 40)}`);
  }
  const cols = db.prepare(`PRAGMA table_info(checkins)`).all();
  if (!cols.some((c) => c.name === name)) {
    // ddl è letterale dalla mappa, mai interpolato da request
    db.exec(`ALTER TABLE checkins ADD COLUMN ${ddl}`);
  }
}

export function initDb(databasePath) {
  const resolved = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });

  db = new Database(resolved);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT NOT NULL,
      email TEXT,
      guest_name TEXT,
      room_number TEXT,
      privacy_accepted_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      reported_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_checkins_reported
      ON checkins (reported_at);
  `);

  ensureColumn('email');
  ensureColumn('receptionist');
  ensureColumn('guests_count');
  ensureColumn('coupon_token');
  ensureColumn('coupon_sent_at');
  ensureColumn('table_booking');
  ensureColumn('stay_date');
  ensureColumn('checkout_date');
  ensureColumn('starred_at');
  ensureColumn('anonymized_at');

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_coupon_token
      ON checkins (coupon_token)
      WHERE coupon_token IS NOT NULL;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_checkins_created_at
      ON checkins (created_at);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_checkins_stay_date
      ON checkins (stay_date);
  `);

  backfillStayDates();
  migrateRoomUniqueToStayDate();

  // Contatori mensili senza PII (sopravvivono all’anonimizzazione GDPR)
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_month_stats (
      year_month TEXT NOT NULL,
      receptionist TEXT NOT NULL,
      checkins INTEGER NOT NULL DEFAULT 0,
      coupons INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year_month, receptionist)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS guest_blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_key TEXT NOT NULL UNIQUE,
      guest_name TEXT NOT NULL,
      notes TEXT,
      checkin_id INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_guest_blacklist_created
      ON guest_blacklist (created_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL DEFAULT 'blacklist_checkin',
      checkin_id INTEGER NOT NULL,
      blacklist_id INTEGER,
      guest_name TEXT NOT NULL,
      room_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      dismissed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_staff_alerts_open
      ON staff_alerts (dismissed_at, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_alerts_checkin_kind
      ON staff_alerts (checkin_id, kind);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS checkin_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkin_id INTEGER NOT NULL,
      staff_name TEXT NOT NULL,
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_checkin_activity_checkin
      ON checkin_activity (checkin_id, created_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS reception_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checkin_id INTEGER,
      guest_name TEXT NOT NULL,
      room_number TEXT,
      category TEXT NOT NULL DEFAULT 'other',
      instruction TEXT NOT NULL,
      due_date TEXT NOT NULL,
      due_time TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_by TEXT NOT NULL,
      completed_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_reception_notes_due
      ON reception_notes (due_date, status, due_time, id DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_credentials (
      staff_id TEXT PRIMARY KEY,
      pin_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      staff_id TEXT,
      ip TEXT,
      success INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_staff_access_log_created
      ON staff_access_log (created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_staff_access_log_staff
      ON staff_access_log (staff_id, created_at DESC);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_roster (
      staff_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      label TEXT NOT NULL,
      protected INTEGER NOT NULL DEFAULT 0,
      seeded INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_by TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS hotel_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT
    );
  `);

  seedStaffRoster();

  return db;
}

function parseSqliteUtc(createdAt) {
  const raw = String(createdAt || '').trim();
  if (!raw) return new Date();
  const iso = /Z$|[+-]\d{2}:\d{2}$/.test(raw)
    ? raw
    : raw.includes('T')
      ? `${raw}Z`
      : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/** YYYY-MM-DD in Europe/Rome. */
export function romeCalendarDate(from = new Date()) {
  const d = from instanceof Date ? from : parseSqliteUtc(from);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function liveCheckinSql(alias = '') {
  const col = alias ? `${alias}.anonymized_at` : 'anonymized_at';
  return `(${col} IS NULL)`;
}

/** YYYY-MM-DD check-in: null se vuoto, false se non valido, stringa se ok. */
export function parseStayDate(raw, today = romeCalendarDate()) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const min = addDaysYmd(today, -1);
  const max = addDaysYmd(today, 90);
  if (!min || !max || s < min || s > max) return false;
  return s;
}

/** YYYY-MM-DD checkout: null se vuoto, false se non valido, stringa se ok. */
export function parseCheckoutDate(raw, stayDate = romeCalendarDate()) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  if (s < stayDate) return false;
  const max = addDaysYmd(stayDate, 90);
  if (!max || s > max) return false;
  return s;
}

function backfillStayDates() {
  const rows = db
    .prepare(
      `SELECT id, created_at FROM checkins WHERE stay_date IS NULL OR TRIM(stay_date) = ''`,
    )
    .all();
  if (!rows.length) return;
  const stmt = db.prepare(`UPDATE checkins SET stay_date = ? WHERE id = ?`);
  const tx = db.transaction((list) => {
    for (const row of list) {
      stmt.run(romeCalendarDate(row.created_at), row.id);
    }
  });
  tx(rows);
}

function migrateRoomUniqueToStayDate() {
  try {
    db.exec(`DROP INDEX IF EXISTS idx_checkins_room_unique`);
  } catch (err) {
    console.warn('[db] drop idx_checkins_room_unique:', err.message || err);
  }
  try {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_room_day_unique
        ON checkins (stay_date, UPPER(TRIM(room_number)))
        WHERE room_number IS NOT NULL
          AND TRIM(room_number) != ''
          AND stay_date IS NOT NULL
          AND TRIM(stay_date) != '';
    `);
  } catch (err) {
    console.warn(
      '[db] idx_checkins_room_day_unique non creato:',
      err.message || err,
    );
  }
}

function couponSecrets() {
  const primary = String(process.env.COUPON_SECRET || '').trim();
  const cron = String(process.env.CRON_SECRET || '').trim();
  const isProd =
    process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
  if (isProd) {
    if (!primary || primary.length < 24) {
      throw new Error('COUPON_SECRET obbligatorio in produzione (≥24 char)');
    }
    if (cron && primary === cron) {
      throw new Error('COUPON_SECRET deve essere diverso da CRON_SECRET');
    }
    // Include cron solo per verificare link legacy firmati pre-hardening
    return cron && cron !== primary ? [primary, cron] : [primary];
  }
  const list = [primary, cron, 'hotel-canal-dev-coupon'].filter(Boolean);
  return [...new Set(list)];
}

function couponSecret() {
  return couponSecrets()[0];
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Token opaco (32 byte). PII solo in DB — niente email/telefono nell'URL.
 * Legacy v1 (json.hmac) ancora accettato in lettura per link già inviati.
 */
export function createCouponToken(_legacyIgnored = {}) {
  return crypto.randomBytes(32).toString('base64url');
}

/** Solo legacy firmato v1 (pre-hardening). I token opachi non hanno payload. */
export function parseCouponToken(token) {
  const raw = String(token || '').trim();
  if (!raw.includes('.')) return null;
  const i = raw.lastIndexOf('.');
  if (i <= 0) return null;
  const json = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  if (!json || !sig) return null;

  let valid = false;
  for (const secret of couponSecrets()) {
    const expect = crypto
      .createHmac('sha256', secret)
      .update(json)
      .digest('base64url');
    if (timingSafeEqualStr(sig, expect)) {
      valid = true;
      break;
    }
  }
  if (!valid) return null;
  try {
    const body = JSON.parse(Buffer.from(json, 'base64url').toString('utf8'));
    if (!body || body.v !== 1 || !body.id) return null;
    return body;
  } catch {
    return null;
  }
}

/** Preferisce riga DB; fallback solo per token legacy firmati. */
export function resolveCouponFromToken(token) {
  const raw = String(token || '').trim();
  if (!raw || raw.length < 16) return null;

  const row = getCheckinByCouponToken(raw);
  if (row) {
    return { row, payload: null, token: raw };
  }

  const payload = parseCouponToken(raw);
  if (!payload) return null;

  return {
    row: {
      id: null,
      phone: payload.p || '',
      email: payload.e || null,
      guest_name: payload.g || null,
      room_number: payload.r || null,
      receptionist: payload.s || null,
      guests_count: payload.n ?? 2,
      coupon_token: raw,
      coupon_sent_at: null,
      created_at: null,
    },
    payload,
    token: raw,
  };
}

function romeYearMonthNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}`;
}

/** SQLite `datetime('now')` / ISO → YYYY-MM in Europe/Rome. */
function romeYearMonthFromUtc(createdAt) {
  const raw = String(createdAt || '').trim();
  if (!raw) return romeYearMonthNow();
  const iso = /Z$|[+-]\d{2}:\d{2}$/.test(raw)
    ? raw
    : raw.includes('T')
      ? `${raw}Z`
      : `${raw.replace(' ', 'T')}Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return romeYearMonthNow();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(d);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}`;
}

function normalizeReceptionist(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
  return name || 'RECEPTION';
}

/** Solo i receptionist con account staff — niente refusi, test o placeholder. */
const STAFF_ROSTER_SEED = [
  { id: 'tommaso', name: 'TOMMASO', label: 'Tommaso', protected: 0 },
  { id: 'john', name: 'JOHN', label: 'John', protected: 0 },
  { id: 'alejandro', name: 'ALEJANDRO', label: 'Alejandro', protected: 0 },
  { id: 'maria', name: 'MARIA', label: 'Maria', protected: 0 },
  { id: 'mizan', name: 'MIZAN', label: 'Mizan', protected: 1 },
  { id: 'payel', name: 'PAYEL', label: 'Payel', protected: 1 },
  { id: 'sayeed', name: 'SAYEED', label: 'Sayeed', protected: 0 },
];

function seedStaffRoster() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO staff_roster
      (staff_id, name, label, protected, seeded, active, created_by)
    VALUES (?, ?, ?, ?, 1, 1, 'system')
  `);
  const tx = db.transaction(() => {
    for (const member of STAFF_ROSTER_SEED) {
      insert.run(member.id, member.name, member.label, member.protected);
    }
  });
  tx();
  db.prepare(`
    UPDATE staff_roster
    SET protected = CASE
      WHEN staff_id IN ('mizan', 'payel') THEN 1
      ELSE 0
    END
  `).run();
}

function mapStaffRosterRow(row) {
  if (!row) return null;
  return {
    id: row.staff_id,
    name: row.name,
    label: row.label,
    protected: Number(row.protected) === 1,
    seeded: Number(row.seeded) === 1,
    active: Number(row.active) === 1,
    createdBy: row.created_by || '',
  };
}

export function listStaffRoster({ activeOnly = true } = {}) {
  const sql = activeOnly
    ? `SELECT * FROM staff_roster WHERE active = 1 ORDER BY label COLLATE NOCASE ASC`
    : `SELECT * FROM staff_roster ORDER BY label COLLATE NOCASE ASC`;
  return db.prepare(sql).all().map(mapStaffRosterRow);
}

export function getStaffMember(staffId, { includeInactive = false } = {}) {
  const id = String(staffId || '').trim().toLowerCase();
  if (!id) return null;
  const row = includeInactive
    ? db.prepare(`SELECT * FROM staff_roster WHERE staff_id = ?`).get(id)
    : db.prepare(`SELECT * FROM staff_roster WHERE staff_id = ? AND active = 1`).get(id);
  return mapStaffRosterRow(row);
}

function normalizeStaffLoginKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Login staff: nome digitato (Tommaso / TOMMASO / tommaso), mai una lista. */
export function findStaffMemberByLogin(raw) {
  const typed = String(raw || '').trim();
  if (!typed) return null;
  const key = normalizeStaffLoginKey(typed);
  const slug = slugStaffId(typed);
  if (!key && !slug) return null;
  return (
    listStaffRoster({ activeOnly: true }).find((member) => {
      const id = String(member.id || '').toLowerCase();
      const label = normalizeStaffLoginKey(member.label);
      const name = normalizeStaffLoginKey(member.name);
      return key === id || key === label || key === name || (slug && slug === id);
    }) || null
  );
}

function slugStaffId(label) {
  return String(label || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24);
}

function titleStaffLabel(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function createStaffMember({ label, createdBy } = {}) {
  const display = titleStaffLabel(label);
  if (display.length < 2 || display.length > 40) {
    return { ok: false, error: 'name_invalid' };
  }
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]+$/.test(display)) {
    return { ok: false, error: 'name_invalid' };
  }
  const id = slugStaffId(display);
  if (id.length < 2) return { ok: false, error: 'name_invalid' };
  const name = display.toUpperCase();
  const existing = getStaffMember(id, { includeInactive: true });
  if (existing?.active) return { ok: false, error: 'name_taken' };
  if (existing && !existing.active) {
    db.prepare(`
      UPDATE staff_roster
      SET name = ?, label = ?, active = 1, created_by = ?, created_at = datetime('now')
      WHERE staff_id = ?
    `).run(name, display, String(createdBy || '').trim(), id);
    return { ok: true, member: getStaffMember(id), reactivated: true };
  }
  db.prepare(`
    INSERT INTO staff_roster (staff_id, name, label, protected, seeded, active, created_by)
    VALUES (?, ?, ?, 0, 0, 1, ?)
  `).run(id, name, display, String(createdBy || '').trim());
  return { ok: true, member: getStaffMember(id), reactivated: false };
}

export function deactivateStaffMember(staffId, { actorId } = {}) {
  const member = getStaffMember(staffId, { includeInactive: true });
  if (!member) return { ok: false, error: 'not_found' };
  if (!member.active) return { ok: false, error: 'not_found' };
  if (member.protected) return { ok: false, error: 'protected' };
  if (member.id === String(actorId || '').trim().toLowerCase()) {
    return { ok: false, error: 'self' };
  }
  db.prepare(`UPDATE staff_roster SET active = 0 WHERE staff_id = ?`).run(member.id);
  db.prepare(`DELETE FROM staff_credentials WHERE staff_id = ?`).run(member.id);
  return { ok: true, id: member.id, label: member.label };
}

function officialStaffNames() {
  return new Set(listStaffRoster({ activeOnly: true }).map((member) => member.name));
}

function isOfficialReceptionist(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
  return officialStaffNames().has(name);
}

function staffNameLetters(value) {
  return normalizeStaffLoginKey(value).replace(/[^a-z]/g, '');
}

/** Ospite scrive il nome a mano (tomaso/tomazo → T → Tommaso; ma/mi se c’è collisione). */
export function resolveReceptionistByInitials(raw) {
  const letters = staffNameLetters(raw);
  if (!letters) return null;
  const roster = listStaffRoster({ activeOnly: true });
  if (!roster.length) return null;

  const exact = roster.find((member) => {
    const name = staffNameLetters(member.name);
    const label = staffNameLetters(member.label);
    const id = staffNameLetters(member.id);
    return letters === name || letters === label || letters === id;
  });
  if (exact) return exact;

  const first = letters[0];
  const byFirst = roster.filter((member) => staffNameLetters(member.label || member.name)[0] === first);
  if (byFirst.length === 1) return byFirst[0];
  if (byFirst.length > 1 && letters.length >= 2) {
    const two = letters.slice(0, 2);
    const byTwo = byFirst.filter((member) => staffNameLetters(member.label || member.name).startsWith(two));
    if (byTwo.length === 1) return byTwo[0];
  }
  return null;
}

function rankingForOfficialStaff(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => isOfficialReceptionist(row?.receptionist))
    .filter((row) => (Number(row.totale_registrati) || Number(row.checkins) || 0) > 0);
}

function decrementStaffMonthStats({
  receptionist,
  withCoupon = false,
  yearMonth = romeYearMonthNow(),
} = {}) {
  const ym = String(yearMonth || romeYearMonthNow());
  const staff = normalizeReceptionist(receptionist);
  if (!staff || staff === 'RECEPTION') return;
  const couponDec = withCoupon ? 1 : 0;
  db.prepare(
    `
    UPDATE staff_month_stats
    SET
      checkins = MAX(0, checkins - 1),
      coupons = MAX(0, coupons - @couponDec)
    WHERE year_month = @ym AND receptionist = @staff
  `,
  ).run({ ym, staff, couponDec });
}

/** Incrementa contatori mensili (niente telefono/email/nome). */
export function bumpStaffMonthStats({
  receptionist,
  withCoupon = false,
  yearMonth = romeYearMonthNow(),
} = {}) {
  const ym = String(yearMonth || romeYearMonthNow());
  const staff = normalizeReceptionist(receptionist);
  const couponInc = withCoupon ? 1 : 0;
  db.prepare(
    `
    INSERT INTO staff_month_stats (year_month, receptionist, checkins, coupons)
    VALUES (@ym, @staff, 1, @couponInc)
    ON CONFLICT(year_month, receptionist) DO UPDATE SET
      checkins = checkins + 1,
      coupons = coupons + @couponInc
  `,
  ).run({ ym, staff, couponInc });
}

/** Snapshot rollup mensile (niente PII) — deve sopravvivere al purge GDPR. */
export function exportStaffMonthStats() {
  return db
    .prepare(
      `
      SELECT year_month, receptionist, checkins, coupons
      FROM staff_month_stats
      ORDER BY year_month ASC, receptionist ASC
    `,
    )
    .all();
}

/**
 * Unisce stats da backup: tiene il massimo tra locale e backup
 * (mai abbassare i contatori dopo un restore parziale).
 */
export function mergeStaffMonthStats(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;
  const stmt = db.prepare(`
    INSERT INTO staff_month_stats (year_month, receptionist, checkins, coupons)
    VALUES (@year_month, @receptionist, @checkins, @coupons)
    ON CONFLICT(year_month, receptionist) DO UPDATE SET
      checkins = MAX(checkins, excluded.checkins),
      coupons = MAX(coupons, excluded.coupons)
  `);
  const tx = db.transaction((list) => {
    let n = 0;
    for (const row of list) {
      const ym = String(row?.year_month || '').trim();
      const staff = normalizeReceptionist(row?.receptionist);
      const checkins = Math.max(0, Number(row?.checkins) || 0);
      const coupons = Math.max(0, Number(row?.coupons) || 0);
      if (!ym || !/^\d{4}-\d{2}$/.test(ym)) continue;
      stmt.run({
        year_month: ym,
        receptionist: staff,
        checkins,
        coupons,
      });
      n += 1;
    }
    return n;
  });
  return tx(rows);
}

/**
 * Ricalcola i mesi ancora presenti in `checkins` e fa merge (MAX) sul rollup.
 * Non cancella mesi storici già solo nel rollup (post GDPR).
 */
export function mergeStaffMonthStatsFromCheckins() {
  const rows = db
    .prepare(
      `
      SELECT receptionist, coupon_sent_at, coupon_token, room_number, created_at
      FROM checkins
    `,
    )
    .all();
  if (!rows.length) return 0;

  const map = new Map();
  for (const row of rows) {
    const ym = romeYearMonthFromUtc(row.created_at);
    const staff = normalizeReceptionist(row.receptionist);
    const key = `${ym}\0${staff}`;
    const cur = map.get(key) || { year_month: ym, receptionist: staff, checkins: 0, coupons: 0 };
    cur.checkins += 1;
    const hasCoupon =
      Boolean(row.coupon_sent_at) ||
      (Boolean(row.coupon_token) &&
        Boolean(String(row.room_number || '').trim()) &&
        staff !== 'RECEPTION');
    if (hasCoupon) cur.coupons += 1;
    map.set(key, cur);
  }
  return mergeStaffMonthStats([...map.values()]);
}

/** Elimina check-in del giorno (Rome) su una stanza (solo account tester). */
export function deleteCheckinsByRoom(roomNumber, stayDate = null) {
  const room = String(roomNumber || '').trim();
  if (!room) return 0;
  const day = String(stayDate || romeCalendarDate()).trim();
  return db
    .prepare(
      `
      DELETE FROM checkins
      WHERE room_number IS NOT NULL
        AND TRIM(room_number) != ''
        AND UPPER(TRIM(room_number)) = UPPER(TRIM(@room))
        AND stay_date = @day
    `,
    )
    .run({ room, day }).changes;
}

/** True se la stanza è già usata in quel giorno (default: oggi a Roma). */
export function isRoomTaken(roomNumber, excludeId = null, stayDate = null) {
  const room = String(roomNumber || '').trim();
  if (!room) return false;
  const day = String(stayDate || romeCalendarDate()).trim();
  const row = db
    .prepare(
      `
      SELECT id FROM checkins
      WHERE ${liveCheckinSql()}
        AND room_number IS NOT NULL
        AND TRIM(room_number) != ''
        AND UPPER(TRIM(room_number)) = UPPER(TRIM(@room))
        AND stay_date = @day
      LIMIT 1
    `,
    )
    .get({ room, day });
  if (!row) return false;
  if (excludeId != null && Number(row.id) === Number(excludeId)) return false;
  return true;
}

/** Check-in attivo per numero stanza nel giorno (email/telefono già decifrati). */
export function getActiveCheckinByRoom(roomNumber, stayDate = null) {
  const room = String(roomNumber || '').trim();
  if (!room) return null;
  const day = String(stayDate || romeCalendarDate()).trim();
  const row = db
    .prepare(
      `
      SELECT
        id, phone, email, guest_name, room_number, receptionist, guests_count,
        coupon_token, coupon_sent_at, table_booking, created_at, reported_at,
        stay_date, starred_at
      FROM checkins
      WHERE ${liveCheckinSql()}
        AND room_number IS NOT NULL
        AND TRIM(room_number) != ''
        AND UPPER(TRIM(room_number)) = UPPER(TRIM(@room))
        AND stay_date = @day
      ORDER BY id DESC
      LIMIT 1
    `,
    )
    .get({ room, day });
  return row ? decryptCheckinRow(row) : null;
}

export function insertCheckin({
  phone,
  email,
  guestName,
  roomNumber,
  receptionist,
  guestsCount,
  couponToken,
  withCoupon = false,
  skipStaffStats = false,
  stayDate = null,
  checkoutDate = null,
}) {
  const stmt = db.prepare(`
    INSERT INTO checkins (
      phone, email, guest_name, room_number, receptionist, guests_count,
      coupon_token, privacy_accepted_at, stay_date, checkout_date
    )
    VALUES (
      @phone, @email, @guestName, @roomNumber, @receptionist, @guestsCount,
      @couponToken, datetime('now'), @stayDate, @checkoutDate
    )
  `);

  const info = stmt.run({
    phone: encryptField(phone),
    email: email ? encryptField(email) : null,
    guestName: guestName ? encryptField(guestName) : null,
    roomNumber: roomNumber || null,
    receptionist: receptionist || null,
    guestsCount: guestsCount ?? null,
    couponToken: couponToken || null,
    stayDate: stayDate || romeCalendarDate(),
    checkoutDate: checkoutDate || null,
  });

  if (!skipStaffStats && receptionist) {
    try {
      bumpStaffMonthStats({
        receptionist,
        withCoupon: Boolean(withCoupon),
      });
    } catch (err) {
      console.error('[stats] bumpStaffMonthStats failed:', err.message || err);
    }
  }

  try {
    createBlacklistCheckinAlert({
      checkinId: info.lastInsertRowid,
      guestName: guestName || '',
      roomNumber: roomNumber || '',
    });
  } catch (err) {
    console.error('[alert] blacklist checkin failed:', err.message || err);
  }

  return info.lastInsertRowid;
}

export function markCouponSent(id) {
  return db
    .prepare(
      `UPDATE checkins SET coupon_sent_at = datetime('now') WHERE id = ?`,
    )
    .run(id).changes;
}

export function getCheckinById(id) {
  const row = db
    .prepare(
      `
      SELECT
        id, phone, email, guest_name, room_number, receptionist, guests_count,
        coupon_token, coupon_sent_at, table_booking, created_at, reported_at,
        stay_date, checkout_date, starred_at
      FROM checkins
      WHERE id = ?
    `,
    )
    .get(Number(id));
  return row ? decryptCheckinRow(row) : null;
}

/** Dashboard staff: elimina un check-in e i dati collegati (niente PII orfana). */
export function deleteStaffCheckin(id) {
  const numId = Number(id);
  if (!Number.isInteger(numId) || numId < 1) {
    return { ok: false, error: 'invalid_id' };
  }
  const row = getCheckinById(numId);
  if (!row) return { ok: false, error: 'not_found' };

  const tx = db.transaction(() => {
    db.prepare(`DELETE FROM checkin_activity WHERE checkin_id = ?`).run(numId);
    db.prepare(`DELETE FROM staff_alerts WHERE checkin_id = ?`).run(numId);
    db.prepare(`UPDATE reception_notes SET checkin_id = NULL WHERE checkin_id = ?`).run(
      numId,
    );
    db.prepare(`UPDATE guest_blacklist SET checkin_id = NULL WHERE checkin_id = ?`).run(
      numId,
    );
    db.prepare(`DELETE FROM checkins WHERE id = ?`).run(numId);
  });
  tx();

  const staff = String(row.receptionist || '').trim();
  if (staff && staff.toUpperCase() !== 'RECEPTION') {
    try {
      decrementStaffMonthStats({
        receptionist: staff,
        withCoupon: Boolean(row.coupon_sent_at),
        yearMonth: romeYearMonthFromUtc(row.created_at),
      });
    } catch (err) {
      console.error('[stats] decrementStaffMonthStats failed:', err.message || err);
    }
  }

  return { ok: true, id: numId };
}

const SEED_DEMO_TOKEN_PREFIX = 'seed-demo-50-';

/** Rimuove i check-in inseriti da scripts/seed-checkins.mjs (mai in produzione). */
export function purgeSeedDemoCheckins() {
  if (!db) return 0;
  const ids = db
    .prepare(
      `SELECT id FROM checkins WHERE coupon_token LIKE ?`,
    )
    .all(`${SEED_DEMO_TOKEN_PREFIX}%`)
    .map((row) => Number(row.id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) return 0;
  for (const id of ids) {
    deleteStaffCheckin(id);
  }
  return ids.length;
}

/** Save dinner table preference (e.g. 20:15 or 2026-08-17 20:15) and optional party size. */
export function setTableBooking(id, tableBooking, guestsCount = null) {
  const raw = String(tableBooking || '').trim().slice(0, 32);
  const dateTime = raw.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/,
  );
  const timeOnly = raw.match(/^(\d{1,2}):(\d{2})/);
  let time = '';
  if (dateTime) {
    const hh = String(Math.min(23, Number(dateTime[2]))).padStart(2, '0');
    const mm = String(Math.min(59, Number(dateTime[3]))).padStart(2, '0');
    time = `${dateTime[1]} ${hh}:${mm}`;
  } else if (timeOnly) {
    const hh = String(Math.min(23, Number(timeOnly[1]))).padStart(2, '0');
    const mm = String(Math.min(59, Number(timeOnly[2]))).padStart(2, '0');
    time = `${hh}:${mm}`;
  } else {
    time = raw.toUpperCase();
  }
  if (!time || time === 'NO' || time === 'SKIP' || time === 'NONE') {
    return getCheckinById(id);
  }
  let pax = null;
  if (guestsCount != null && guestsCount !== '') {
    pax = Number.parseInt(String(guestsCount), 10);
    if (!Number.isFinite(pax) || pax < 1) pax = null;
    if (pax > 20) pax = 20;
  }
  if (pax != null) {
    const result = db
      .prepare(
        `UPDATE checkins SET table_booking = ?, guests_count = ? WHERE id = ?`,
      )
      .run(time, pax, Number(id));
    if (!result.changes) return null;
  } else {
    const result = db
      .prepare(`UPDATE checkins SET table_booking = ? WHERE id = ?`)
      .run(time, Number(id));
    if (!result.changes) return null;
  }
  return getCheckinById(id);
}

export function getCheckinByCouponToken(token) {
  const row = db
    .prepare(
      `
      SELECT id, phone, email, guest_name, room_number, receptionist, guests_count, coupon_token, coupon_sent_at, created_at, stay_date
      FROM checkins
      WHERE coupon_token = ?
      LIMIT 1
    `,
    )
    .get(token);
  return row ? decryptCheckinRow(row) : null;
}

export function updateCheckinCouponDetails(id, { roomNumber, receptionist }) {
  return db
    .prepare(
      `
      UPDATE checkins
      SET room_number = @roomNumber,
          receptionist = @receptionist
      WHERE id = @id
    `,
    )
    .run({
      id,
      roomNumber: roomNumber || null,
      receptionist: receptionist || null,
    }).changes;
}

export function updateCheckinCouponToken(id, couponToken) {
  if (!id || !couponToken) return 0;
  return db
    .prepare(`UPDATE checkins SET coupon_token = @couponToken WHERE id = @id`)
    .run({ id, couponToken }).changes;
}

export function getUnreportedCheckins() {
  return db
    .prepare(
      `
      SELECT
        id,
        phone,
        email,
        guest_name,
        room_number,
        receptionist,
        guests_count,
        coupon_token,
        coupon_sent_at,
        table_booking,
        created_at,
        stay_date,
        starred_at
      FROM checkins
      WHERE ${liveCheckinSql()}
        AND reported_at IS NULL
      ORDER BY
        CASE WHEN room_number IS NULL OR TRIM(room_number) = '' THEN 1 ELSE 0 END,
        CAST(room_number AS INTEGER) ASC,
        room_number ASC,
        created_at ASC
    `,
    )
    .all()
    .map((row) => decryptCheckinRow(row));
}

export function listCheckinsForCsv(date = '') {
  const day = String(date || '').trim() || romeCalendarDate();
  return db
    .prepare(
      `
      SELECT
        id,
        phone,
        email,
        guest_name,
        room_number,
        receptionist,
        guests_count,
        coupon_token,
        coupon_sent_at,
        table_booking,
        created_at,
        stay_date,
        starred_at
      FROM checkins
      WHERE ${liveCheckinSql()}
        AND stay_date = ?
      ORDER BY
        CASE WHEN room_number IS NULL OR TRIM(room_number) = '' THEN 1 ELSE 0 END,
        CAST(room_number AS INTEGER) ASC,
        room_number ASC,
        created_at ASC
      LIMIT 2000
    `,
    )
    .all(day)
    .map((row) => decryptCheckinRow(row));
}

export function markReported(ids) {
  if (!Array.isArray(ids) || !ids.length) return 0;
  // Solo id numerici; placeholder bound — mai concatenare valori nel SQL.
  const safeIds = ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 5000);
  if (!safeIds.length) return 0;
  const placeholders = safeIds.map(() => '?').join(',');
  const result = db
    .prepare(
      `UPDATE checkins SET reported_at = datetime('now') WHERE id IN (${placeholders})`,
    )
    .run(...safeIds);
  return result.changes;
}

/** Stats for a calendar month (YYYY-MM). Prefer rollup table (GDPR-safe). */
export function getMonthlyStaffStats(yearMonth = null) {
  const ym = String(yearMonth || romeYearMonthNow());

  const rollupRanking = db
    .prepare(
      `
      SELECT
        receptionist,
        checkins AS totale_registrati,
        coupons AS coupon_emessi
      FROM staff_month_stats
      WHERE year_month = ?
      ORDER BY checkins DESC, coupons DESC, receptionist ASC
    `,
    )
    .all(ym);

  if (rollupRanking.length) {
    const totals = rollupRanking.reduce(
      (acc, row) => {
        acc.totale_mese += Number(row.totale_registrati) || 0;
        acc.totale_coupon += Number(row.coupon_emessi) || 0;
        return acc;
      },
      { totale_mese: 0, totale_coupon: 0 },
    );
    return {
      totals,
      ranking: rankingForOfficialStaff(rollupRanking),
      yearMonth: ym,
      source: 'rollup',
    };
  }

  // Fallback: check-in ancora in DB (utile in locale / primi giorni)
  const totals = db
    .prepare(
      `
      SELECT
        COUNT(*) AS totale_mese,
        SUM(
          CASE
            WHEN coupon_token IS NOT NULL AND coupon_token != '' THEN 1
            ELSE 0
          END
        ) AS totale_coupon
      FROM checkins
      WHERE strftime('%Y-%m', created_at) = ?
    `,
    )
    .get(ym);

  const ranking = db
    .prepare(
      `
      SELECT
        COALESCE(NULLIF(TRIM(receptionist), ''), 'RECEPTION') AS receptionist,
        COUNT(*) AS totale_registrati,
        SUM(
          CASE
            WHEN coupon_token IS NOT NULL AND coupon_token != '' THEN 1
            ELSE 0
          END
        ) AS coupon_emessi
      FROM checkins
      WHERE strftime('%Y-%m', created_at) = ?
      GROUP BY COALESCE(NULLIF(TRIM(receptionist), ''), 'RECEPTION')
      ORDER BY totale_registrati DESC, coupon_emessi DESC
    `,
    )
    .all(ym);

  return {
    totals,
    ranking: rankingForOfficialStaff(ranking),
    yearMonth: ym,
    source: 'checkins',
  };
}

export function countCheckins() {
  return db.prepare(`SELECT COUNT(*) AS n FROM checkins`).get()?.n || 0;
}

/** Snapshot completo per backup durable (Gist / disk) — PII resta cifrato at rest. */
export function exportAllCheckins() {
  return db
    .prepare(
      `
      SELECT
        id,
        phone,
        email,
        guest_name,
        room_number,
        receptionist,
        guests_count,
        coupon_token,
        coupon_sent_at,
        table_booking,
        privacy_accepted_at,
        created_at,
        reported_at,
        stay_date,
        checkout_date,
        starred_at
      FROM checkins
      ORDER BY id ASC
    `,
    )
    .all();
}

/**
 * Dopo checkout + 7 giorni: sovrascrive nome, telefono, email, coupon.
 * Restano stanza, date e receptionist. La dashboard non mostra queste righe.
 * Le stelline non trattengono i dati identificativi.
 */
export function applyGdprRetention(today = romeCalendarDate()) {
  const result = runAnonymization(db, today || romeCalendarDate(), {
    calendarDateFromCreatedAt: romeCalendarDate,
  });
  return Number(result?.changes || 0) + Number(result?.repaired || 0);
}

/** @deprecated alias — la retention è checkout + 7 giorni, non 24h. */
export function wipeContactPii() {
  return 0;
}

/** @deprecated alias — non azzerare PII prima del checkout + 7 giorni. */
export function wipeContactPiiOlderThanHours() {
  return applyGdprRetention();
}

/** @deprecated alias. */
export function purgeUnstarredOlderThanDays() {
  return applyGdprRetention();
}

/** GDPR post-report / boot: anonimizza oltre checkout + 7 giorni. */
export function purgeCheckinsOlderThanHours() {
  return applyGdprRetention();
}

export function purgeCheckinsOlderThan24Hours() {
  return applyGdprRetention();
}

/**
 * Ripristina check-in da backup se il DB locale è vuoto.
 * Preserva gli id originali quando presenti.
 */
export function importCheckinsIfEmpty(rows) {
  if (!Array.isArray(rows) || !rows.length) return 0;
  if (countCheckins() > 0) return 0;

  const stmt = db.prepare(`
    INSERT INTO checkins (
      id, phone, email, guest_name, room_number, receptionist, guests_count,
      coupon_token, coupon_sent_at, table_booking, privacy_accepted_at, created_at,
      reported_at, stay_date, checkout_date, starred_at
    ) VALUES (
      @id, @phone, @email, @guest_name, @room_number, @receptionist, @guests_count,
      @coupon_token, @coupon_sent_at, @table_booking, @privacy_accepted_at, @created_at,
      @reported_at, @stay_date, @checkout_date, @starred_at
    )
  `);

  const tx = db.transaction((list) => {
    let n = 0;
    for (const row of list) {
      if (!row?.phone) continue;
      if (String(row.coupon_token || '').startsWith('seed-demo-50-')) continue;
      // Backup già cifrato: non ri-cifrare. Legacy plaintext: cifra al ripristino.
      const phone = encryptField(row.phone);
      const email = row.email ? encryptField(row.email) : null;
      const guestName = row.guest_name ? encryptField(row.guest_name) : null;
      stmt.run({
        id: row.id ?? null,
        phone,
        email,
        guest_name: guestName,
        room_number: row.room_number || null,
        receptionist: row.receptionist || null,
        guests_count: row.guests_count ?? null,
        coupon_token: row.coupon_token || null,
        coupon_sent_at: row.coupon_sent_at || null,
        table_booking: row.table_booking || null,
        privacy_accepted_at:
          row.privacy_accepted_at || row.created_at || new Date().toISOString(),
        created_at: row.created_at || new Date().toISOString(),
        reported_at: row.reported_at || null,
        stay_date: row.stay_date || romeCalendarDate(row.created_at),
        checkout_date: row.checkout_date || null,
        starred_at: row.starred_at || null,
      });
      n += 1;
    }
    return n;
  });

  return tx(rows);
}

function hasVoucherFlag(row) {
  const staff = String(row?.receptionist || '').trim().toUpperCase();
  return Boolean(staff && staff !== 'RECEPTION');
}

export function normalizeGuestNameKey(name) {
  return String(name || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
}

function maskPhoneForStaff(phone) {
  const raw = String(phone || '').trim();
  if (!raw || raw === '[illeggibile]') return null;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 4) return '••• ••• ••••';
  const last2 = digits.slice(-2);
  if (digits.startsWith('39') && digits.length >= 10) {
    return `+39 ••• ••• ••${last2}`;
  }
  if (raw.startsWith('+')) {
    const ccLen = digits.length > 10 ? 2 : 1;
    const cc = digits.slice(0, ccLen);
    return `+${cc} ••• ••• ••${last2}`;
  }
  return `••• ••• ••${last2}`;
}

function maskEmailForStaff(email) {
  const raw = String(email || '').trim();
  if (!raw || raw === '[illeggibile]') return null;
  const at = raw.indexOf('@');
  if (at < 1) return '•••@•••';
  const local = raw.slice(0, at);
  const domain = raw.slice(at + 1);
  if (!domain) return '•••@•••';
  const first = local.slice(0, 1);
  return `${first}•••@${domain}`;
}

function isCheckinVisibleToStaff(row) {
  if (!row || row.anonymized_at) return false;
  const today = romeCalendarDate();
  const keepFrom = addDaysYmd(today, -GDPR_RETENTION_DAYS);
  const anchor = String(row.checkout_date || row.stay_date || '').trim()
    || romeCalendarDate(row.created_at);
  return Boolean(keepFrom) && anchor >= keepFrom;
}

function toStaffSafeRow(row, blacklistMap = null) {
  const dec = decryptCheckinRow(row);
  const guestName = dec.guest_name || '';
  const nameKey = normalizeGuestNameKey(guestName);
  const bl = nameKey && blacklistMap?.get(nameKey);
  const phonePlain = decryptFieldSoft(row.phone, 'phone', row.id);
  const phoneMasked = maskPhoneForStaff(phonePlain);
  const emailPlain = decryptFieldSoft(row.email, 'email', row.id);
  const emailMasked = maskEmailForStaff(emailPlain);
  return {
    id: dec.id,
    guestName,
    phoneMasked: phoneMasked || '—',
    hasPhone: Boolean(phonePlain && phonePlain !== '[illeggibile]' && phoneMasked),
    emailMasked: emailMasked || '—',
    hasEmail: Boolean(emailPlain && emailPlain !== '[illeggibile]' && emailMasked),
    roomNumber: dec.room_number || '',
    receptionist: dec.receptionist || '',
    guestsCount: dec.guests_count ?? null,
    voucher: hasVoucherFlag(dec),
    tableBooking: dec.table_booking || '',
    createdAt: dec.created_at || '',
    stayDate: dec.stay_date || romeCalendarDate(dec.created_at),
    checkoutDate: dec.checkout_date || '',
    starred: Boolean(dec.starred_at),
    checkCode: `HC-${String(dec.id).padStart(4, '0')}`,
    blacklisted: Boolean(bl),
    blacklistId: bl?.id ?? null,
    blacklistNotes: bl?.notes ?? '',
  };
}

function toBlacklistRow(row) {
  return {
    id: row.id,
    guestName: decryptFieldSoft(row.guest_name, 'guest_name', row.id),
    notes: decryptFieldSoft(row.notes, 'notes', row.id),
    checkinId: row.checkin_id ?? null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || null,
  };
}

function decryptFieldSoft(value, field, rowId) {
  if (value == null) return '';
  const raw = String(value);
  if (!raw) return '';
  if (!isEncryptedField(raw)) return raw;
  try {
    return decryptField(raw) || '';
  } catch (err) {
    console.error(
      `[crypto] decrypt ${field} failed (id=${rowId ?? '?'}):`,
      err.message || err,
    );
    return '[illeggibile]';
  }
}

function loadBlacklistMap() {
  const rows = db
    .prepare(`SELECT id, name_key, notes FROM guest_blacklist`)
    .all();
  const map = new Map();
  for (const row of rows) {
    map.set(row.name_key, {
      id: row.id,
      notes: decryptFieldSoft(row.notes, 'notes', row.id),
    });
  }
  return map;
}

function matchesStaffQuery(safe, q) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return true;
  const name = String(safe.guestName || '').toLowerCase();
  const room = String(safe.roomNumber || '').toLowerCase();
  const code = String(safe.checkCode || '').toLowerCase();
  return name.includes(needle) || room.includes(needle) || code.includes(needle);
}

/** Lista staff: ospiti in retention (fino a checkout + 7 giorni). Mai telefono/email in chiaro. */
export function listStaffCheckins({ date = '', q = '' } = {}) {
  const today = romeCalendarDate();
  const keepFrom = addDaysYmd(today, -GDPR_RETENTION_DAYS);
  const rows = db
    .prepare(
      `
      SELECT
        id, phone, email, guest_name, room_number, receptionist, guests_count,
        coupon_token, coupon_sent_at, table_booking, created_at, reported_at,
        stay_date, checkout_date, starred_at, anonymized_at
      FROM checkins
      WHERE ${liveCheckinSql()}
        AND date(${RETENTION_ANCHOR_SQL}) >= date(?)
      ORDER BY stay_date DESC, id DESC
    `,
    )
    .all(keepFrom);

  const blacklistMap = loadBlacklistMap();
  const safe = rows.map((row) => toStaffSafeRow(row, blacklistMap));
  const query = String(q || '').trim();
  const day = String(date || '').trim();
  let list = query ? safe.filter((row) => matchesStaffQuery(row, query)) : safe;
  if (!query && day) {
    list = list.filter((row) => row.stayDate === day);
  }
  return {
    today,
    date: day || today,
    checkins: list,
  };
}

/** Ospiti con soggiorno in corso: stay_date ≤ oggi ≤ checkout. */
export function listInHouseStaffCheckins({ q = '' } = {}) {
  const today = romeCalendarDate();
  const rows = db
    .prepare(
      `
      SELECT
        id, phone, email, guest_name, room_number, receptionist, guests_count,
        coupon_token, coupon_sent_at, table_booking, created_at, reported_at,
        stay_date, checkout_date, starred_at, anonymized_at
      FROM checkins
      WHERE ${liveCheckinSql()}
        AND date(COALESCE(NULLIF(TRIM(stay_date), ''), date(created_at))) <= date(@today)
        AND date(COALESCE(NULLIF(TRIM(checkout_date), ''), stay_date, date(created_at))) >= date(@today)
      ORDER BY
        CASE WHEN room_number IS NULL OR TRIM(room_number) = '' THEN 1 ELSE 0 END,
        CAST(room_number AS INTEGER) ASC,
        room_number ASC,
        id DESC
    `,
    )
    .all({ today });

  const blacklistMap = loadBlacklistMap();
  const safe = rows.map((row) => toStaffSafeRow(row, blacklistMap));
  const query = String(q || '').trim();
  const list = query ? safe.filter((row) => matchesStaffQuery(row, query)) : safe;
  return {
    today,
    total: safe.length,
    checkins: list,
  };
}

const CHECKIN_ACTIVITY_LABELS = {
  room_change: 'Stanza modificata',
  staff_assign: 'Receptionist assegnato',
  star: 'Aggiunto ai preferiti',
  unstar: 'Rimosso dai preferiti',
  phone_reveal: 'Telefono visualizzato',
  email_reveal: 'Email visualizzata',
  blacklist_add: 'Segnalato in lista nera',
  blacklist_edit: 'Segnalazione aggiornata',
  note_add: 'Nota reception aggiunta',
  note_done: 'Nota reception completata',
};

function normalizeStaffActor(raw) {
  return String(raw || '').trim().toUpperCase().slice(0, 60) || 'STAFF';
}

export function logCheckinActivity({ checkinId, staffName, action, detail = '' } = {}) {
  const cid = Number(checkinId);
  const actor = normalizeStaffActor(staffName);
  const kind = String(action || '').trim().slice(0, 40);
  if (!Number.isInteger(cid) || cid < 1 || !actor || !kind) return null;
  const result = db
    .prepare(
      `
      INSERT INTO checkin_activity (checkin_id, staff_name, action, detail)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run(
      cid,
      actor,
      kind,
      String(detail || '').trim().slice(0, 240) || null,
    );
  return result.lastInsertRowid;
}

export function listCheckinActivity(checkinId, limit = 12, actionFilter = null) {
  const cid = Number(checkinId);
  if (!Number.isInteger(cid) || cid < 1) return [];
  const cap = Math.min(Math.max(Number(limit) || 12, 1), 30);
  const action = String(actionFilter || '').trim().slice(0, 40);
  const rows = action
    ? db
      .prepare(
        `
      SELECT id, checkin_id, staff_name, action, detail, created_at
      FROM checkin_activity
      WHERE checkin_id = ? AND action = ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `,
      )
      .all(cid, action, cap)
    : db
      .prepare(
        `
      SELECT id, checkin_id, staff_name, action, detail, created_at
      FROM checkin_activity
      WHERE checkin_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `,
      )
      .all(cid, cap);
  return rows.map((row) => ({
    id: row.id,
    checkinId: row.checkin_id,
    staffName: row.staff_name || '',
    action: row.action || '',
    label: CHECKIN_ACTIVITY_LABELS[row.action] || row.action || 'Modifica',
    detail: row.detail || '',
    at: row.created_at || '',
  }));
}

export function updateCheckinRoom(id, roomNumber, staffName = null) {
  const row = getCheckinById(id);
  if (!row) return { ok: false, error: 'not_found' };
  const dec = decryptCheckinRow(row);
  const oldRoom = String(dec.room_number || '').trim().toUpperCase() || '';
  const nextRoom = String(roomNumber || '')
    .trim()
    .toUpperCase()
    .slice(0, 8);
  if (!nextRoom) return { ok: false, error: 'room_required' };
  if (!/^[0-9A-Z]{1,8}$/.test(nextRoom)) {
    return { ok: false, error: 'room_invalid' };
  }
  const stay = row.stay_date || romeCalendarDate(row.created_at);
  if (isRoomTaken(nextRoom, id, stay)) {
    return { ok: false, error: 'room_taken' };
  }
  db.prepare(`UPDATE checkins SET room_number = ? WHERE id = ?`).run(
    nextRoom,
    Number(id),
  );
  if (staffName && oldRoom !== nextRoom) {
    logCheckinActivity({
      checkinId: id,
      staffName,
      action: 'room_change',
      detail: `${oldRoom || '—'} → ${nextRoom}`,
    });
  }
  const keys = loadBlacklistMap();
  return { ok: true, row: toStaffSafeRow(getCheckinById(id), keys) };
}

export function updateCheckinReceptionist(id, receptionist, staffName = null) {
  const row = getCheckinById(id);
  if (!row) return { ok: false, error: 'not_found' };
  const dec = decryptCheckinRow(row);
  const oldStaff = String(dec.receptionist || '').trim().toUpperCase();
  const nextStaff = String(receptionist || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .slice(0, 60);
  if (!nextStaff) return { ok: false, error: 'staff_required' };
  db.prepare(`UPDATE checkins SET receptionist = ? WHERE id = ?`).run(
    nextStaff,
    Number(id),
  );
  if (!oldStaff) {
    try {
      bumpStaffMonthStats({
        receptionist: nextStaff,
        withCoupon: Boolean(dec.coupon_sent_at),
      });
    } catch (err) {
      console.error('[stats] bumpStaffMonthStats failed:', err.message || err);
    }
  }
  if (staffName && oldStaff !== nextStaff) {
    logCheckinActivity({
      checkinId: id,
      staffName,
      action: 'staff_assign',
      detail: `${oldStaff || '—'} → ${nextStaff}`,
    });
  }
  return { ok: true, row: toStaffSafeRow(getCheckinById(id), loadBlacklistMap()) };
}

export function toggleCheckinStar(id, staffName = null) {
  const row = getCheckinById(id);
  if (!row) return { ok: false, error: 'not_found' };
  const wasStarred = Boolean(row.starred_at);
  if (wasStarred) {
    db.prepare(`UPDATE checkins SET starred_at = NULL WHERE id = ?`).run(
      Number(id),
    );
  } else {
    db.prepare(
      `UPDATE checkins SET starred_at = datetime('now') WHERE id = ?`,
    ).run(Number(id));
  }
  if (staffName) {
    logCheckinActivity({
      checkinId: id,
      staffName,
      action: wasStarred ? 'unstar' : 'star',
    });
  }
  const keys = loadBlacklistMap();
  return { ok: true, row: toStaffSafeRow(getCheckinById(id), keys) };
}

function matchesBlacklistQuery(row, q) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return true;
  const name = String(row.guestName || '').toLowerCase();
  const notes = String(row.notes || '').toLowerCase();
  return name.includes(needle) || notes.includes(needle);
}

/** Lista nera staff — nomi + note, persistenti. */
export function listBlacklist({ q = '' } = {}) {
  const rows = db
    .prepare(
      `
      SELECT id, name_key, guest_name, notes, checkin_id, created_at, updated_at
      FROM guest_blacklist
      ORDER BY created_at DESC, id DESC
    `,
    )
    .all();
  const items = rows.map(toBlacklistRow);
  const query = String(q || '').trim();
  return {
    count: items.length,
    entries: query ? items.filter((row) => matchesBlacklistQuery(row, query)) : items,
  };
}

export function getBlacklistEntry(id) {
  const row = db
    .prepare(
      `
      SELECT id, name_key, guest_name, notes, checkin_id, created_at, updated_at
      FROM guest_blacklist
      WHERE id = ?
    `,
    )
    .get(Number(id));
  if (!row) return null;
  return toBlacklistRow(row);
}

export function addToBlacklist({ guestName, notes = '', checkinId = null, staffName = null } = {}) {
  const name = String(guestName || '').trim();
  const nameKey = normalizeGuestNameKey(name);
  if (!nameKey) return { ok: false, error: 'name_required' };

  const encName = encryptField(name);
  const encNotes = encryptField(String(notes || '').trim()) || null;
  const cid =
    checkinId != null && Number.isInteger(Number(checkinId)) && Number(checkinId) > 0
      ? Number(checkinId)
      : null;

  const existing = db
    .prepare(`SELECT id FROM guest_blacklist WHERE name_key = ?`)
    .get(nameKey);

  if (existing) {
    db.prepare(
      `
      UPDATE guest_blacklist
      SET guest_name = ?, notes = ?, checkin_id = COALESCE(?, checkin_id), updated_at = datetime('now')
      WHERE id = ?
    `,
    ).run(encName, encNotes, cid, existing.id);
    const entry = getBlacklistEntry(existing.id);
    if (staffName && entry?.checkinId) {
      logCheckinActivity({
        checkinId: entry.checkinId,
        staffName,
        action: 'blacklist_edit',
        detail: String(notes || '').trim().slice(0, 120),
      });
    }
    return { ok: true, updated: true, entry };
  }

  const result = db
    .prepare(
      `
      INSERT INTO guest_blacklist (name_key, guest_name, notes, checkin_id)
      VALUES (?, ?, ?, ?)
    `,
    )
    .run(nameKey, encName, encNotes, cid);
  const entry = getBlacklistEntry(result.lastInsertRowid);
  if (staffName && cid) {
    logCheckinActivity({
      checkinId: cid,
      staffName,
      action: 'blacklist_add',
      detail: String(notes || '').trim().slice(0, 120),
    });
  }
  return { ok: true, updated: false, entry };
}

export function addCheckinToBlacklist(id, notes = '', staffName = null) {
  const row = getCheckinById(id);
  if (!row) return { ok: false, error: 'not_found' };
  const dec = decryptCheckinRow(row);
  const guestName = String(dec.guest_name || '').trim();
  if (!guestName) return { ok: false, error: 'name_required' };
  return addToBlacklist({ guestName, notes, checkinId: id, staffName });
}

export function updateBlacklistNotes(id, notes, staffName = null) {
  const before = getBlacklistEntry(id);
  if (!before) return { ok: false, error: 'not_found' };
  const encNotes = encryptField(String(notes || '').trim()) || null;
  db.prepare(
    `UPDATE guest_blacklist SET notes = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(encNotes, Number(id));
  const entry = getBlacklistEntry(id);
  if (staffName && entry?.checkinId) {
    logCheckinActivity({
      checkinId: entry.checkinId,
      staffName,
      action: 'blacklist_edit',
      detail: String(notes || '').trim().slice(0, 120),
    });
  }
  return { ok: true, entry };
}

export function removeFromBlacklist(id) {
  const result = db
    .prepare(`DELETE FROM guest_blacklist WHERE id = ?`)
    .run(Number(id));
  if (!result.changes) return { ok: false, error: 'not_found' };
  return { ok: true };
}

function toStaffAlertRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    kind: row.kind || 'blacklist_checkin',
    checkinId: row.checkin_id,
    blacklistId: row.blacklist_id ?? null,
    guestName: decryptFieldSoft(row.guest_name, 'guest_name', row.id),
    roomNumber: row.room_number || '',
    notes: decryptFieldSoft(row.notes, 'notes', row.id),
    createdAt: row.created_at || '',
  };
}

/** Crea alert staff se l'ospite è in segnalazione al momento del check-in. */
export function createBlacklistCheckinAlert({ checkinId, guestName, roomNumber = '' } = {}) {
  const cid = Number(checkinId);
  if (!Number.isInteger(cid) || cid < 1) return null;

  const name = String(guestName || '').trim();
  const nameKey = normalizeGuestNameKey(name);
  if (!nameKey) return null;

  const bl = db
    .prepare(`SELECT id, notes FROM guest_blacklist WHERE name_key = ?`)
    .get(nameKey);
  if (!bl) return null;

  const existing = db
    .prepare(
      `SELECT id FROM staff_alerts WHERE checkin_id = ? AND kind = 'blacklist_checkin'`,
    )
    .get(cid);
  if (existing) return toStaffAlertRow(db.prepare(`SELECT * FROM staff_alerts WHERE id = ?`).get(existing.id));

  const encName = encryptField(name);
  const encNotes = bl.notes || null;
  const room = String(roomNumber || '').trim().toUpperCase().slice(0, 8) || null;

  const result = db
    .prepare(
      `
      INSERT INTO staff_alerts (kind, checkin_id, blacklist_id, guest_name, room_number, notes)
      VALUES ('blacklist_checkin', ?, ?, ?, ?, ?)
    `,
    )
    .run(cid, bl.id, encName, room, encNotes);

  console.log(`[alert] blacklist check-in · ${name} · checkin=${cid} · room ${room || '—'}`);
  return toStaffAlertRow(
    db.prepare(`SELECT * FROM staff_alerts WHERE id = ?`).get(result.lastInsertRowid),
  );
}

export function listStaffAlerts({ includeDismissed = false } = {}) {
  const rows = db
    .prepare(
      `
      SELECT *
      FROM staff_alerts
      WHERE (? = 1 OR dismissed_at IS NULL)
      ORDER BY created_at DESC
      LIMIT 30
    `,
    )
    .all(includeDismissed ? 1 : 0);
  const alerts = rows.map(toStaffAlertRow).filter(Boolean);
  const openCount = db
    .prepare(`SELECT COUNT(*) AS n FROM staff_alerts WHERE dismissed_at IS NULL`)
    .get().n;
  return { alerts, openCount };
}

export function dismissStaffAlert(id) {
  const aid = Number(id);
  if (!Number.isInteger(aid) || aid < 1) return { ok: false, error: 'invalid_id' };
  const result = db
    .prepare(
      `UPDATE staff_alerts SET dismissed_at = datetime('now') WHERE id = ? AND dismissed_at IS NULL`,
    )
    .run(aid);
  if (!result.changes) return { ok: false, error: 'not_found' };
  return { ok: true };
}

/** Decrittazione telefono su richiesta — solo check-in visibili allo staff. */
export function revealStaffCheckinPhone(id, staffName = null) {
  const row = getCheckinById(id);
  if (!row || !isCheckinVisibleToStaff(row)) {
    return { ok: false, error: 'not_found' };
  }
  const dec = decryptCheckinRow(row);
  const phone = String(dec.phone || '').trim();
  if (!phone || phone === '[illeggibile]') {
    return { ok: false, error: 'no_phone' };
  }
  if (staffName) {
    logCheckinActivity({ checkinId: id, staffName, action: 'phone_reveal' });
  }
  return { ok: true, phone };
}

/** Decrittazione email su richiesta — solo check-in visibili allo staff. */
export function revealStaffCheckinEmail(id, staffName = null) {
  const row = getCheckinById(id);
  if (!row || !isCheckinVisibleToStaff(row)) {
    return { ok: false, error: 'not_found' };
  }
  const dec = decryptCheckinRow(row);
  const email = String(dec.email || '').trim();
  if (!email || email === '[illeggibile]') {
    return { ok: false, error: 'no_email' };
  }
  if (staffName) {
    logCheckinActivity({ checkinId: id, staffName, action: 'email_reveal' });
  }
  return { ok: true, email };
}

export const RECEPTION_NOTE_CATEGORIES = {
  taxi: 'Taxi / transfer',
  info: 'Info & documenti',
  room_change: 'Cambio camera',
  checkout: 'Checkout / partenza',
  other: 'Altro',
};

const RECEPTION_NOTE_CATEGORY_KEYS = new Set(Object.keys(RECEPTION_NOTE_CATEGORIES));

function normalizeReceptionNoteCategory(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return RECEPTION_NOTE_CATEGORY_KEYS.has(key) ? key : 'other';
}

function normalizeDueTime(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function normalizeDueDate(raw) {
  const d = String(raw || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function toReceptionNoteRow(row) {
  if (!row) return null;
  const category = normalizeReceptionNoteCategory(row.category);
  return {
    id: row.id,
    checkinId: row.checkin_id ?? null,
    guestName: String(row.guest_name || '').trim(),
    roomNumber: String(row.room_number || '').trim().toUpperCase(),
    category,
    categoryLabel: RECEPTION_NOTE_CATEGORIES[category] || RECEPTION_NOTE_CATEGORIES.other,
    instruction: String(row.instruction || '').trim(),
    dueDate: row.due_date || '',
    dueTime: row.due_time || '',
    status: row.status === 'done' ? 'done' : 'open',
    createdBy: row.created_by || '',
    completedBy: row.completed_by || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || null,
    completedAt: row.completed_at || null,
  };
}

function matchesReceptionNoteQuery(row, q) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return true;
  return (
    String(row.guestName || '').toLowerCase().includes(needle)
    || String(row.roomNumber || '').toLowerCase().includes(needle)
    || String(row.instruction || '').toLowerCase().includes(needle)
    || String(row.categoryLabel || '').toLowerCase().includes(needle)
  );
}

export function listReceptionNotes({ date = '', q = '', includeDone = false, shift = false } = {}) {
  const today = romeCalendarDate(new Date().toISOString());
  const dueDate = normalizeDueDate(date);
  const shiftView = Boolean(shift) || !dueDate;
  const params = [today, today];
  let where = '1=1';
  if (!shiftView && dueDate) {
    where += ' AND due_date = ?';
    params.push(dueDate);
  }
  if (!includeDone) {
    where += " AND status = 'open'";
  }
  const rows = db
    .prepare(
      `
      SELECT *
      FROM reception_notes
      WHERE ${where}
      ORDER BY
        CASE WHEN status = 'open' THEN 0 ELSE 1 END,
        CASE
          WHEN due_date < ? THEN 0
          WHEN due_date = ? THEN 1
          ELSE 2
        END,
        due_date ASC,
        CASE WHEN due_time IS NULL OR TRIM(due_time) = '' THEN 1 ELSE 0 END,
        due_time ASC,
        datetime(created_at) DESC,
        id DESC
    `,
    )
    .all(...params)
    .map(toReceptionNoteRow)
    .filter(Boolean);
  const query = String(q || '').trim();
  const notes = query ? rows.filter((row) => matchesReceptionNoteQuery(row, query)) : rows;
  const openCount = db
    .prepare(`SELECT COUNT(*) AS n FROM reception_notes WHERE status = 'open'`)
    .get().n;
  const urgentOpenCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM reception_notes WHERE status = 'open' AND due_date <= ?`,
    )
    .get(today).n;
  const todayOpenCount = db
    .prepare(
      `SELECT COUNT(*) AS n FROM reception_notes WHERE status = 'open' AND due_date = ?`,
    )
    .get(today).n;
  return {
    notes,
    openCount,
    urgentOpenCount,
    todayOpenCount,
    date: shiftView ? null : dueDate || null,
    today,
    shift: shiftView,
  };
}

export function countUrgentOpenReceptionNotes() {
  const today = romeCalendarDate(new Date().toISOString());
  return db
    .prepare(
      `SELECT COUNT(*) AS n FROM reception_notes WHERE status = 'open' AND due_date <= ?`,
    )
    .get(today).n;
}

export function countOpenReceptionNotes() {
  return db
    .prepare(`SELECT COUNT(*) AS n FROM reception_notes WHERE status = 'open'`)
    .get().n;
}

export function listInboxNotes({ staffName = '', limit = 40 } = {}) {
  const actor = normalizeStaffActor(staffName);
  const cap = Math.min(Math.max(Number(limit) || 40, 1), 80);
  const notes = db
    .prepare(
      `
      SELECT *
      FROM reception_notes
      WHERE status = 'open'
        AND UPPER(TRIM(COALESCE(created_by, ''))) != ?
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ?
    `,
    )
    .all(actor, cap)
    .map(toReceptionNoteRow)
    .filter(Boolean);
  const countRow = db
    .prepare(
      `
      SELECT COUNT(*) AS n
      FROM reception_notes
      WHERE status = 'open'
        AND UPPER(TRIM(COALESCE(created_by, ''))) != ?
    `,
    )
    .get(actor);
  return { notes, count: Number(countRow?.n) || 0 };
}

export function getReceptionNote(id) {
  const row = db
    .prepare(`SELECT * FROM reception_notes WHERE id = ?`)
    .get(Number(id));
  return toReceptionNoteRow(row);
}

export function createReceptionNote({
  checkinId = null,
  guestName,
  roomNumber = '',
  category = 'other',
  instruction,
  dueDate,
  dueTime = '',
  createdBy,
} = {}) {
  const name = String(guestName || '').trim();
  const text = String(instruction || '').trim();
  const day = normalizeDueDate(dueDate) || romeCalendarDate(new Date().toISOString());
  const actor = normalizeStaffActor(createdBy);
  if (!name) return { ok: false, error: 'name_required' };
  if (!text) return { ok: false, error: 'instruction_required' };
  const room = String(roomNumber || '').trim().toUpperCase().slice(0, 8) || null;
  const cid =
    checkinId != null && Number.isInteger(Number(checkinId)) && Number(checkinId) > 0
      ? Number(checkinId)
      : null;
  const result = db
    .prepare(
      `
      INSERT INTO reception_notes (
        checkin_id, guest_name, room_number, category, instruction,
        due_date, due_time, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
    .run(
      cid,
      name,
      room,
      normalizeReceptionNoteCategory(category),
      text,
      day,
      normalizeDueTime(dueTime),
      actor,
    );
  const note = getReceptionNote(result.lastInsertRowid);
  if (cid) {
    logCheckinActivity({
      checkinId: cid,
      staffName: actor,
      action: 'note_add',
      detail: `${RECEPTION_NOTE_CATEGORIES[note.category] || 'Nota'} · ${text.slice(0, 80)}`,
    });
  }
  return { ok: true, note };
}

export function updateReceptionNote(id, patch = {}, staffName = null) {
  const existing = getReceptionNote(id);
  if (!existing) return { ok: false, error: 'not_found' };
  const name = String(patch.guestName ?? existing.guestName).trim();
  const text = String(patch.instruction ?? existing.instruction).trim();
  const day = normalizeDueDate(patch.dueDate) || existing.dueDate;
  if (!name) return { ok: false, error: 'name_required' };
  if (!text) return { ok: false, error: 'instruction_required' };
  const room = String(patch.roomNumber ?? existing.roomNumber).trim().toUpperCase().slice(0, 8) || null;
  db.prepare(
    `
    UPDATE reception_notes
    SET guest_name = ?, room_number = ?, category = ?, instruction = ?,
        due_date = ?, due_time = ?, updated_at = datetime('now')
    WHERE id = ?
  `,
  ).run(
    name,
    room,
    normalizeReceptionNoteCategory(patch.category ?? existing.category),
    text,
    day,
    normalizeDueTime(patch.dueTime ?? existing.dueTime),
    Number(id),
  );
  return { ok: true, note: getReceptionNote(id) };
}

export function setReceptionNoteStatus(id, status, staffName = null) {
  const note = getReceptionNote(id);
  if (!note) return { ok: false, error: 'not_found' };
  const next = status === 'done' ? 'done' : 'open';
  const actor = normalizeStaffActor(staffName);
  if (next === 'done') {
    db.prepare(
      `
      UPDATE reception_notes
      SET status = 'done', completed_by = ?, completed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `,
    ).run(actor, Number(id));
    if (note.checkinId) {
      logCheckinActivity({
        checkinId: note.checkinId,
        staffName: actor,
        action: 'note_done',
        detail: RECEPTION_NOTE_CATEGORIES[note.category] || 'Nota',
      });
    }
  } else {
    db.prepare(
      `
      UPDATE reception_notes
      SET status = 'open', completed_by = NULL, completed_at = NULL, updated_at = datetime('now')
      WHERE id = ?
    `,
    ).run(Number(id));
  }
  return { ok: true, note: getReceptionNote(id) };
}

export function deleteReceptionNote(id) {
  const note = getReceptionNote(id);
  if (!note) return { ok: false, error: 'not_found' };
  db.prepare(`DELETE FROM reception_notes WHERE id = ?`).run(Number(id));
  return { ok: true, id: Number(id) };
}

export function getStaffPinHash(staffId) {
  const id = String(staffId || '').trim().toLowerCase();
  if (!id) return '';
  const row = db
    .prepare(`SELECT pin_hash FROM staff_credentials WHERE staff_id = ?`)
    .get(id);
  return String(row?.pin_hash || '').trim();
}

export function setStaffPinHash(staffId, pinHash) {
  const id = String(staffId || '').trim().toLowerCase();
  const hash = String(pinHash || '').trim();
  if (!id || !hash) return { ok: false, error: 'invalid' };
  db.prepare(
    `
    INSERT INTO staff_credentials (staff_id, pin_hash, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(staff_id) DO UPDATE SET
      pin_hash = excluded.pin_hash,
      updated_at = datetime('now')
  `,
  ).run(id, hash);
  return { ok: true };
}

export function logStaffAccess({ staffId, ip, success } = {}) {
  db.prepare(
    `
    INSERT INTO staff_access_log (staff_id, ip, success, created_at)
    VALUES (?, ?, ?, datetime('now'))
  `,
  ).run(
    String(staffId || '').trim().toLowerCase() || null,
    String(ip || '').trim().slice(0, 64) || null,
    success ? 1 : 0,
  );
  db.prepare(
    `DELETE FROM staff_access_log WHERE created_at < datetime('now', '-90 days')`,
  ).run();
}

export function getStaffAccountStats(staffName) {
  const name = normalizeReceptionist(staffName);
  const today = romeCalendarDate();
  const yearMonth = romeYearMonthNow();
  const monthly = getMonthlyStaffStats(yearMonth);
  const counts = new Map();
  for (const row of monthly.ranking || []) {
    const receptionist = normalizeReceptionist(row.receptionist);
    counts.set(receptionist, {
      checkins: Number(row.totale_registrati) || Number(row.checkins) || 0,
      coupons: Number(row.coupon_emessi) || Number(row.coupons) || 0,
    });
  }
  const ranking = listStaffRoster({ activeOnly: true })
    .map((member) => {
      const stats = counts.get(member.name) || { checkins: 0, coupons: 0 };
      return {
        id: member.id,
        receptionist: member.name,
        label: member.label,
        checkins: stats.checkins,
        coupons: stats.coupons,
        protected: member.protected,
      };
    })
    .sort((a, b) => b.checkins - a.checkins || a.label.localeCompare(b.label, 'it'))
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      isMe: row.receptionist === name,
      canRemove: !row.protected && row.receptionist !== name,
    }));
  const mine = ranking.find((row) => row.isMe) || {
    receptionist: name,
    checkins: 0,
    coupons: 0,
    rank: ranking.length ? ranking.length : null,
    isMe: true,
  };
  const todayRow = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(
          CASE
            WHEN UPPER(TRIM(COALESCE(receptionist, ''))) = ? THEN 1
            ELSE 0
          END
        ) AS mine,
        SUM(
          CASE
            WHEN coupon_token IS NOT NULL AND TRIM(coupon_token) != '' THEN 1
            ELSE 0
          END
        ) AS coupons
      FROM checkins
      WHERE stay_date = ?
    `,
    )
    .get(name, today);
  const todayTotal = Number(todayRow?.total) || 0;
  const todayMine = Number(todayRow?.mine) || 0;
  const todayCoupons = Number(todayRow?.coupons) || 0;
  return {
    today,
    yearMonth,
    todayTotal,
    todayCoupons,
    me: {
      name,
      todayCheckins: todayMine,
      monthCheckins: mine.checkins,
      monthCoupons: mine.coupons,
      rank: mine.rank,
      teamSize: ranking.length,
    },
    ranking,
    totals: monthly.totals || { totale_mese: 0, totale_coupon: 0 },
  };
}

const DEFAULT_REPORT_TIME = '00:00';

export function normalizeReportTime(raw) {
  const s = String(raw || '').trim();
  const match = s.match(/^(\d{1,2}):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour > 23) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function getHotelSetting(key, fallback = '') {
  const row = db
    .prepare(`SELECT value FROM hotel_settings WHERE key = ?`)
    .get(String(key || '').trim());
  const value = String(row?.value || '').trim();
  return value || fallback;
}

export function setHotelSetting(key, value, updatedBy = '') {
  const k = String(key || '').trim();
  if (!k) throw new Error('Chiave impostazione mancante');
  db.prepare(
    `
    INSERT INTO hotel_settings (key, value, updated_at, updated_by)
    VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
    `,
  ).run(k, String(value ?? ''), String(updatedBy || '').trim() || null);
}

export function getReportSendTime() {
  return normalizeReportTime(getHotelSetting('report_send_time', DEFAULT_REPORT_TIME))
    || DEFAULT_REPORT_TIME;
}

export function setReportSendTime(raw, updatedBy = '') {
  const next = normalizeReportTime(raw);
  if (!next) return { ok: false, error: 'orario_non_valido' };
  setHotelSetting('report_send_time', next, updatedBy);
  return { ok: true, reportTime: next };
}
