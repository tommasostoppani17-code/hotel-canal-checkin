/**
 * Housekeeping — stato pulizia camere (Riva OS /hk).
 * Board = inventario hotel (stesso set reception) + overlay ospiti in house / hold di oggi.
 */

import { getDb, listInHouseStaffCheckins, romeCalendarDate } from './db.js';
import { listHotelInventoryRooms, normalizeRoomNumber } from './hotel-rooms.js';
import { HOLD_STATUSES, listRoomHolds } from './room-holds.js';

export const HK_STATUSES = ['dirty', 'clean', 'inspect'];

function normalizeRoom(raw) {
  return normalizeRoomNumber(raw);
}

function normalizeStatus(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  return HK_STATUSES.includes(s) ? s : '';
}

export function ensureHkTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS room_hk_status (
      room_number TEXT NOT NULL,
      stay_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'dirty',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by TEXT,
      PRIMARY KEY (room_number, stay_date)
    );

    CREATE INDEX IF NOT EXISTS idx_room_hk_status_day
      ON room_hk_status (stay_date, status);
  `);
}

function statusMapForDay(day) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT room_number, status, updated_at, updated_by
      FROM room_hk_status
      WHERE stay_date = ?
    `,
    )
    .all(day);
  const map = new Map();
  for (const row of rows) {
    map.set(normalizeRoom(row.room_number), {
      status: normalizeStatus(row.status) || 'dirty',
      updatedAt: row.updated_at,
      updatedBy: row.updated_by || '',
    });
  }
  return map;
}

function holdOverlapsDay(hold, day) {
  const cin = String(hold.checkIn || '').slice(0, 10);
  const cout = String(hold.checkOut || '').slice(0, 10);
  if (!cin || !cout) return false;
  return cin <= day && cout > day;
}

function activeHoldStatuses() {
  return new Set([
    HOLD_STATUSES.HOLD,
    HOLD_STATUSES.DETAILS,
    HOLD_STATUSES.AWAITING,
    HOLD_STATUSES.CONFIRMED,
  ]);
}

/**
 * Board HK: inventario camere hotel + ospiti in house / checkout due / hold di oggi.
 */
