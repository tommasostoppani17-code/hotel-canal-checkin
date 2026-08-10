/**
 * AES-256-GCM field encryption for guest PII at rest (phone, email, name).
 * Format: enc:v1:<iv>.<tag>.<ciphertext>  (base64url parts)
 */
import crypto from 'node:crypto';

const PREFIX = 'enc:v1:';

function isProd() {
  return process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
}

function keyMaterial() {
  const raw = String(process.env.FIELD_ENCRYPTION_KEY || '').trim();
  if (raw) return raw;
  if (isProd()) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY obbligatorio in produzione (32+ byte random / hex)',
    );
  }
  return 'hotel-canal-dev-field-key-not-for-prod';
}

/** 32-byte key derived via SHA-256 (accepts any passphrase / hex). */
function encryptionKey() {
  return crypto.createHash('sha256').update(keyMaterial(), 'utf8').digest();
}

export function isEncryptedField(value) {
  return String(value || '').startsWith(PREFIX);
}

export function encryptField(plaintext) {
  if (plaintext == null) return null;
  const text = String(plaintext);
  if (!text) return null;
  if (isEncryptedField(text)) return text;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

export function decryptField(value) {
  if (value == null) return null;
  const raw = String(value);
  if (!raw) return null;
  if (!isEncryptedField(raw)) return raw; // legacy plaintext

  const body = raw.slice(PREFIX.length);
  const parts = body.split('.');
  if (parts.length !== 3) {
    throw new Error('Campo cifrato non valido');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64url');
  const tag = Buffer.from(tagB64, 'base64url');
  const data = Buffer.from(dataB64, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}

/** Decrypt PII columns on a check-in row (safe for null / legacy). */
export function decryptCheckinRow(row) {
  if (!row || typeof row !== 'object') return row;
  const out = { ...row };
  try {
    if (out.phone != null) out.phone = decryptField(out.phone);
    if (out.email != null) out.email = decryptField(out.email);
    if (out.guest_name != null) out.guest_name = decryptField(out.guest_name);
  } catch (err) {
    console.error('[crypto] decrypt row failed:', err.message || err);
    throw err;
  }
  return out;
}
