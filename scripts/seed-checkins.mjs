#!/usr/bin/env node
/**
 * Inserisce 50 check-in demo per testare la dashboard reception.
 * Uso: node scripts/seed-checkins.mjs [--clean]
 */
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initDb,
  getDb,
  romeCalendarDate,
  logCheckinActivity,
  addToBlacklist,
  listStaffRoster,
  setStaffPinHash,
} from '../server/db.js';
import { encryptField } from '../server/crypto-fields.js';
import { hashStaffPin } from '../server/staff-auth.js';

if (process.env.RENDER === 'true') {
  console.error('[seed] bloccato su Render — solo database locale');
  process.exit(1);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dbPath = process.env.DATABASE_PATH || path.join(rootDir, 'data', 'checkins.db');

const SEED_PREFIX = 'seed-demo-50';
const TARGET = 50;

const RECEPTIONISTS = ['TOMMASO', 'JOHN', 'ALEJANDRO', 'MARIA', 'MIZAN', 'PAYEL', 'SAYEED'];

const GUESTS = [
  ['Marco', 'Rossi'], ['Elena', 'Bianchi'], ['Luca', 'Ferrari'], ['Giulia', 'Romano'],
  ['Alessandro', 'Colombo'], ['Francesca', 'Ricci'], ['Matteo', 'Marino'], ['Chiara', 'Greco'],
  ['Davide', 'Bruno'], ['Valentina', 'Gallo'], ['Simone', 'Conti'], ['Sara', 'De Luca'],
  ['Andrea', 'Mancini'], ['Martina', 'Costa'], ['Federico', 'Giordano'], ['Elisa', 'Rizzo'],
  ['John', 'Smith'], ['Emily', 'Brown'], ['James', 'Wilson'], ['Sarah', 'Taylor'],
  ['Marie', 'Dupont'], ['Pierre', 'Martin'], ['Hans', 'Mueller'], ['Anna', 'Schmidt'],
  ['Carlos', 'Garcia'], ['Maria', 'Lopez'], ['Yuki', 'Tanaka'], ['Wei', 'Zhang'],
  ['Olga', 'Ivanova'], ['Ahmed', 'Hassan'], ['Sophie', 'Bernard'], ['Thomas', 'Anderson'],
  ['Laura', 'Moretti'], ['Paolo', 'Fontana'], ['Silvia', 'Caruso'], ['Roberto', 'Serra'],
  ['Camilla', 'Vitale'], ['Nicola', 'Barbieri'], ['Arianna', 'Monti'], ['Gabriele', 'Palmieri'],
  ['Beatrice', 'Ferri'], ['Riccardo', 'Martini'], ['Noemi', 'Santoro'], ['Stefano', 'Leone'],
  ['Claudia', 'Longo'], ['Daniele', 'Basile'], ['Ilaria', 'Marchetti'], ['Antonio', 'Parisi'],
  ['Veronica', 'Sanna'], ['Filippo', 'Cattaneo'], ['Giorgia', 'Negri'], ['Michele', 'Bellini'],
];

function shiftRomeDate(isoDay, deltaDays) {
  const [y, m, d] = isoDay.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

function createdAtForDay(stayDate, hour, minute) {
  const [y, m, d] = stayDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, hour, minute, 0));
  return dt.toISOString().slice(0, 19).replace('T', ' ');
}

function cleanSeed(db) {
  const ids = db
    .prepare(`SELECT id FROM checkins WHERE coupon_token LIKE ?`)
    .all(`${SEED_PREFIX}-%`)
    .map((row) => row.id);
  if (!ids.length) return 0;
  const tx = db.transaction((list) => {
    const delActivity = db.prepare(`DELETE FROM checkin_activity WHERE checkin_id = ?`);
    const delAlerts = db.prepare(`DELETE FROM staff_alerts WHERE checkin_id = ?`);
    const delCheckin = db.prepare(`DELETE FROM checkins WHERE id = ?`);
    for (const id of list) {
      delActivity.run(id);
      delAlerts.run(id);
      delCheckin.run(id);
    }
  });
  tx(ids);
  return ids.length;
}

