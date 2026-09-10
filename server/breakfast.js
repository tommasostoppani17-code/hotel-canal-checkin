/**
 * Colazioni sala — toggle ingresso per camera (giorno operativo Europe/Rome).
 * Fonte camere: check-in in house (+ checkout due), come HK.
 */

import { getDb, listInHouseStaffCheckins, romeCalendarDate } from './db.js';

function normalizeRoom(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .slice(0, 12);
}

export function ensureBreakfastTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_breakfast_status (
      room_number TEXT NOT NULL,
      stay_date TEXT NOT NULL,
      eaten INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT,
      PRIMARY KEY (room_number, stay_date)
    );

    CREATE INDEX IF NOT EXISTS idx_room_breakfast_day
      ON room_breakfast_status (stay_date, eaten);
  `);
}

function eatenMapForDay(day) {
  const rows = getDb()
    .prepare(
      `
      SELECT room_number, eaten, updated_at, updated_by
      FROM room_breakfast_status
      WHERE stay_date = ?
    `,
    )
    .all(day);
  const map = new Map();
  for (const row of rows) {
    map.set(normalizeRoom(row.room_number), {
      eaten: Number(row.eaten) === 1,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by || '',
    });
  }
  return map;
}

export function getBreakfastBoard({ q = '', now = new Date() } = {}) {
  ensureBreakfastTables();
  const inHouse = listInHouseStaffCheckins({ q, now });
  const day = inHouse.today || romeCalendarDate(now);
  const map = eatenMapForDay(day);
  const seen = new Set();
  const rooms = [];

  function pushRow(row, kind) {
    const room = normalizeRoom(row.roomNumber || row.room_number);
    if (!room || seen.has(room)) return;
    seen.add(room);
    const st = map.get(room);
    rooms.push({
      room,
      guestName: row.guestName || row.guest_name || '',
      pax: Number(row.guestsCount ?? row.guests_count ?? 0) || 0,
      eaten: Boolean(st?.eaten),
      updatedAt: st?.updatedAt || null,
      updatedBy: st?.updatedBy || '',
      kind,
      checkoutDate: row.checkoutDate || row.checkout_date || '',
    });
  }

  for (const row of inHouse.checkins || []) pushRow(row, 'in_house');
  for (const row of inHouse.checkoutDue || []) pushRow(row, 'checkout_due');

  rooms.sort((a, b) => {
    if (a.eaten !== b.eaten) return a.eaten ? 1 : -1;
    const na = Number(a.room);
    const nb = Number(b.room);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a.room).localeCompare(String(b.room), 'it');
  });

  const eatenCount = rooms.filter((r) => r.eaten).length;
  return {
    ok: true,
    today: day,
    counts: {
      total: rooms.length,
      eaten: eatenCount,
      remaining: rooms.length - eatenCount,
    },
    rooms,
  };
}

export function setBreakfastEaten(roomNumber, eaten, updatedBy = '') {
  ensureBreakfastTables();
  const room = normalizeRoom(roomNumber);
  if (!room) return { ok: false, error: 'room_required' };
  const day = romeCalendarDate();
  const flag = eaten === true || eaten === 1 || eaten === '1' || eaten === 'yes' ? 1 : 0;
  const by = String(updatedBy || '')
    .trim()
    .slice(0, 60);
  getDb()
    .prepare(
      `
      INSERT INTO room_breakfast_status (room_number, stay_date, eaten, updated_at, updated_by)
      VALUES (?, ?, ?, datetime('now'), ?)
      ON CONFLICT(room_number, stay_date) DO UPDATE SET
        eaten = excluded.eaten,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `,
    )
    .run(room, day, flag, by || null);
  return {
    ok: true,
    room,
    stayDate: day,
    eaten: flag === 1,
    updatedBy: by,
  };
}

export function toggleBreakfastEaten(roomNumber, updatedBy = '') {
  ensureBreakfastTables();
  const room = normalizeRoom(roomNumber);
  if (!room) return { ok: false, error: 'room_required' };
  const day = romeCalendarDate();
  const cur = getDb()
    .prepare(
      `
      SELECT eaten FROM room_breakfast_status
      WHERE room_number = ? AND stay_date = ?
    `,
    )
    .get(room, day);
  const next = Number(cur?.eaten) === 1 ? 0 : 1;
  return setBreakfastEaten(room, next, updatedBy);
}
