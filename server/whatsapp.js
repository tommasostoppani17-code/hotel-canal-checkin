import crypto from 'node:crypto';
import twilio from 'twilio';

/** Short-lived CSV blobs for Twilio mediaUrl fetch (in-memory). */
const mediaStore = new Map();

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function pruneExpiredMedia() {
  const now = Date.now();
  for (const [token, item] of mediaStore) {
    if (item.expiresAt < now) mediaStore.delete(token);
  }
}

/** Normalize to Twilio WhatsApp address: whatsapp:+39… */
export function toWhatsAppAddress(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.toLowerCase().startsWith('whatsapp:')) {
    return `whatsapp:${raw.slice('whatsapp:'.length).trim()}`;
  }
  const cleaned = raw.replace(/[^\d+]/g, '');
  const withPlus = cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
  return `whatsapp:${withPlus}`;
}

export function whatsappConfigured() {
  return Boolean(
    env('TWILIO_ACCOUNT_SID') &&
      env('TWILIO_AUTH_TOKEN') &&
      env('TWILIO_WHATSAPP_FROM') &&
      payelWhatsAppNumber() &&
      env('PUBLIC_URL'),
  );
}

/** Payel WhatsApp — default hotel contact; override with WHATSAPP_PAYEL */
function payelWhatsAppNumber() {
  return env('WHATSAPP_PAYEL', '+393514362677');
}

export function createCsvMediaToken(csv, filename) {
  pruneExpiredMedia();
  const token = crypto.randomBytes(24).toString('hex');
  mediaStore.set(token, {
    csv: String(csv ?? ''),
    filename: String(filename || 'report.csv'),
    expiresAt: Date.now() + 20 * 60 * 1000,
  });
  return token;
}

export function getCsvMedia(token) {
  pruneExpiredMedia();
  const item = mediaStore.get(String(token || ''));
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    mediaStore.delete(token);
    return null;
  }
  return item;
}

export function buildWhatsAppDailyBody({ hotelName, dateLabel, count, rows = [] }) {
  const lista = rows
    .map((row) => row.phone)
    .filter(Boolean)
    .join(', ');

  const tavoli = rows
    .filter((row) => row.table_booking)
    .map(
      (row) =>
        `· Stanza ${row.room_number || '-'} · ${row.table_booking} · ${row.phone || '-'} (${row.guests_count ?? 2} pax)`,
    );

  return [
    `Ciao Payel,`,
    ``,
    `in allegato il report contatti di oggi (${dateLabel}): *${count}* registrazioni.`,
    `Dagli un'occhiata quando puoi.`,
    ``,
    `*Numeri:*`,
    lista || '—',
    ...(tavoli.length
      ? ['', '*Tavoli richiesti:*', ...tavoli]
      : []),
    ``,
    `CSV nel messaggio successivo.`,
    ``,
    `Saluti,`,
    `Front Desk — ${hotelName}`,
  ].join('\n');
}

/**
 * Two WhatsApp messages: copyable phone list, then CSV as document via public mediaUrl.
 */
export async function sendDailyWhatsAppReport({
  hotelName,
  dateLabel,
  count,
  rows,
  csv,
  filename,
}) {
  if (!whatsappConfigured()) {
    return { sent: false, reason: 'whatsapp_not_configured' };
  }

  const client = twilio(env('TWILIO_ACCOUNT_SID'), env('TWILIO_AUTH_TOKEN'));
  const from = toWhatsAppAddress(env('TWILIO_WHATSAPP_FROM'));
  const to = toWhatsAppAddress(payelWhatsAppNumber());
  const publicUrl = env('PUBLIC_URL').replace(/\/$/, '');

  const body = buildWhatsAppDailyBody({
    hotelName,
    dateLabel,
    count,
    rows,
  });

  await client.messages.create({ from, to, body });

  const token = createCsvMediaToken(csv, filename);
  const mediaUrl = `${publicUrl}/api/reports/whatsapp-csv/${token}`;

  await client.messages.create({
    from,
    to,
    body: `CSV report contatti ${dateLabel} — Hotel Canal`,
    mediaUrl: [mediaUrl],
  });

  console.log(`[whatsapp] Report inviato a ${payelWhatsAppNumber()} (${count} contatti)`);

  return {
    sent: true,
    to: payelWhatsAppNumber(),
    mediaUrl,
  };
}