function buildPlan(today) {
  const plan = [];
  const dayOffsets = [
    ...Array(35).fill(0),
    ...Array(5).fill(-1),
    ...Array(5).fill(-2),
    ...Array(5).fill(-3),
  ];
  for (let i = 0; i < TARGET; i += 1) {
    const offset = dayOffsets[i];
    const stayDate = shiftRomeDate(today, offset);
    const [first, last] = GUESTS[i];
    plan.push({
      index: i + 1,
      guestName: `${first} ${last}`,
      stayDate,
      roomNumber: String(801 + i),
      receptionist: RECEPTIONISTS[i % RECEPTIONISTS.length],
      phone: `+393${String(100000000 + i).slice(-9)}`,
      email: `ospite${String(i + 1).padStart(2, '0')}@canal-demo.test`,
      guestsCount: (i % 4) + 1,
      hour: 8 + (i % 12),
      minute: (i * 7) % 60,
      starred: i % 9 === 0,
      blacklisted: i === 4 || i === 22,
      roomHistory: i === 2 || i === 8 || i === 19 || i === 33,
    });
  }
  return plan;
}

function insertSeedRows(db, plan) {
  const insert = db.prepare(`
    INSERT INTO checkins (
      phone, email, guest_name, room_number, receptionist, guests_count,
      coupon_token, coupon_sent_at, table_booking, privacy_accepted_at,
      stay_date, checkout_date, created_at, starred_at
    ) VALUES (
      @phone, @email, @guestName, @roomNumber, @receptionist, @guestsCount,
      @couponToken, @couponSentAt, @tableBooking, datetime('now'),
      @stayDate, @checkoutDate, @createdAt, @starredAt
    )
  `);

  const inserted = [];
  const tx = db.transaction((rows) => {
    for (const row of rows) {
      const info = insert.run({
        phone: encryptField(row.phone),
        email: encryptField(row.email),
        guestName: encryptField(row.guestName),
        roomNumber: row.roomNumber,
        receptionist: row.receptionist,
        guestsCount: row.guestsCount,
        couponToken: `${SEED_PREFIX}-${String(row.index).padStart(3, '0')}`,
        couponSentAt: row.index % 3 !== 0 ? createdAtForDay(row.stayDate, row.hour, row.minute) : null,
        tableBooking: row.index % 8 === 0 ? '20:15' : null,
        stayDate: row.stayDate,
        checkoutDate: shiftRomeDate(row.stayDate, 2 + (row.index % 3)),
        createdAt: createdAtForDay(row.stayDate, row.hour, row.minute),
        starredAt: row.starred ? createdAtForDay(row.stayDate, row.hour, row.minute) : null,
      });
      inserted.push({ id: info.lastInsertRowid, ...row });
    }
  });
  tx(plan);
  return inserted;
}

function seedBlacklist(inserted) {
  for (const row of inserted.filter((item) => item.blacklisted)) {
    addToBlacklist({
      guestName: row.guestName,
      notes: 'Demo seed · verifica UI segnalazioni',
      checkinId: row.id,
      staffName: row.receptionist,
    });
  }
}

function seedRoomHistory(inserted) {
  for (const row of inserted.filter((item) => item.roomHistory)) {
    const prev = String(Number(row.roomNumber) - 1);
    logCheckinActivity({
      checkinId: row.id,
      staffName: row.receptionist,
      action: 'room_change',
      detail: `${prev} → ${row.roomNumber}`,
    });
  }
}

const clean = process.argv.includes('--clean');

initDb(dbPath);
const db = getDb();
const today = romeCalendarDate();

if (clean) {
  const removed = cleanSeed(db);
  console.log(`[seed] rimossi ${removed} check-in demo precedenti`);
}

const existing = db
  .prepare(`SELECT COUNT(*) AS n FROM checkins WHERE coupon_token LIKE ?`)
  .get(`${SEED_PREFIX}-%`).n;

const DEMO_PIN = '1234';
function seedStaffPins() {
  const roster = listStaffRoster({ activeOnly: false });
  for (const member of roster) {
    setStaffPinHash(member.id, hashStaffPin(DEMO_PIN));
  }
  console.log(`[seed] password staff locale: ${DEMO_PIN} (tutti i receptionist)`);
}

seedStaffPins();

if (existing >= TARGET) {
  console.log(`[seed] già presenti ${existing} check-in demo (prefisso ${SEED_PREFIX})`);
  console.log('[seed] usa --clean per rigenerare gli ospiti');
  process.exit(0);
}

if (existing > 0) {
  cleanSeed(db);
}

const plan = buildPlan(today);
const inserted = insertSeedRows(db, plan);
seedBlacklist(inserted);
seedRoomHistory(inserted);

const byDay = inserted.reduce((acc, row) => {
  acc[row.stayDate] = (acc[row.stayDate] || 0) + 1;
  return acc;
}, {});

console.log(`[seed] inseriti ${inserted.length} check-in demo`);
console.log('[seed] per giorno:', byDay);
console.log(`[seed] oggi (${today}): ${byDay[today] || 0} visibili su tab Clienti`);
console.log('[seed] apri http://localhost:3000/staff · filtro Oggi');
