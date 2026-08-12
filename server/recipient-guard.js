/**
 * Destinatari email vietati — info@ hotel inbox, mai report/BCC/welcome di sistema.
 */

const ALWAYS_BLOCKED = new Set(['info@hotelcanal.com']);

export function normalizeRecipientEmail(value) {
  return String(value || '').trim().toLowerCase();
}

/** True se non si deve inviare nulla a questo indirizzo. */
export function isBlockedRecipient(email) {
  const norm = normalizeRecipientEmail(email);
  if (!norm || !norm.includes('@')) return false;
  if (ALWAYS_BLOCKED.has(norm)) return true;
  if (
    /@hotelcanal\.com$/i.test(norm) &&
    String(process.env.ALLOW_HOTEL_MAIL || 'false').toLowerCase() !== 'true'
  ) {
    return true;
  }
  return false;
}

export function assertSendableRecipient(email, context = 'email') {
  const norm = normalizeRecipientEmail(email);
  if (!norm) {
    throw new Error(`Destinatario ${context} mancante`);
  }
  if (isBlockedRecipient(norm)) {
    throw new Error(
      `Destinatario ${context} bloccato (info@ / hotelcanal): ${norm}`,
    );
  }
  return norm;
}

/** Per BCC / fallback: stringa vuota se bloccato. */
export function sendableRecipientOrEmpty(email) {
  const norm = normalizeRecipientEmail(email);
  if (!norm || isBlockedRecipient(norm)) return '';
  return norm;
}
