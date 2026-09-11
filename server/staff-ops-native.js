/**
 * Staff Ops nativo — snapshot rooms/colazioni con sezioni intelligenti
 * (Canal / Walter / Extra Vaca / Ca' dei Polo / Appartamenti / Airone).
 * Lista unica solo se Manager/Dev attiva il modulo ops_unified_rooms.
 */

import { getHkBoard, setHkRoomStatus } from './hk-status.js';
import { getBreakfastBoard, setBreakfastEaten } from './breakfast.js';
import { normalizeRoomNumber } from './hotel-rooms.js';
import {
  listOpsSectionDefs,
  flattenOpsRooms,
  resolveOpsRoom,
  normalizeOpsRoomId,
  OPS_SECTION_LABELS,
} from './config/ops-sections.js';
import { getOrgHotel } from './hotel-org.js';

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
      sectionsMode: isOpsUnifiedRooms() ? 'flat' : 'smart',
    },
    housekeeping: {
      url: '/hk',
      native: true,
    },
  };
}

function isOpsUnifiedRooms() {
  try {
    const hotel = getOrgHotel('hotel-canal');
    return Boolean(hotel?.modules?.ops_unified_rooms);
  } catch {
    return false;
  }
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

function buildRoomState(card, bfRow, hkToday) {
  const tone = mapHkStatusToOps(card.status);
  const guests = Number(card.guestsCount || bfRow?.pax || 0) || null;
  return {
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
    stayDate: card.stayDate || hkToday || '',
    updatedAt: card.updatedAt || bfRow?.updatedAt || null,
    updatedBy: card.updatedBy || bfRow?.updatedBy || '',
  };
}

export function getNativeOpsSnapshot() {
  const hk = getHkBoard({});
  const bf = getBreakfastBoard({});
  const eatenByRoom = new Map(
    (bf.rooms || []).map((r) => [normalizeOpsRoomId(r.room) || normalizeRoomNumber(r.room), r]),
  );

  const fromHk = Array.isArray(hk.rooms) ? hk.rooms : [];
  const hkByRoom = new Map();
  for (const card of fromHk) {
    const id = normalizeOpsRoomId(card.room || card.roomNumber) || normalizeRoomNumber(card.room);
    if (id) hkByRoom.set(id, card);
  }

  const unified = isOpsUnifiedRooms();
  const rooms = {};
  const sectionBuckets = new Map();

  function ensureBucket(sectionId) {
    if (!sectionBuckets.has(sectionId)) {
      sectionBuckets.set(sectionId, {
        id: sectionId,
        label: OPS_SECTION_LABELS[sectionId] || sectionId,
        rooms: [],
      });
    }
    return sectionBuckets.get(sectionId);
  }

  function placeRoom(sectionId, roomId, card) {
    const rid = normalizeOpsRoomId(roomId) || roomId;
    if (!rid) return;
    const key = roomStateKey(sectionId, rid);
    if (rooms[key]) return;
    const bfRow = eatenByRoom.get(rid);
    rooms[key] = buildRoomState(card || { room: rid, status: 'dirty', kind: 'vacant' }, bfRow, hk.today);
    ensureBucket(sectionId).rooms.push(rid);
  }

  if (unified) {
    const all = new Set(flattenOpsRooms().map(normalizeOpsRoomId));
    for (const id of hkByRoom.keys()) all.add(id);
    const sorted = [...all].sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a).localeCompare(String(b), 'it');
    });
    for (const rid of sorted) {
      placeRoom('all', rid, hkByRoom.get(rid));
    }
    return {
      sections: [
        {
          id: 'all',
          label: 'Tutte le camere',
          rooms: sorted,
        },
      ],
      rooms,
      generalNotes: [],
      version: Date.now(),
      today: hk.today || bf.today || null,
      sectionsMode: 'flat',
    };
  }

  /* Smart: sezioni storiche Canal / Walter / Airone / … */
  for (const def of listOpsSectionDefs()) {
    ensureBucket(def.id);
    for (const room of def.rooms) {
      const rid = normalizeOpsRoomId(room) || room;
      placeRoom(def.id, rid, hkByRoom.get(rid));
    }
  }

  /* Camere presenti in HK/check-in ma fuori pianta → sezione corretta o canal */
  for (const [rid, card] of hkByRoom) {
    const resolved = resolveOpsRoom(rid, 'canal');
    const key = roomStateKey(resolved.section, resolved.room || rid);
    if (!rooms[key]) {
      placeRoom(resolved.section, resolved.room || rid, card);
    }
  }

  const sections = listOpsSectionDefs()
    .map((def) => {
      const bucket = sectionBuckets.get(def.id);
      const roomIds = (bucket?.rooms || []).slice().sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
        return String(a).localeCompare(String(b), 'it');
      });
      return { id: def.id, label: def.label, rooms: roomIds };
    })
    .filter((s) => s.rooms.length > 0);

  return {
    sections,
    rooms,
    generalNotes: [],
    version: Date.now(),
    today: hk.today || bf.today || null,
    sectionsMode: 'smart',
  };
}

export function patchNativeOpsRoom(sectionId, roomId, body = {}, staffName = '') {
  const resolved = resolveOpsRoom(
    roomId,
    String(sectionId || '').trim() || CANAL_OPS_SECTION_ID,
  );
  const section = String(sectionId || '').trim() || resolved.section || CANAL_OPS_SECTION_ID;
  const room = normalizeOpsRoomId(roomId) || normalizeRoomNumber(roomId) || resolved.room;
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
    const result = setHkRoomStatus(room, 'dirty', staffName);
    if (!result.ok) return result;
  }

  const snap = getNativeOpsSnapshot();
  const key = roomStateKey(section === 'all' ? resolved.section : section, room);
  const altKey = roomStateKey(section, room);
  return {
    ok: true,
    room: snap.rooms[altKey] || snap.rooms[key] || {
      status: 'dirty',
      blocked: false,
    },
    version: snap.version,
  };
}
