/**
 * Hold camera + link bonifico IBAN (MVP Canal).
 * Nessun Stripe: ospite vede IBAN + causale; reception conferma a mano.
 */

import crypto from 'node:crypto';
import { getDb, getHotelSetting, setHotelSetting } from './db.js';

export const HOLD_STATUSES = {
  HOLD: 'hold',
  DETAILS: 'details_submitted',
  AWAITING: 'awaiting_transfer',
  CONFIRMED: 'confirmed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

/** Tipi camera mostrati in reception e sul link ospite */
export const ROOM_TYPES = [
  { id: 'singola', label: 'Singola' },
  { id: 'doppia', label: 'Doppia' },
  { id: 'matrimoniale', label: 'Matrimoniale' },
  { id: 'twin', label: 'Twin (2 letti)' },
  { id: 'tripla', label: 'Tripla' },
  { id: 'quadrupla', label: 'Quadrupla' },
  { id: 'family', label: 'Family' },
  { id: 'suite', label: 'Suite' },
];

/** Trattamento / pensione */
export const BOARD_PLANS = [
  { id: 'solo_pernottamento', label: 'Solo pernottamento' },
  { id: 'colazione_inclusa', label: 'Colazione inclusa' },
  { id: 'colazione_esclusa', label: 'Colazione non inclusa' },
  { id: 'mezza_pensione', label: 'Mezza pensione' },
  { id: 'pensione_completa', label: 'Pensione completa' },
];

/** Extra selezionabili (garage, vista, ecc.) */
export const HOLD_EXTRAS = [
  { id: 'garage', label: 'Garage' },
  { id: 'vista_canale', label: 'Vista canale' },
  { id: 'vista_citta', label: 'Vista città' },
  { id: 'balcone', label: 'Balcone / terrazza' },
  { id: 'early_checkin', label: 'Early check-in' },
  { id: 'late_checkout', label: 'Late check-out' },
  { id: 'culla', label: 'Culla' },
  { id: 'letto_extra', label: 'Letto extra' },
  { id: 'animali', label: 'Animali ammessi' },
];

function labelFromList(list, id) {
  const hit = list.find((x) => x.id === id);
  return hit ? hit.label : '';
}

function normalizeRoomType(raw) {
  const id = String(raw || '').trim().toLowerCase();
  return ROOM_TYPES.some((x) => x.id === id) ? id : '';
}

function normalizeBoardPlan(raw) {
  const id = String(raw || '').trim().toLowerCase();
  return BOARD_PLANS.some((x) => x.id === id) ? id : '';
}

function normalizeExtras(raw) {
  const allowed = new Set(HOLD_EXTRAS.map((x) => x.id));
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
      else list = raw.split(/[,|]/).map((s) => s.trim());
    } catch {
      list = raw.split(/[,|]/).map((s) => s.trim());
    }
  }
  return [...new Set(list.map((s) => String(s).trim().toLowerCase()).filter((id) => allowed.has(id)))];
}

function extrasToStore(list) {
  return list.length ? JSON.stringify(list) : null;
}

function extrasFromStore(raw) {
  return normalizeExtras(raw);
}

const ACTIVE_LOCK_STATUSES = [
  HOLD_STATUSES.HOLD,
  HOLD_STATUSES.DETAILS,
  HOLD_STATUSES.AWAITING,
  HOLD_STATUSES.CONFIRMED,
];

const EXPIRABLE = [
  HOLD_STATUSES.HOLD,
  HOLD_STATUSES.DETAILS,
  HOLD_STATUSES.AWAITING,
];

export function ensureRoomHoldsSchema() {
  // Schema creato in initDb (server/db.js). No-op per compat.
}

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function nowIso() {
  return new Date().toISOString();
}

function toSqliteUtc(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');
}

function parseYmd(raw) {
  const s = String(raw || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : s;
}

function datesOverlap(aIn, aOut, bIn, bOut) {
  return aIn < bOut && aOut > bIn;
}

function makeToken() {
  return crypto.randomBytes(16).toString('hex');
}

function makePaymentRef() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i += 1) {
    body += alphabet[bytes[i] % alphabet.length];
  }
  return `HC-${body}`;
}

