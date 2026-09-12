#!/usr/bin/env node
/**
 * Inonda Prenotazioni + Clienti (Hotel Canal locale) con pratiche fittizie collegate.
 * Periodo: oggi−21 → oggi+45. Tag [canal-dense].
 *
 * Uso: node scripts/seed-holds-canal-dense.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import {
  initDb,
  getDb,
  insertCheckin,
  romeCalendarDate,
  countCheckins,
} from '../server/db.js';
import { encryptField } from '../server/crypto-fields.js';
import { DEFAULT_HOTEL_ROOMS } from '../server/hotel-rooms.js';
import {
  createRoomHold,
  HOLD_STATUSES,
} from '../server/room-holds.js';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(rootDir, '.env') });

const dbPath =
  process.env.DATABASE_PATH || path.join(rootDir, 'data', 'checkins.db');
initDb(dbPath);

const DEMO_TAG = '[canal-dense]';
const DEMO_PHONE = '+390000000000';
const today = romeCalendarDate();

function ymdToUtc(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function utcToYmd(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}
function addDays(ymd, days) {
  return utcToYmd(ymdToUtc(ymd) + days * 86400000);
}
function daysBetween(a, b) {
  return Math.round((ymdToUtc(b) - ymdToUtc(a)) / 86400000);
}
function pick(arr, i) {
  return arr[i % arr.length];
}

const RANGE_START = addDays(today, -21);
const RANGE_END = addDays(today, 45);

const FIRST_NAMES = [
  'James', 'Emma', 'Sophie', 'Hans', 'Yuki', 'Pierre', 'Clara', 'Noah',
  'Olivia', 'Liam', 'Mia', 'Lucas', 'Chloe', 'Ethan', 'Amelie', 'Jonas',
  'Ava', 'Helena', 'Arthur', 'Ines', 'Leo', 'Freya', 'Max', 'Elena',
  'Sakura', 'Kenji', 'Fatima', 'Omar', 'Priya', 'Arjun', 'Mei', 'Wei',
  'Marco', 'Giulia', 'Luca', 'Chiara', 'Alessandro', 'Sofia',
];
const LAST_NAMES = [
  'Smith', 'Brown', 'Wilson', 'Taylor', 'Martin', 'Dubois', 'Mueller', 'Keller',
  'Andersen', 'Silva', 'Garcia', 'Lopez', 'Schmidt', 'Bernard', 'Novak', 'Kovacs',
  'Tanaka', 'Zhang', 'Hassan', 'Patel', 'Rossi', 'Bianchi', 'Ferrari', 'Conti',
];
const SELLERS = ['TOMMASO', 'PAYEL', 'MIZAN', 'RECEPTION'];
const CHANNELS = [
  'booking_com', 'expedia', 'airbnb', 'agoda', 'hotels_com',
  'tripadvisor', 'direct', 'direct', 'booking_com', 'expedia',
];
const BOARDS = [
  'colazione_inclusa', 'colazione_esclusa', 'solo_pernottamento',
  'mezza_pensione', 'pensione_completa',
];
const TYPES = ['doppia', 'matrimoniale', 'twin', 'tripla', 'singola', 'quadrupla', 'family'];

const db = getDb();
const purgedHolds = db
  .prepare(
    `DELETE FROM room_holds
     WHERE COALESCE(offer_notes, '') LIKE ?
        OR COALESCE(guest_notes, '') LIKE ?`,
  )
  .run(`%${DEMO_TAG}%`, `%${DEMO_TAG}%`).changes;

const encPhone = encryptField(DEMO_PHONE);
const purgedCheckins = db
  .prepare(`DELETE FROM checkins WHERE phone = ?`)
  .run(encPhone).changes;

console.log(
  `[canal-dense] rimossi ${purgedHolds} hold demo · ${purgedCheckins} check-in demo`,
);
console.log(
  `[canal-dense] ${DEFAULT_HOTEL_ROOMS.length} camere · ${RANGE_START} → ${RANGE_END}`,
);

let ok = 0;
let fail = 0;
let nameIdx = 0;
const inHouseToday = [];

for (let ri = 0; ri < DEFAULT_HOTEL_ROOMS.length; ri += 1) {
  const roomNumber = DEFAULT_HOTEL_ROOMS[ri];
  const typeId = pick(TYPES, ri);
  let cursor = RANGE_START;
  let gapBias = ri % 2;

  while (daysBetween(cursor, RANGE_END) >= 2) {
    const gap = (nameIdx + gapBias) % 4 === 0 ? 1 : 0;
    if (gap) cursor = addDays(cursor, gap);
    if (daysBetween(cursor, RANGE_END) < 2) break;

    const maxStay = Math.min(6, daysBetween(cursor, RANGE_END));
    if (maxStay < 1) break;
    const nights = 1 + ((nameIdx * 3 + ri) % Math.min(4, maxStay));
    const checkIn = cursor;
    const checkOut = addDays(checkIn, nights);
    if (checkOut > RANGE_END) break;

    const guestName = `${pick(FIRST_NAMES, nameIdx)} ${pick(LAST_NAMES, nameIdx * 7 + ri)}`;
    const isPastOrCurrent = checkIn <= today && checkOut > today;
    const isPastDone = checkOut <= today;
    const status =
      isPastDone || isPastOrCurrent
        ? HOLD_STATUSES.CONFIRMED
        : pick(
            [
              HOLD_STATUSES.CONFIRMED,
              HOLD_STATUSES.CONFIRMED,
              HOLD_STATUSES.CONFIRMED,
              HOLD_STATUSES.HOLD,
              HOLD_STATUSES.AWAITING,
            ],
            nameIdx + ri,
          );

    const result = createRoomHold({
      roomNumber,
      checkIn,
      checkOut,
      totalEuros: Math.round((95 + (ri % 5) * 25) * nights * (0.95 + (nights % 3) * 0.04)),
      depositPercent: pick([30, 50, 100], nameIdx),
      soldBy: pick(SELLERS, nameIdx),
      channelSource: pick(CHANNELS, nameIdx + ri),
      manual: status === HOLD_STATUSES.CONFIRMED,
      guestName,
      guestPhone: `+39 3${String(300000000 + (nameIdx * 17) % 99999999).padStart(9, '0').slice(0, 9)}`,
      guestEmail: `${guestName.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.canal.hotel`,
      guestsCount: typeId.includes('quadrupla') || typeId === 'family' ? 3 + (nameIdx % 2) : typeId === 'tripla' ? 3 : typeId === 'singola' ? 1 : 2,
      guestNotes: DEMO_TAG,
      roomType: typeId,
      boardPlan: pick(BOARDS, nameIdx),
      extras: nameIdx % 5 === 0 ? ['vista_canale'] : [],
      offerNotes: `${DEMO_TAG} camera ${roomNumber}`,
      status:
        status === HOLD_STATUSES.CONFIRMED
          ? HOLD_STATUSES.CONFIRMED
          : HOLD_STATUSES.HOLD,
    });

    if (result.ok) {
      ok += 1;
      if (isPastOrCurrent && status === HOLD_STATUSES.CONFIRMED) {
        inHouseToday.push({
          guestName,
          roomNumber,
          guestsCount: typeId === 'singola' ? 1 : 2,
          stayDate: checkIn,
          checkoutDate: checkOut,
          email: `${guestName.toLowerCase().replace(/[^a-z]+/g, '.')}@demo.canal.hotel`,
        });
      }
    } else {
      fail += 1;
    }

    nameIdx += 1;
    cursor = checkOut;
  }
}

let checkinsCreated = 0;
for (const row of inHouseToday) {
  try {
    insertCheckin({
      phone: DEMO_PHONE,
      email: row.email,
      guestName: row.guestName,
      roomNumber: row.roomNumber,
      receptionist: pick(SELLERS, checkinsCreated),
      guestsCount: row.guestsCount,
      couponToken: null,
      withCoupon: false,
      skipStaffStats: true,
      stayDate: row.stayDate,
      checkoutDate: row.checkoutDate,
    });
    checkinsCreated += 1;
  } catch (err) {
    console.warn(`[canal-dense] check-in skip ${row.roomNumber}:`, err?.message || err);
  }
}

console.log(`[canal-dense] hold creati: ${ok} · falliti: ${fail}`);
console.log(
  `[canal-dense] check-in in camera oggi: ${checkinsCreated} (totale DB: ${countCheckins()})`,
);
console.log('[canal-dense] ok — apri /staff → Prenotazioni / Clienti / Ops');
