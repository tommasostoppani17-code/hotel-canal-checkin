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

export function createCouponToken() {
  return crypto.randomBytes(16).toString('hex');
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