function centsFromEuros(raw) {
  const n = Number(String(raw ?? '').replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function eurosFromCents(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function normalizeRoom(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function normalizePercent(raw) {
  const n = Number(raw);
  if (![30, 50, 100].includes(n)) return null;
  return n;
}

export function getHotelIbanConfig() {
  const iban =
    env('HOTEL_IBAN') || getHotelSetting('hotel_iban', '');
  const holder =
    env('HOTEL_IBAN_HOLDER') ||
    getHotelSetting('hotel_iban_holder', '') ||
    env('HOTEL_NAME', 'Hotel Canal');
  const bank = env('HOTEL_IBAN_BANK') || getHotelSetting('hotel_iban_bank', '');
  return {
    iban: String(iban || '').replace(/\s+/g, '').toUpperCase(),
    holder: String(holder || '').trim(),
    bank: String(bank || '').trim(),
    configured: Boolean(String(iban || '').replace(/\s+/g, '')),
  };
}

export function setHotelIbanConfig({ iban, holder, bank }, updatedBy = '') {
  if (iban != null) {
    setHotelSetting(
      'hotel_iban',
      String(iban).replace(/\s+/g, '').toUpperCase(),
      updatedBy,
    );
  }
  if (holder != null) {
    setHotelSetting('hotel_iban_holder', String(holder).trim(), updatedBy);
  }
  if (bank != null) {
    setHotelSetting('hotel_iban_bank', String(bank).trim(), updatedBy);
  }
  return getHotelIbanConfig();
}

export function expireDueHolds() {
  const db = getDb();
  const now = toSqliteUtc(nowIso());
  const placeholders = EXPIRABLE.map(() => '?').join(',');
  const result = db
    .prepare(
      `
      UPDATE room_holds
      SET status = ?, updated_at = datetime('now')
      WHERE status IN (${placeholders})
        AND expires_at IS NOT NULL
        AND expires_at <= ?
      `,
    )
    .run(HOLD_STATUSES.EXPIRED, ...EXPIRABLE, now);
  return result.changes || 0;
}

function mapHoldRow(row, { includeGuestPii = true } = {}) {
  if (!row) return null;
  const roomType = String(row.room_type || '').trim();
  const boardPlan = String(row.board_plan || '').trim();
  const extras = extrasFromStore(row.extras);
  const base = {
    id: row.id,
    token: row.token,
    paymentRef: row.payment_ref,
    roomNumber: row.room_number,
    roomType,
    roomTypeLabel: labelFromList(ROOM_TYPES, roomType) || roomType,
    boardPlan,
    boardPlanLabel: labelFromList(BOARD_PLANS, boardPlan) || boardPlan,
    extras,
    extrasLabels: extras.map((id) => labelFromList(HOLD_EXTRAS, id)).filter(Boolean),
    offerNotes: String(row.offer_notes || '').trim(),
    checkIn: row.check_in,
    checkOut: row.check_out,
    totalCents: row.total_cents,
    totalEuros: eurosFromCents(row.total_cents),
    depositPercent: row.deposit_percent,
    amountDueCents: row.amount_due_cents,
    amountDueEuros: eurosFromCents(row.amount_due_cents),
    status: row.status,
    soldBy: row.sold_by,
    expiresAt: row.expires_at,
    guestsCount: row.guests_count,
    guestNotes: row.guest_notes || '',
    privacyAcceptedAt: row.privacy_accepted_at,
    detailsSubmittedAt: row.details_submitted_at,
    transferDeclaredAt: row.transfer_declared_at,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    manual: Boolean(row.manual),
  };
  if (includeGuestPii) {
    base.guestName = row.guest_name || '';
    base.guestPhone = row.guest_phone || '';
    base.guestEmail = row.guest_email || '';
  }
  return base;
}

function findActiveOverlap(roomNumber, checkIn, checkOut, excludeId = null) {
  const db = getDb();
  const placeholders = ACTIVE_LOCK_STATUSES.map(() => '?').join(',');
  const rows = db
    .prepare(
      `
      SELECT id, room_number, check_in, check_out, status, payment_ref
      FROM room_holds
      WHERE UPPER(TRIM(room_number)) = ?
        AND status IN (${placeholders})
        ${excludeId ? 'AND id != ?' : ''}
      `,
    )
    .all(
      roomNumber,
      ...ACTIVE_LOCK_STATUSES,
      ...(excludeId ? [excludeId] : []),
    );
  return rows.find((r) =>
    datesOverlap(checkIn, checkOut, r.check_in, r.check_out),
  );
}

export function createRoomHold({
  roomNumber,
  checkIn,
  checkOut,
  totalEuros,
  depositPercent = 100,
  expireHours = 24,
  soldBy,
  manual = false,
  guestName = '',
  guestPhone = '',
  guestEmail = '',
  guestsCount = null,
  guestNotes = '',
  roomType = '',
  boardPlan = '',
  extras = [],
  offerNotes = '',
  status = null,
}) {
  expireDueHolds();
  const room = normalizeRoom(roomNumber);
  const cin = parseYmd(checkIn);
  const cout = parseYmd(checkOut);
  const totalCents = centsFromEuros(totalEuros);
  const pct = normalizePercent(depositPercent) ?? 100;
  const hours = Math.min(168, Math.max(1, Number(expireHours) || 24));
  const seller = String(soldBy || '').trim();
  const typeId = normalizeRoomType(roomType);
  const boardId = normalizeBoardPlan(boardPlan);
  const extrasList = normalizeExtras(extras);
  const notesOffer = String(offerNotes || '').trim().slice(0, 2000);

  if (!room) {
    return { ok: false, error: 'stanza_mancante' };
  }
  if (!typeId) {
    return { ok: false, error: 'tipo_stanza_mancante' };
  }
  if (!boardId) {
    return { ok: false, error: 'trattamento_mancante' };
  }
  if (!cin || !cout || cout <= cin) {
    return { ok: false, error: 'date_non_valide' };
  }
  if (totalCents == null || totalCents <= 0) {
    return { ok: false, error: 'prezzo_non_valido' };
  }
  if (!seller) {
    return { ok: false, error: 'venditore_mancante' };
  }

  const overlap = findActiveOverlap(room, cin, cout);
  if (overlap) {
    return {
      ok: false,
      error: 'camera_occupata',
      conflict: {
        id: overlap.id,
        paymentRef: overlap.payment_ref,
        checkIn: overlap.check_in,
        checkOut: overlap.check_out,
        status: overlap.status,
      },
    };
  }

  const amountDueCents = Math.round((totalCents * pct) / 100);
  const token = makeToken();
  const paymentRef = makePaymentRef();
  const isManual = Boolean(manual);
  const finalStatus =
    status ||
    (isManual ? HOLD_STATUSES.CONFIRMED : HOLD_STATUSES.HOLD);
  const expiresAt =
    finalStatus === HOLD_STATUSES.CONFIRMED
      ? null
      : toSqliteUtc(new Date(Date.now() + hours * 3600_000).toISOString());

  const db = getDb();
  const info = db
    .prepare(
      `
      INSERT INTO room_holds (
        token, payment_ref, room_number, check_in, check_out,
        total_cents, deposit_percent, amount_due_cents, status,
        sold_by, expires_at, guest_name, guest_phone, guest_email,
        guests_count, guest_notes, room_type, board_plan, extras, offer_notes,
        confirmed_at, confirmed_by, manual, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, datetime('now')
      )
      `,
    )
    .run(
      token,
      paymentRef,
      room,
      cin,
      cout,
      totalCents,
      pct,
      amountDueCents,
      finalStatus,
      seller,
      expiresAt,
      String(guestName || '').trim() || null,
      String(guestPhone || '').trim() || null,
      String(guestEmail || '').trim() || null,
      guestsCount != null && Number.isFinite(Number(guestsCount))
        ? Number(guestsCount)
        : null,
      String(guestNotes || '').trim() || null,
      typeId,
      boardId,
      extrasToStore(extrasList),
      notesOffer || null,
      finalStatus === HOLD_STATUSES.CONFIRMED ? nowIso() : null,
      finalStatus === HOLD_STATUSES.CONFIRMED ? seller : null,
      isManual ? 1 : 0,
    );

  return { ok: true, hold: getRoomHoldById(info.lastInsertRowid) };
}

export function createManualRoomHold(payload) {
  return createRoomHold({
    ...payload,
    manual: true,
    status: HOLD_STATUSES.CONFIRMED,
    expireHours: 24,
  });
}

export function getRoomHoldById(id) {
  expireDueHolds();
  const row = getDb()
    .prepare(`SELECT * FROM room_holds WHERE id = ?`)
    .get(Number(id));
  return mapHoldRow(row);
}

export function getRoomHoldByToken(token) {
  expireDueHolds();
  const row = getDb()
    .prepare(`SELECT * FROM room_holds WHERE token = ?`)
    .get(String(token || '').trim());
  return mapHoldRow(row);
}

export function listRoomHolds({ includeClosed = true } = {}) {
  expireDueHolds();
  const db = getDb();
  const rows = includeClosed
    ? db
        .prepare(
          `
          SELECT * FROM room_holds
          ORDER BY
            CASE status
              WHEN 'awaiting_transfer' THEN 0
              WHEN 'details_submitted' THEN 1
              WHEN 'hold' THEN 2
              WHEN 'confirmed' THEN 3
              ELSE 4
            END,
            created_at DESC
          LIMIT 200
          `,
        )
        .all()
    : db
        .prepare(
          `
          SELECT * FROM room_holds
          WHERE status IN (?, ?, ?, ?)
          ORDER BY created_at DESC
          LIMIT 200
          `,
        )
        .all(
          HOLD_STATUSES.HOLD,
          HOLD_STATUSES.DETAILS,
          HOLD_STATUSES.AWAITING,
          HOLD_STATUSES.CONFIRMED,
        );
  return rows.map((r) => mapHoldRow(r));
}

export function submitHoldGuestDetails(token, payload) {
  expireDueHolds();
  const hold = getRoomHoldByToken(token);
  if (!hold) return { ok: false, error: 'link_non_valido' };
  if (
    hold.status === HOLD_STATUSES.EXPIRED ||
    hold.status === HOLD_STATUSES.CANCELLED
  ) {
    return { ok: false, error: 'link_scaduto' };
  }
  if (hold.status === HOLD_STATUSES.CONFIRMED) {
    return { ok: false, error: 'gia_confermato' };
  }
  if (
    hold.status !== HOLD_STATUSES.HOLD &&
    hold.status !== HOLD_STATUSES.DETAILS
  ) {
    return { ok: false, error: 'stato_non_modificabile' };
  }

  const guestName = String(payload.guestName || '').trim();
  const guestPhone = String(payload.guestPhone || '').trim();
  const guestEmail = String(payload.guestEmail || '').trim().toLowerCase();
  const guestsCount = Number(payload.guestsCount);
  const guestNotes = String(payload.guestNotes || '').trim();
  const privacy = Boolean(payload.privacyAccepted);

  if (!guestName || guestName.length < 2) {
    return { ok: false, error: 'nome_mancante', field: 'guestName' };
  }
  if (!guestPhone || guestPhone.replace(/\D/g, '').length < 6) {
    return { ok: false, error: 'telefono_mancante', field: 'guestPhone' };
  }
  if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
    return { ok: false, error: 'email_non_valida', field: 'guestEmail' };
  }
  if (!Number.isFinite(guestsCount) || guestsCount < 1 || guestsCount > 20) {
    return { ok: false, error: 'pax_non_validi', field: 'guestsCount' };
  }
  if (!privacy) {
    return { ok: false, error: 'privacy_richiesta', field: 'privacy' };
  }

  getDb()
    .prepare(
      `
      UPDATE room_holds SET
        guest_name = ?,
        guest_phone = ?,
        guest_email = ?,
        guests_count = ?,
        guest_notes = ?,
        privacy_accepted_at = COALESCE(privacy_accepted_at, ?),
        details_submitted_at = COALESCE(details_submitted_at, ?),
        status = ?,
        updated_at = datetime('now')
      WHERE id = ?
      `,
    )
    .run(
      guestName,
      guestPhone,
      guestEmail,
      guestsCount,
      guestNotes || null,
      nowIso(),
      nowIso(),
      HOLD_STATUSES.DETAILS,
      hold.id,
    );

  return { ok: true, hold: getRoomHoldById(hold.id) };
}

export function declareHoldTransfer(token) {
  expireDueHolds();
  const hold = getRoomHoldByToken(token);
  if (!hold) return { ok: false, error: 'link_non_valido' };
  if (
    hold.status === HOLD_STATUSES.EXPIRED ||
    hold.status === HOLD_STATUSES.CANCELLED
  ) {
    return { ok: false, error: 'link_scaduto' };
  }
  if (hold.status === HOLD_STATUSES.CONFIRMED) {
    return { ok: true, hold };
  }
  if (
    hold.status !== HOLD_STATUSES.DETAILS &&
    hold.status !== HOLD_STATUSES.AWAITING
  ) {
    return { ok: false, error: 'completa_dati_prima' };
  }

  getDb()
    .prepare(
      `
      UPDATE room_holds SET
        status = ?,
        transfer_declared_at = COALESCE(transfer_declared_at, ?),
        updated_at = datetime('now')
      WHERE id = ?
      `,
    )
    .run(HOLD_STATUSES.AWAITING, nowIso(), hold.id);

  return { ok: true, hold: getRoomHoldById(hold.id) };
}

export function confirmRoomHold(id, confirmedBy) {
  expireDueHolds();
  const hold = getRoomHoldById(id);
  if (!hold) return { ok: false, error: 'non_trovato' };
  if (
    hold.status === HOLD_STATUSES.CANCELLED ||
    hold.status === HOLD_STATUSES.EXPIRED
  ) {
    return { ok: false, error: 'hold_chiuso' };
  }
  if (hold.status === HOLD_STATUSES.CONFIRMED) {
    return { ok: true, hold };
  }

  getDb()
    .prepare(
      `
      UPDATE room_holds SET
        status = ?,
        confirmed_at = ?,
        confirmed_by = ?,
        expires_at = NULL,
        updated_at = datetime('now')
      WHERE id = ?
      `,
    )
    .run(
      HOLD_STATUSES.CONFIRMED,
      nowIso(),
      String(confirmedBy || '').trim() || null,
      hold.id,
    );

  return { ok: true, hold: getRoomHoldById(hold.id) };
}

export function cancelRoomHold(id, cancelledBy) {
  expireDueHolds();
  const hold = getRoomHoldById(id);
  if (!hold) return { ok: false, error: 'non_trovato' };
  if (hold.status === HOLD_STATUSES.CANCELLED) {
    return { ok: true, hold };
  }
  if (hold.status === HOLD_STATUSES.CONFIRMED) {
    return { ok: false, error: 'gia_confermato' };
  }

  getDb()
    .prepare(
      `
      UPDATE room_holds SET
        status = ?,
        cancelled_at = ?,
        cancelled_by = ?,
        updated_at = datetime('now')
      WHERE id = ?
      `,
    )
    .run(
      HOLD_STATUSES.CANCELLED,
      nowIso(),
      String(cancelledBy || '').trim() || null,
      hold.id,
    );

  return { ok: true, hold: getRoomHoldById(hold.id) };
}

export function buildHoldPublicUrl(token, baseUrl) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  return `${base}/paga/${encodeURIComponent(token)}`;
}

export function publicHoldPayload(hold, baseUrl) {
  if (!hold) return null;
  const iban = getHotelIbanConfig();
  const linkLive = [
    HOLD_STATUSES.HOLD,
    HOLD_STATUSES.DETAILS,
    HOLD_STATUSES.AWAITING,
  ].includes(hold.status);

  return {
    status: hold.status,
    roomNumber: hold.roomNumber,
    roomType: hold.roomType,
    roomTypeLabel: hold.roomTypeLabel,
    boardPlan: hold.boardPlan,
    boardPlanLabel: hold.boardPlanLabel,
    extras: hold.extras,
    extrasLabels: hold.extrasLabels,
    offerNotes: hold.offerNotes,
    checkIn: hold.checkIn,
    checkOut: hold.checkOut,
    totalEuros: hold.totalEuros,
    depositPercent: hold.depositPercent,
    amountDueEuros: hold.amountDueEuros,
    paymentRef: hold.paymentRef,
    expiresAt: hold.expiresAt,
    guestName: hold.guestName || '',
    guestPhone: hold.guestPhone || '',
    guestEmail: hold.guestEmail || '',
    guestsCount: hold.guestsCount,
    guestNotes: hold.guestNotes || '',
    hasDetails: Boolean(hold.detailsSubmittedAt || hold.guestName),
    transferDeclared: Boolean(hold.transferDeclaredAt),
    linkLive,
    payUrl: buildHoldPublicUrl(hold.token, baseUrl),
    iban: {
      number: iban.iban,
      holder: iban.holder,
      bank: iban.bank,
      configured: iban.configured,
    },
  };
}

export function staffHoldPayload(hold, baseUrl) {
  if (!hold) return null;
  return {
    ...hold,
    payUrl: buildHoldPublicUrl(hold.token, baseUrl),
    iban: getHotelIbanConfig(),
  };
}
