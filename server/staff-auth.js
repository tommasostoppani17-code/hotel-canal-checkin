/**
 * Staff password verification — scrypt only (salted). Never compare plaintext.
 * Format: scrypt:v1:<salt>.<hash>  (base64url)
 */
import crypto from 'node:crypto';

const PREFIX = 'scrypt:v1:';
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function isStaffPinHash(value) {
  return String(value || '').startsWith(PREFIX);
}

/** Password scelta o random: 4–64 caratteri, senza spazi. PIN numerico incluso. */
export function isUsableStaffPassword(value) {
  const pin = String(value || '');
  return pin.length >= 4 && pin.length <= 64 && !/\s/.test(pin);
}

export function hashStaffPin(plain) {
  const text = String(plain || '');
  if (!text) throw new Error('PIN vuoto');
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(text, salt, 32, SCRYPT_PARAMS);
  return `${PREFIX}${salt.toString('base64url')}.${hash.toString('base64url')}`;
}

export function verifyStaffPin(plain, stored) {
  const pin = String(plain || '');
  const ref = String(stored || '').trim();
  if (!pin || !ref || !isStaffPinHash(ref)) return false;

  const body = ref.slice(PREFIX.length);
  const parts = body.split('.');
  if (parts.length !== 2) return false;
  const [saltB64, hashB64] = parts;
  let salt;
  let expected;
  try {
    salt = Buffer.from(saltB64, 'base64url');
    expected = Buffer.from(hashB64, 'base64url');
  } catch {
    return false;
  }
  if (!salt.length || expected.length !== 32) return false;
  const actual = crypto.scryptSync(pin, salt, 32, SCRYPT_PARAMS);
  return crypto.timingSafeEqual(actual, expected);
}
