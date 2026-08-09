import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';

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

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checkins_coupon_token
      ON checkins (coupon_token)
      WHERE coupon_token IS NOT NULL;
  `);

  return db;
}

function couponSecret() {
  return (
    process.env.COUPON_SECRET ||
    process.env.CRON_SECRET ||
    process.env.RESEND_API_KEY ||
    'hotel-canal-dev-coupon'
  );
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Token firmato (sopravvive al wipe del SQLite su Render free).
 * Payload: guest + optional room/staff per redeem diretto.
 */
export function createCouponToken({
  id = '',
  email = '',
  guestName = '',
  phone = '',
  guestsCount = 2,
  roomNumber = null,
  receptionist = null,
} = {}) {
  const body = {
    v: 1,
    id: id || crypto.randomBytes(8).toString('hex'),
    e: String(email || '').trim().slice(0, 120),
    g: String(guestName || '').trim().slice(0, 80),
    p: String(phone || '').trim().slice(0, 32),
    n: Number(guestsCount) > 0 ? Number(guestsCount) : 2,
  };
  const room = String(roomNumber || '').trim().slice(0, 20);
  const staff = String(receptionist || '').trim().slice(0, 40);
  if (room) body.r = room;
  if (staff) body.s = staff;

  const json = Buffer.from(JSON.stringify(body), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', couponSecret())
    .update(json)
    .digest('base64url');
  return `${json}.${sig}`;
}

export function parseCouponToken(token) {
  const raw = String(token || '').trim();
  const i = raw.lastIndexOf('.');
  if (i <= 0) return null;
  const json = raw.slice(0, i);
  const sig = raw.slice(i + 1);
  if (!json || !sig) return null;
  const expect = crypto
    .createHmac('sha256', couponSecret())
    .update(json)
    .digest('base64url');
  if (!timingSafeEqualStr(sig, expect)) return null;
  try {
    const body = JSON.parse(Buffer.from(json, 'base64url').toString('utf8'));
    if (!body || body.v !== 1 || !body.id) return null;
    return body;
  } catch {
    return null;
  }
}

/** Riga DB se c'è, altrimenti riga sintetica dal token firmato. */
export function resolveCouponFromToken(token) {
  const raw = String(token || '').trim();
  if (!raw) return null;

  const row = getCheckinByCouponToken(raw);
  const payload = parseCouponToken(raw);

  if (row) {
    return {
      row,
      payload,
      token: raw,
    };
  }

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
    phone,
    email: email || null,
    guestName: guestName || null,
    roomNumber: roomNumber || null,
    receptionist: receptionist || null,
    guestsCount: guestsCount ?? null,
    couponToken: couponToken || null,
  });

  return info.lastInsertRowid;
}

export function markCouponSent(id) {
  return db
    .prepare(
      `UPDATE checkins SET coupon_sent_at = datetime('now') WHERE id = ?`,
    )
    .run(id).changes;
}

export function getCheckinByCouponToken(token) {
  return db
    .prepare(
      `
      SELECT id, phone, email, guest_name, room_number, receptionist, guests_count, coupon_token, coupon_sent_at, created_at
      FROM checkins
      WHERE coupon_token = ?
      LIMIT 1
    `,
    )
    .get(token);
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
        created_at
      FROM checkins
      WHERE reported_at IS NULL
      ORDER BY
        CASE WHEN room_number IS NULL OR TRIM(room_number) = '' THEN 1 ELSE 0 END,
        room_number ASC,
        created_at ASC
    `,
    )
    .all();
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

/** Stats for current calendar month in Europe/Rome via SQLite localtime */
export function getMonthlyStaffStats() {
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
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `,
    )
    .get();

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
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
      GROUP BY COALESCE(NULLIF(TRIM(receptionist), ''), 'RECEPTION')
      ORDER BY totale_registrati DESC, coupon_emessi DESC
    `,
    )
    .all();

  return { totals, ranking };
}