export function getHkBoard({ q = '', now = new Date() } = {}) {
  ensureHkTables();
  const inHouse = listInHouseStaffCheckins({ q: '', now });
  const day = inHouse.today || romeCalendarDate(now);
  const map = statusMapForDay(day);
  const qq = String(q || '')
    .trim()
    .toLowerCase();

  /** @type {Map<string, object>} */
  const byRoom = new Map();

  function ensureCard(room, patch = {}) {
    const key = normalizeRoom(room);
    if (!key) return null;
    const st = map.get(key);
    const prev = byRoom.get(key) || {
      room: key,
      status: st?.status || 'dirty',
      updatedAt: st?.updatedAt || null,
      updatedBy: st?.updatedBy || '',
      kind: 'vacant',
      guestName: '',
      guestsCount: 0,
      checkoutDate: '',
      stayDate: day,
    };
    const next = { ...prev, ...patch, room: key };
    if (!next.status) next.status = st?.status || 'dirty';
    byRoom.set(key, next);
    return next;
  }

  for (const room of listHotelInventoryRooms()) {
    ensureCard(room, { kind: 'vacant' });
  }

  for (const row of inHouse.checkins || []) {
    const room = normalizeRoom(row.roomNumber || row.room_number);
    if (!room) continue;
    ensureCard(room, {
      kind: 'in_house',
      guestName: row.guestName || row.guest_name || '',
      guestsCount: Number(row.guestsCount ?? row.guests_count ?? 2) || 2,
      checkoutDate: row.checkoutDate || row.checkout_date || '',
      stayDate: row.stayDate || row.stay_date || day,
    });
  }

  for (const row of inHouse.checkoutDue || []) {
    const room = normalizeRoom(row.roomNumber || row.room_number);
    if (!room) continue;
    ensureCard(room, {
      kind: 'checkout_due',
      guestName: row.guestName || row.guest_name || '',
      guestsCount: Number(row.guestsCount ?? row.guests_count ?? 2) || 2,
      checkoutDate: row.checkoutDate || row.checkout_date || '',
      stayDate: row.stayDate || row.stay_date || day,
    });
  }

  const active = activeHoldStatuses();
  for (const hold of listRoomHolds({ includeClosed: false })) {
    if (!active.has(hold.status)) continue;
    if (!holdOverlapsDay(hold, day)) continue;
    const room = normalizeRoom(hold.roomNumber);
    if (!room) continue;
    const existing = byRoom.get(room);
    if (existing && (existing.kind === 'in_house' || existing.kind === 'checkout_due')) {
      continue;
    }
    ensureCard(room, {
      kind: 'hold',
      guestName: hold.guestName || hold.paymentRef || '',
      guestsCount: Number(hold.guestsCount || 0) || 0,
      checkoutDate: String(hold.checkOut || '').slice(0, 10),
      stayDate: String(hold.checkIn || '').slice(0, 10) || day,
    });
  }

  // Dirty/inspect residue del giorno fuori inventario (es. stanza storica)
  for (const [room, st] of map) {
    if (byRoom.has(room)) continue;
    if (st.status === 'clean') continue;
    ensureCard(room, {
      kind: 'vacant',
      status: st.status,
      updatedAt: st.updatedAt,
      updatedBy: st.updatedBy,
    });
  }

  let rooms = [...byRoom.values()];
  if (qq) {
    rooms = rooms.filter((r) => {
      const name = String(r.guestName || '').toLowerCase();
      return r.room.toLowerCase().includes(qq) || name.includes(qq);
    });
  }

  rooms.sort((a, b) => {
    const na = Number(a.room);
    const nb = Number(b.room);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a.room).localeCompare(String(b.room), 'it');
  });

  const counts = { dirty: 0, clean: 0, inspect: 0, total: rooms.length };
  for (const r of rooms) {
    if (counts[r.status] != null) counts[r.status] += 1;
  }

  return {
    ok: true,
    today: day,
    checkoutTime: inHouse.checkoutTime,
    counts,
    rooms,
  };
}

export function getHkStatusForRoom(roomNumber, day = romeCalendarDate()) {
  ensureHkTables();
  const room = normalizeRoom(roomNumber);
  if (!room) return null;
  const row = getDb()
    .prepare(
      `
      SELECT room_number, status, updated_at, updated_by
      FROM room_hk_status
      WHERE room_number = ? AND stay_date = ?
    `,
    )
    .get(room, day);
  if (!row) return { room, status: 'dirty', updatedAt: null, updatedBy: '' };
  return {
    room,
    status: normalizeStatus(row.status) || 'dirty',
    updatedAt: row.updated_at,
    updatedBy: row.updated_by || '',
  };
}

export function setHkRoomStatus(roomNumber, status, updatedBy = '') {
  ensureHkTables();
  const room = normalizeRoom(roomNumber);
  const next = normalizeStatus(status);
  if (!room) return { ok: false, error: 'room_required' };
  if (!next) return { ok: false, error: 'status_invalid' };
  const day = romeCalendarDate();
  const by = String(updatedBy || '')
    .trim()
    .slice(0, 60);
  getDb()
    .prepare(
      `
      INSERT INTO room_hk_status (room_number, stay_date, status, updated_at, updated_by)
      VALUES (?, ?, ?, datetime('now'), ?)
      ON CONFLICT(room_number, stay_date) DO UPDATE SET
        status = excluded.status,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
    `,
    )
    .run(room, day, next, by || null);
  return { ok: true, ...getHkStatusForRoom(room, day), stayDate: day };
}

/** Mappa stanza → status per arricchire la lista reception In camera. */
export function hkStatusMapForToday(now = new Date()) {
  ensureHkTables();
  return statusMapForDay(romeCalendarDate(now));
}
