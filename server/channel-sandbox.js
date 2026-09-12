/**
 * Channel Manager Sandbox — prenotazioni fittizie gratis, zero OTA reali.
 * Simula webhook inbound (Booking.com / Airbnb / Expedia / …) verso room_holds.
 * Solo Dev. Nessuna carta, nessun account OTA di produzione.
 */

import crypto from 'node:crypto';
import { listHotelInventoryRooms } from './hotel-rooms.js';
import {
  createManualRoomHold,
  listRoomHolds,
  getRoomHoldById,
} from './room-holds.js';
import { getDb } from './db.js';

export const SANDBOX_CHANNELS = [
  { id: 'booking_com', label: 'Booking.com (simulato)', ota: 'Booking.com' },
  { id: 'airbnb', label: 'Airbnb (simulato)', ota: 'Airbnb' },
  { id: 'expedia', label: 'Expedia (simulato)', ota: 'Expedia' },
  { id: 'agoda', label: 'Agoda (simulato)', ota: 'Agoda' },
  { id: 'hotels_com', label: 'Hotels.com (simulato)', ota: 'Hotels.com' },
  { id: 'direct', label: 'Diretto / Booking engine (simulato)', ota: 'Direct' },
];

const FIRST = ['Marco', 'Giulia', 'Luca', 'Sara', 'James', 'Emma', 'Chen', 'Ana', 'Omar', 'Sofia'];
const LAST = ['Rossi', 'Bianchi', 'Ferrari', 'Conti', 'Smith', 'Müller', 'Dupont', 'Silva', 'Nguyen', 'Kowalski'];

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base, n) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function channelMeta(channelId) {
  return SANDBOX_CHANNELS.find((c) => c.id === channelId) || SANDBOX_CHANNELS[0];
}

export function findHoldByChannelRef(channelSource, channelRef) {
  const src = String(channelSource || '').trim().toLowerCase();
  const ref = String(channelRef || '').trim();
  if (!src || !ref) return null;
  const row = getDb()
    .prepare(
      `
      SELECT id FROM room_holds
      WHERE LOWER(TRIM(COALESCE(channel_source, ''))) = ?
        AND TRIM(COALESCE(channel_ref, '')) = ?
      LIMIT 1
    `,
    )
    .get(src, ref);
  return row ? getRoomHoldById(row.id) : null;
}

/**
 * Genera e inserisce 1..N prenotazioni fittizie come farebbe un CM.
 */
