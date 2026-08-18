/**
 * Verifica matematica: checkout + 7 giorni -> PII a NULL, stanza/receptionist restano.
 * Non tocca il database dell'hotel. Uso: node scripts/verify-gdpr-retention.mjs
 */
import Database from 'better-sqlite3';
import { runAnonymization, addDaysYmd } from '../server/gdpr-retention.js';

function fail(msg) {
  console.error(`[GDPR verify] FAIL ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`[GDPR verify] ok ${msg}`);
}

const mem = new Database(':memory:');
mem.exec(`
  CREATE TABLE checkins (
    id INTEGER PRIMARY KEY,
    phone TEXT,
    email TEXT,
    guest_name TEXT,
    room_number TEXT,
    receptionist TEXT,
    coupon_token TEXT,
    coupon_sent_at TEXT,
    stay_date TEXT,
    checkout_date TEXT,
    created_at TEXT,
    starred_at TEXT,
    anonymized_at TEXT
  );
`);

const insert = mem.prepare(`
  INSERT INTO checkins (
    id, phone, email, guest_name, room_number, receptionist,
    coupon_token, stay_date, checkout_date, created_at, starred_at
  ) VALUES (
    @id, @phone, @email, @guest_name, @room_number, @receptionist,
    @coupon_token, @stay_date, @checkout_date, @created_at, @starred_at
  )
`);

insert.run({
  id: 1,
  phone: 'enc:v1:secret-phone',
  email: 'enc:v1:secret-mail',
  guest_name: 'Mario Rossi',
  room_number: '104',
  receptionist: 'TOMMASO',
  coupon_token: 'abc',
  stay_date: '2026-08-08',
  checkout_date: '2026-08-10',
  created_at: '2026-08-08 10:00:00',
  starred_at: '2026-08-08 12:00:00',
});
insert.run({
  id: 2,
  phone: 'enc:v1:still-here',
  email: 'enc:v1:mail-2',
  guest_name: 'Anna Bianchi',
  room_number: '12',
  receptionist: 'PAYEL',
  coupon_token: null,
  stay_date: '2026-08-11',
  checkout_date: '2026-08-11',
  created_at: '2026-08-11 09:00:00',
  starred_at: null,
});
insert.run({
  id: 3,
  phone: 'leftover',
  email: 'leftover@x.com',
  guest_name: 'Ghost',
  room_number: '5',
  receptionist: 'JOHN',
  coupon_token: 'z',
  stay_date: '2026-01-01',
  checkout_date: '2026-01-02',
  created_at: '2026-01-01 10:00:00',
  starred_at: null,
});
mem.prepare(`UPDATE checkins SET anonymized_at = datetime('now') WHERE id = 3`).run();

const today = '2026-08-18';
const keepFrom = addDaysYmd(today, -7);
if (keepFrom !== '2026-08-11') fail(`keepFrom atteso 2026-08-11, ottenuto ${keepFrom}`);
else ok(`keepFrom=${keepFrom}`);

const result = runAnonymization(mem, today, {
  calendarDateFromCreatedAt: (raw) => String(raw || '').slice(0, 10),
});

if (result.changes < 1) fail('nessuna riga anonimizzata (attesa almeno id=1)');
else ok(`changes=${result.changes} repaired=${result.repaired}`);

const row1 = mem.prepare(`SELECT * FROM checkins WHERE id = 1`).get();
if (row1.phone || row1.email || row1.guest_name || row1.coupon_token) {
  fail('id=1 ha ancora PII dopo checkout 10 agosto + 7 giorni');
} else if (!row1.anonymized_at) {
  fail('id=1 senza anonymized_at');
} else if (row1.room_number !== '104' || row1.receptionist !== 'TOMMASO') {
  fail('id=1 ha perso stanza o receptionist');
} else if (row1.starred_at) {
  ok('stellina non ha bloccato l anonimizzazione (come da informativa)');
} else {
  fail('stellina id=1 sparita (non richiesto)');
}

const row2 = mem.prepare(`SELECT * FROM checkins WHERE id = 2`).get();
if (row2.anonymized_at || !row2.guest_name) {
  fail('id=2 (checkout 11 agosto) non deve essere anonimizzato il 18 agosto');
} else ok('id=2 ancora in retention il giorno checkout+7');

const later = runAnonymization(mem, '2026-08-19', {
  calendarDateFromCreatedAt: (raw) => String(raw || '').slice(0, 10),
});
const row2b = mem.prepare(`SELECT * FROM checkins WHERE id = 2`).get();
if (!row2b.anonymized_at || row2b.guest_name || row2b.phone) {
  fail('id=2 deve sparire il 19 agosto (checkout 11 + 7 giorni)');
} else ok(`id=2 anonimizzato il 19 agosto (changes=${later.changes})`);

const row3 = mem.prepare(`SELECT * FROM checkins WHERE id = 3`).get();
if (row3.phone || row3.email || row3.guest_name || row3.coupon_token) {
  fail('id=3 gia marcato anonimo aveva PII residui non riparati');
} else ok('riparati PII residui su riga gia anonima');

if (process.exitCode) {
  console.error('[GDPR verify] retention non allineata all informativa');
  process.exit(1);
}
console.log('[GDPR verify] checkout + 7 giorni eseguito in modo deterministico');
