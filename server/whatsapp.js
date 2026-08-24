import crypto from 'node:crypto';
import twilio from 'twilio';
import { buildTableBookingHeadline } from './report.js';

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
  // Gate esplicito: niente alert Payel finché non abiliti ALLOW_PAYEL_WHATSAPP=true
  if (env('ALLOW_PAYEL_WHATSAPP', 'false').toLowerCase() !== 'true') {
    return false;
  }
  return Boolean(
    env('TWILIO_ACCOUNT_SID') &&
      env('TWILIO_AUTH_TOKEN') &&
      env('TWILIO_WHATSAPP_FROM') &&
      payelWhatsAppNumber() &&
      env('PUBLIC_URL'),
  );
}

/** WhatsApp testo (alert tavolo): non serve PUBLIC_URL / CSV. */
export function whatsappTextConfigured() {
  return Boolean(
    env('TWILIO_ACCOUNT_SID') &&
      env('TWILIO_AUTH_TOKEN') &&
      env('TWILIO_WHATSAPP_FROM') &&
      payelWhatsAppNumber(),
  );
}

/** Payel WhatsApp — default hotel contact; override with WHATSAPP_PAYEL */
function payelWhatsAppNumber() {
  return env('WHATSAPP_PAYEL', '+393514362677');
}

export function createCsvMediaToken(csv, filename) {
  pruneExpiredMedia();
  const token = crypto.randomBytes(32).toString('hex');
  mediaStore.set(token, {
    csv: String(csv ?? ''),
    filename: String(filename || 'report.csv'),
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return token;
}

/** Consume-on-read: monouso + TTL corto. */
export function getCsvMedia(token) {
  pruneExpiredMedia();
  const key = String(token || '');
  const item = mediaStore.get(key);
  if (!item) return null;
  mediaStore.delete(key);
  if (item.expiresAt < Date.now()) return null;
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
    `Gentili Mizan & Payel,`,
    ``,
    `report contatti di oggi (${dateLabel}): *${count}* check-in. CSV nel messaggio successivo.`,
    ``,
    `*Numeri:*`,
    lista || '—',
    ...(tavoli.length
      ? ['', '*Tavoli richiesti:*', ...tavoli]
      : []),
    ``,
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

  console.log(`[whatsapp] Report inviato (${count} contatti)`);

  return {
    sent: true,
    // non esporre mediaUrl / destinatario nelle API HTTP
  };
}

/** Alert immediato richiesta tavolo → Payel (Twilio WhatsApp). */
export async function sendTableBookingWhatsApp(row) {
  if (!whatsappTextConfigured()) {
    return { sent: false, reason: 'whatsapp_not_configured' };
  }

  const hotelName = env('HOTEL_NAME', 'Hotel Canal');
  const rawTime = String(row.table_booking || '').trim();
  const headline = buildTableBookingHeadline(rawTime);
  const room = row.room_number || '-';
  const phone = row.phone || '-';
  const name = row.guest_name || 'Ospite';
  const pax = row.guests_count ?? 2;
  const staff = row.receptionist || '-';
  const coupon = row.coupon_sent_at || row.coupon_token ? 'SÌ' : 'no';

  const body = [
    `Richiesta di prenotazione ${headline.whenPhrase}`,
    headline.brand,
    ``,
    `Stanza ${room} · ${name}`,
    `Persone: ${pax}`,
    `Tel: ${phone}`,
    coupon === 'SÌ' ? `Coupon −10% già inviato.` : null,
    staff && staff !== '-' ? `Receptionist: ${staff}` : null,
    ``,
    `Chiamare per confermare la disponibilità.`,
    `(ospite ${hotelName})`,
  ]
    .filter((line) => line != null)
    .join('\n');

  const client = twilio(env('TWILIO_ACCOUNT_SID'), env('TWILIO_AUTH_TOKEN'));
  const from = toWhatsAppAddress(env('TWILIO_WHATSAPP_FROM'));
  const to = toWhatsAppAddress(payelWhatsAppNumber());
  const msg = await client.messages.create({ from, to, body });

  console.log(`[whatsapp] Alert tavolo · stanza ${room}`);

  return {
    sent: true,
    channel: 'whatsapp',
    sid: msg.sid,
  };
}
