/**
 * Retention GDPR = checkout dichiarato + 7 giorni di calendario (Europe/Rome).
 * Allineato all'informativa: dopo quella data nome/telefono/email spariscono.
 * Stanza, date e receptionist restano per le statistiche.
 *
 * Le stelline non prolungano i dati identificativi: l'informativa non lo prevede.
 */

export const GDPR_RETENTION_DAYS = 7;

/** Checkout, altrimenti check-in, altrimenti data di created_at (UTC, fallback). */
export const RETENTION_ANCHOR_SQL = `COALESCE(
  NULLIF(TRIM(checkout_date), ''),
  NULLIF(TRIM(stay_date), ''),
  date(created_at)
)`;

export function addDaysYmd(ymd, days) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d + days, 12, 0, 0))
    .toISOString()
    .slice(0, 10);
}

function rowAnchorYmd(row, calendarDateFromCreatedAt) {
  const checkout = String(row?.checkout_date || '').trim();
  if (checkout) return checkout;
  const stay = String(row?.stay_date || '').trim();
  if (stay) return stay;
  if (typeof calendarDateFromCreatedAt === 'function') {
    return String(calendarDateFromCreatedAt(row?.created_at) || '').trim();
  }
  return String(row?.created_at || '').trim().slice(0, 10);
}

function anonymizeByIds(db, ids) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  return db
    .prepare(
      `
      UPDATE checkins
      SET
        phone = NULL,
        email = NULL,
        guest_name = NULL,
        coupon_token = NULL,
        coupon_sent_at = NULL,
        anonymized_at = COALESCE(anonymized_at, datetime('now'))
      WHERE id IN (${placeholders})
        AND anonymized_at IS NULL
    `,
    )
    .run(...ids).changes;
}

/**
 * Sovrascrive i PII scaduti. Idempotente.
 * @returns {{ keepFrom: string, changes: number, repaired: number }}
 */
export function runAnonymization(db, todayYmd, { calendarDateFromCreatedAt } = {}) {
  const day = String(todayYmd || '').trim();
  const keepFrom = addDaysYmd(day, -GDPR_RETENTION_DAYS);
  if (!keepFrom) return { keepFrom: '', changes: 0, repaired: 0 };

  return db.transaction(() => {
    const sqlChanges = db
      .prepare(
        `
        UPDATE checkins
        SET
          phone = NULL,
          email = NULL,
          guest_name = NULL,
          coupon_token = NULL,
          coupon_sent_at = NULL,
          anonymized_at = datetime('now')
        WHERE anonymized_at IS NULL
          AND date(${RETENTION_ANCHOR_SQL}) < date(?)
      `,
      )
      .run(keepFrom).changes;

    const live = db
      .prepare(
        `
        SELECT id, checkout_date, stay_date, created_at
        FROM checkins
        WHERE anonymized_at IS NULL
      `,
      )
      .all();

    const extraIds = [];
    for (const row of live) {
      const anchor = rowAnchorYmd(row, calendarDateFromCreatedAt);
      if (anchor && anchor < keepFrom) extraIds.push(row.id);
    }
    const extraChanges = anonymizeByIds(db, extraIds);

    const repaired = db
      .prepare(
        `
        UPDATE checkins
        SET
          phone = NULL,
          email = NULL,
          guest_name = NULL,
          coupon_token = NULL,
          coupon_sent_at = NULL
        WHERE anonymized_at IS NOT NULL
          AND (
            (phone IS NOT NULL AND TRIM(phone) != '')
            OR (email IS NOT NULL AND TRIM(email) != '')
            OR (guest_name IS NOT NULL AND TRIM(guest_name) != '')
            OR (coupon_token IS NOT NULL AND TRIM(coupon_token) != '')
          )
      `,
      )
      .run().changes;

    return {
      keepFrom,
      changes: sqlChanges + extraChanges,
      repaired,
    };
  })();
}
