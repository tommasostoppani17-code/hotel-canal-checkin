/**
 * Inventario camere fisiche Hotel Canal (HK / rack / colazioni).
 * Override: env HOTEL_ROOMS o hotel_settings.hotel_rooms = "105,114,202,…"
 */

import { getHotelSetting } from './db.js';

/** Inventario tipico Canal (allineato ai report demo / produzione). */
export const DEFAULT_HOTEL_ROOMS = [
  '12',
  '105',
  '108',
  '114',
  '115',
  '202',
  '203',
  '204',
  '206',
  '207',
  '209',
  '210',
  '211',
  '212',
  '301',
  '302',
  '303',
  '304',
  '305',
  '311',
];

export function normalizeRoomNumber(raw) {
  return String(raw || '')
    .trim()
    .replace(/\s+/g, '')
    .slice(0, 12);
}

function parseRoomList(raw) {
  return String(raw || '')
    .split(/[,;\s|]+/)
    .map(normalizeRoomNumber)
    .filter(Boolean);
}

export function listHotelInventoryRooms() {
  const fromEnv = parseRoomList(process.env.HOTEL_ROOMS || '');
  const fromSettings = parseRoomList(getHotelSetting('hotel_rooms', ''));
  const source = fromSettings.length
    ? fromSettings
    : fromEnv.length
      ? fromEnv
      : DEFAULT_HOTEL_ROOMS;
  const seen = new Set();
  const out = [];
  for (const room of source) {
    if (seen.has(room)) continue;
    seen.add(room);
    out.push(room);
  }
  return out.sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return String(a).localeCompare(String(b), 'it');
  });
}