export function injectSandboxBookings({
  count = 1,
  channel = 'booking_com',
  roomNumber = '',
  checkIn = '',
  checkOut = '',
  soldBy = 'channel-sandbox',
} = {}) {
  const ch = channelMeta(String(channel || 'booking_com').trim().toLowerCase());
  const n = Math.min(10, Math.max(1, Number(count) || 1));
  const rooms = listHotelInventoryRooms();
  if (!rooms.length) {
    return { ok: false, error: 'no_rooms', message: 'Nessuna camera in inventario' };
  }

  const created = [];
  const skipped = [];
  const errors = [];
  const today = new Date();

  for (let i = 0; i < n; i += 1) {
    const offsetIn = 1 + Math.floor(Math.random() * 14) + i;
    const nights = 1 + Math.floor(Math.random() * 4);
    const cin = checkIn || ymd(addDays(today, offsetIn));
    const cout = checkOut || ymd(addDays(today, offsetIn + nights));
    const room = String(roomNumber || pick(rooms)).trim();
    const guestFirst = pick(FIRST);
    const guestLast = pick(LAST);
    const guestName = `${guestFirst} ${guestLast}`;
    const channelRef = `SBX-${ch.id.toUpperCase()}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();

    const existing = findHoldByChannelRef(ch.id, channelRef);
    if (existing) {
      skipped.push({ channelRef, reason: 'duplicate', holdId: existing.id });
      continue;
    }

    const totalEuros = 80 + Math.floor(Math.random() * 220) + nights * 40;
    const result = createManualRoomHold({
      roomNumber: room,
      checkIn: cin,
      checkOut: cout,
      totalEuros,
      depositPercent: 100,
      soldBy: soldBy || `sandbox:${ch.id}`,
      guestName,
      guestPhone: `+39 3${String(100000000 + Math.floor(Math.random() * 899999999)).slice(0, 9)}`,
      guestEmail: `${guestFirst.toLowerCase()}.${guestLast.toLowerCase()}@example.test`,
      guestsCount: 1 + Math.floor(Math.random() * 3),
      guestNotes: `[SANDBOX] Prenotazione fittizia da ${ch.ota}. Non è un OTA reale.`,
      roomType: 'doppia',
      boardPlan: 'colazione_inclusa',
      extras: Math.random() > 0.6 ? ['garage'] : [],
      offerNotes: `Canale simulato: ${ch.ota}`,
      channelSource: ch.id,
      channelRef,
    });

    if (!result.ok) {
      // Camera occupata → riprova con altra camera
      if (result.error === 'camera_occupata') {
        const alt = rooms.find((r) => r !== room) || room;
        const retry = createManualRoomHold({
          roomNumber: alt,
          checkIn: cin,
          checkOut: cout,
          totalEuros,
          depositPercent: 100,
          soldBy: soldBy || `sandbox:${ch.id}`,
          guestName,
          guestPhone: `+39 3${String(100000000 + Math.floor(Math.random() * 899999999)).slice(0, 9)}`,
          guestEmail: `${guestFirst.toLowerCase()}.${guestLast.toLowerCase()}@example.test`,
          guestsCount: 2,
          guestNotes: `[SANDBOX] Prenotazione fittizia da ${ch.ota}. Non è un OTA reale.`,
          roomType: 'doppia',
          boardPlan: 'colazione_inclusa',
          extras: [],
          offerNotes: `Canale simulato: ${ch.ota}`,
          channelSource: ch.id,
          channelRef,
        });
        if (retry.ok) created.push(retry.hold);
        else errors.push({ channelRef, error: retry.error, conflict: retry.conflict });
      } else {
        errors.push({ channelRef, error: result.error, conflict: result.conflict });
      }
      continue;
    }
    created.push(result.hold);
  }

  return {
    ok: true,
    channel: ch,
    created: created.map((h) => ({
      id: h.id,
      roomNumber: h.roomNumber,
      checkIn: h.checkIn,
      checkOut: h.checkOut,
      guestName: h.guestName,
      channelSource: h.channelSource,
      channelRef: h.channelRef,
      status: h.status,
      totalEuros: h.totalEuros,
    })),
    skipped,
    errors,
    hint: 'Apri Prenotazioni / rack: le barre devono comparire con logo canale. Nessun soldi reali, nessun OTA reale.',
  };
}

export function listRecentSandboxHolds(limit = 20) {
  const rows = listRoomHolds({ includeClosed: true })
    .filter((h) => String(h.channelRef || '').startsWith('SBX-') || String(h.guestNotes || '').includes('[SANDBOX]'))
    .slice(0, Math.min(50, Math.max(1, limit)));
  return rows.map((h) => ({
    id: h.id,
    roomNumber: h.roomNumber,
    checkIn: h.checkIn,
    checkOut: h.checkOut,
    guestName: h.guestName,
    channelSource: h.channelSource,
    channelRef: h.channelRef,
    status: h.status,
    totalEuros: h.totalEuros,
  }));
}

export function sandboxCatalogPayload() {
  return {
    ok: true,
    channels: SANDBOX_CHANNELS,
    rooms: listHotelInventoryRooms(),
    note:
      'Sandbox gratis: simula inbound channel manager senza WuBook/Channex/Booking reali. Per test OTA staging dopo: Channex test property o WuBook Wired sandbox.',
  };
}
