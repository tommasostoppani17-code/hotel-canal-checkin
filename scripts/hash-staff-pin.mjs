#!/usr/bin/env node
/**
 * Genera hash scrypt per STAFF_PIN_* (Render / .env).
 * Uso:
 *   node scripts/hash-staff-pin.mjs "mio-pin-segreto"
 *   node scripts/hash-staff-pin.mjs --roster   # PIN random + righe env per tutti
 */
import crypto from 'node:crypto';
import { hashStaffPin } from '../server/staff-auth.js';

const ROSTER = [
  'tommaso',
  'john',
  'alejandro',
  'maria',
  'mizan',
  'payel',
  'sayeed',
];

function randomPin() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

const arg = process.argv[2];
if (!arg) {
  console.error('Uso: node scripts/hash-staff-pin.mjs "<pin>" | --roster');
  process.exit(1);
}

if (arg === '--roster') {
  console.log('# Incolla su Render → Environment (valori hash). Conserva i PIN in posto sicuro.\n');
  const pins = {};
  for (const id of ROSTER) {
    const pin = randomPin();
    pins[id] = pin;
    const key = `STAFF_PIN_${id.toUpperCase()}`;
    console.log(`${key}=${hashStaffPin(pin)}`);
  }
  console.log('\n# PIN in chiaro (consegna reception — non committare):\n');
  for (const id of ROSTER) {
    console.log(`${id.padEnd(10)} ${pins[id]}`);
  }
  process.exit(0);
}

console.log(hashStaffPin(arg));
