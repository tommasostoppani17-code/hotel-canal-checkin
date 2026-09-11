/**
 * Staff Ops nativo Canal — snapshot rooms/colazioni da HK + breakfast locali.
 * Stesso shape di /api/staff/ops/snapshot usato da public/js/staff-ops.js
 */

import { getHkBoard, setHkRoomStatus } from './hk-status.js';
import { getBreakfastBoard, setBreakfastEaten } from './breakfast.js';
import { listHotelInventoryRooms, normalizeRoomNumber } from './hotel-rooms.js';

export const CANAL_OPS_SECTION_ID = 'canal';
export const CANAL_OPS_SECTION_LABEL = 'Hotel Canal';

export function canalOpsIntegrationPayload() {
  return {
    ops: {
      enabled: true,
      native: true,
      basePath: '',
      views: ['rooms', 'colazioni', 'problems'],
      syncEnabled: false,
    },
    housekeeping: {
      url: '/hk',
      native: true,
    },
  };
}

function mapHkStatusToOps(status) {
  const s = String(status || '').trim().toLowerCase();
  if (s === 'clean') return { status: 'clean', blocked: false };
  if (s === 'inspect') return { status: 'dirty', blocked: true };
  return { status: 'dirty', blocked: false };
}

function roomStateKey(sectionId, roomId) {
  return `${sectionId}:${roomId}`;
}

export function getNativeOpsSnapshot() {
  const hk = getHkBoard({});
  const bf = getBreakfastBoard({});
  const eatenByRoom = new Map(
    (bf.rooms || []).map((r) => [normalizeRoomNumber(r.room), r]),
  );

  const inventory = listHotelInventoryRooms();
  const fromHk = Array.isArray(hk.rooms) ? hk.rooms : [];
  const seen = new Set();
  const roomIds = [];
  const rooms = {};

  function pushRoom(card) {
    const roomId = normalizeRoomNumber(card.room || card.roomNumber);
    if (!roomId || seen.has(roomId)) return;
    seen.add(roomId);
    roomIds.push(roomId);
    const tone = mapHkStatusToOps(card.status);
    const bfRow = eatenByRoom.get(roomId);
    const guests = Number(card.guestsCount || bfRow?.pax || 0) || null;
    rooms[roomStateKey(CANAL_OPS_SECTION_ID, roomId)] = {
      status: tone.status,
      blocked: tone.blocked,
      guestName: card.guestName || bfRow?.guestName || '',
      breakfast: bfRow ? (bfRow.eaten ? 'yes' : 'no') : guests ? 'yes' : 'unknown',
      breakfastGuests: guests,
      breakfastFirstDayOnly: false,
      bookingGuests: guests,
      boardPlan: '',
      boardHint: Boolean(guests),
      kind: card.kind || 'vacant',
      checkoutDate: card.checkoutDate || bfRow?.checkoutDate || '',
      stayDate: card.stayDate || hk.today || '',
      updatedAt: card.updatedAt || bfRow?.updatedAt || null,
      updatedBy: card.updatedBy || bfRow?.updatedBy || '',
    };
  }

  for (const card of fromHk) pushRoom(card);
  for (const room of inventory) {
    if (seen.has(room)) continue;
    pushRoom({ room, status: 'dirty', kind: 'vacant', guestName: '', guestsCount: 0 });
  }

  roomIds.sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), 'it');
  });

  return {
    sections: [
      {
        id: CANAL_OPS_SECTION_ID,
        label: CANAL_OPS_SECTION_LABEL,
        rooms: roomIds,
      },
    ],
    rooms,
    generalNotes: [],
    version: Date.now(),
    today: hk.today || bf.today || null,
  };
}

export function patchNativeOpsRoom(sectionId, roomId, body = {}, staffName = '') {
  const section = String(sectionId || '').trim() || CANAL_OPS_SECTION_ID;
  const room = normalizeRoomNumber(roomId);
  if (!room) return { ok: false, error: 'room_required' };

  if (body.status != null) {
    const raw = String(body.status || '').trim().toLowerCase();
    const next = raw === 'clean' ? 'clean' : 'dirty';
    const result = setHkRoomStatus(room, next, staffName);
    if (!result.ok) return result;
  }

  if (body.breakfast != null || body.breakfastGuests != null) {
    const flag =
      body.breakfast === 'yes' ||
      body.breakfast === true ||
      body.breakfast === 1 ||
      body.breakfast === '1';
    const result = setBreakfastEaten(room, flag, staffName);
    if (!result.ok) return result;
  }

  if (body.blocked === true) {
    const result = setHkRoomStatus(room, 'inspect', staffName);
    if (!result.ok) return result;
  } else if (body.blocked === false && body.status == null) {
    /* sblocca → dirty di default se non arriva status */
    const result = setHkRoomStatus(room, 'dirty', staffName);
    if (!result.ok) return result;
  }

  const snap = getNativeOpsSnapshot();
  const key = roomStateKey(section, room);
  return {
    ok: true,
    room: snap.rooms[key] || {
      status: 'dirty',
      blocked: false,
    },
    version: snap.version,
  };
}
