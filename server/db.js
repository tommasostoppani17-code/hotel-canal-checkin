import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import {
  encryptField,
  decryptCheckinRow,
} from './crypto-fields.js';

let db;

export function getDb() {
  if (!db) throw new Error('Database non inizializzato');
  return db;
}

function ensureColumn(name, ddl) {
  const cols = db.prepare(`PRAGMA table_info(checkins)`).all();
  if (!cols.some((c) => c.name === name)) {
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

  ensureColumn('email', 'email TEXT');
  ensureColumn('receptionist', 'receptionist TEXT');
  ensureColumn('guests_count', 'guests_count INTEGER');
  ensureColumn('coupon_token', 'coupon_token TEXT');
  ensureColumn('coupon_sent_at', 'coupon_sent_at TEXT');
  ensureColumn('table_booking', 'table_booking TEXT');

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_coupon_token
      ON checkins (coupon_token)
      WHERE coupon_token IS NOT NULL;
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_checkins_created_at
      ON checkins (created_at);
  `);

  // Contatori mensili senza PII (sopravvivono al purge GDPR 24h)
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_month_stats (
      year_month TEXT NOT NULL,
      receptionist TEXT NOT NULL,
      checkins INTEGER NOT NULL DEFAULT 0,
      coupons INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (year_month, receptionist)
    );
  `);

  return db;
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

function normalizeReceptionist(value) {
  const name = String(value || '').trim();
  return name || 'RECEPTION';
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

export function insertCheckin({
  phone,
  email,
  guestName,
  roomNumber,
  receptionist,
  guestsCount,
  couponToken,
}) {
  const stmt = db.prepare(`
    INSERT INTO checkins (
      phone, email, guest_name, room_number, receptionist, guests_count, coupon_token, privacy_accepted_at
    )
    VALUES (
      @phone, @email, @guestName, @roomNumber, @receptionist, @guestsCount, @couponToken, datetime('now')
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
  });

  try {
    bumpStaffMonthStats({
      receptionist,
      withCoupon: Boolean(couponToken),
    });
  } catch (err) {
    console.error('[stats] bumpStaffMonthStats failed:', err.message || err);
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
        coupon_token, coupon_sent_at, table_booking, created_at, reported_at
      FROM checkins
      WHERE id = ?
    `,
    )
    .get(Number(id));
  return row ? decryptCheckinRow(row) : null;
}

/** Save dinner table preference (e.g. 20:15) and optional party size. */
export function setTableBooking(id, tableBooking, guestsCount = null) {
  const time = String(tableBooking || '').trim().slice(0, 32).toUpperCase();
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
      SELECT id, phone, email, guest_name, room_number, receptionist, guests_count, coupon_token, coupon_sent_at, created_at
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
        created_at
      FROM checkins
      WHERE reported_at IS NULL
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

export function markReported(ids) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = db
    .prepare(
      `UPDATE checkins SET reported_at = datetime('now') WHERE id IN (${placeholders})`,
    )
    .run(...ids);
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
    return { totals, ranking: rollupRanking, yearMonth: ym, source: 'rollup' };
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

  return { totals, ranking, yearMonth: ym, source: 'checkins' };
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
        reported_at
      FROM checkins
      ORDER BY id ASC
    `,
    )
    .all();
}

/**
 * GDPR retention: elimina check-in più vecchi di `hours` ore.
 * Default 24h — dopo report notturno il caveau si svuota.
 */
export function purgeCheckinsOlderThanHours(hours = 24) {
  const h = Math.max(1, Number(hours) || 24);
  const result = db
    .prepare(
      `DELETE FROM checkins WHERE created_at < datetime('now', ?)`,
    )
    .run(`-${h} hours`);
  return result.changes || 0;
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
      coupon_token, coupon_sent_at, table_booking, privacy_accepted_at, created_at, reported_at
    ) VALUES (
      @id, @phone, @email, @guest_name, @room_number, @receptionist, @guests_count,
      @coupon_token, @coupon_sent_at, @table_booking, @privacy_accepted_at, @created_at, @reported_at
    )
  `);

  const tx = db.transaction((list) => {
    let n = 0;
    for (const row of list) {
      if (!row?.phone) continue;
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
      });
      n += 1;
    }
    return n;
  });

  return tx(rows);
}
