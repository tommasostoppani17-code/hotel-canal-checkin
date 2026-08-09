/** Report email per Payel — stesso linguaggio visuale della welcome ospiti */

function csvEscape(value) {
  const raw = value == null ? '' : String(value);
  if (/[",\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanCell(value) {
  return String(value ?? '')
    .replace(/[\n\r,]/g, ' ')
    .trim();
}

function publicBaseUrl() {
  return (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function publicAssetUrl(...parts) {
  const rel = parts
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `${publicBaseUrl()}/${rel}`;
}

const C = '#164E5B';
const BOX = '#E9EEF0';
const IVORY = '#F8F6F1';
const BRASS = '#B79A63';
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const BODY = "'EB Garamond',Georgia,'Times New Roman',serif";
const SANS =
  "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO =
  "ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";
const bodyStyle = `font-family:${BODY};font-style:italic;font-size:16.5px;line-height:1.7;font-weight:400`;
const labelStyle = `font-family:${SANS};font-size:11.5px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8A949C !important`;

function sectionTitle(label) {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 14px;border-bottom:1px solid rgba(22,78,91,0.14);">
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <div style="font-family:${SERIF};font-size:16.5px;font-weight:700;color:${C} !important;letter-spacing:0.1em;text-transform:uppercase;line-height:1.2;">${label}</div>
                  </td>
                </tr>
              </table>`;
}

function th(label, align = 'left') {
  return `<th align="${align}" style="background-color:${BOX};color:${C};font-family:${SANS};font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:0.08em;text-align:${align};padding:12px 10px;">${label}</th>`;
}

function reportShell({ title, hotelName, eyebrow, preheader, bodyHtml }) {
  const hero = escapeHtml(publicAssetUrl('email', 'hero-venice.jpg'));
  return `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(title)}</title>
  <style type="text/css">
    :root { color-scheme: light only; }
    img { display: block; max-width: 100%; height: auto; border: 0; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${IVORY} !important;color:#1D1D1F !important;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${IVORY};">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${IVORY} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" style="padding:28px 12px;background-color:${IVORY} !important;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:500px;background-color:#FFFFFF !important;border-radius:28px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td style="padding:24px 24px 0;background-color:#FFFFFF !important;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;border-radius:20px;overflow:hidden;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${BOX};border-radius:20px;">
                    <img src="${hero}" width="452" alt="${escapeHtml(hotelName)}" style="display:block;width:100%;max-width:452px;height:auto;border:0;">
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="padding:4px 0 20px 0;border-bottom:1px solid #E8E4DC;">
                    <div style="font-family:${SERIF};font-size:28px;font-weight:700;color:${C} !important;letter-spacing:0.06em;line-height:1.15;text-transform:uppercase;">
                      ${escapeHtml(hotelName)}
                    </div>
                    <div style="font-family:${SANS};font-size:10.5px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${BRASS} !important;margin-top:10px;">
                      ${escapeHtml(eyebrow)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 40px;background-color:#FFFFFF !important;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function closingFooter(hotelName, note) {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E8E4DC;margin-top:8px;">
                <tr>
                  <td align="center" style="padding:22px 0 0;text-align:center;">
                    <p style="${bodyStyle};color:#5C6670 !important;margin:0 0 14px;font-size:15px;">
                      ${note}
                    </p>
                    <div style="font-family:${BODY};font-style:italic;font-size:17px;font-weight:500;color:${C} !important;letter-spacing:0.01em;line-height:1.55;margin:0 0 10px;">
                      Grazie per il lavoro in reception.
                    </div>
                    <div style="font-family:${SANS};font-size:11.5px;font-weight:600;color:${BRASS} !important;text-transform:uppercase;letter-spacing:0.14em;line-height:1.55;">
                      La Direzione<br>${escapeHtml(hotelName)}
                    </div>
                  </td>
                </tr>
              </table>`;
}

/** Coupon Trattoria: receptionist valorizzato (non placeholder RECEPTION). */
export function hasRestaurantCoupon(row) {
  const staff = String(row?.receptionist || '').trim();
  if (!staff) return false;
  if (staff.toUpperCase() === 'RECEPTION') return false;
  return true;
}

export function buildCsv(rows) {
  const header =
    'Numero Stanza,Nome Capogruppo,Numero Telefono,Email,Receptionist Assistente,Numero Ospiti (Pax),Coupon Ristorante Riscatto,Data/Ora';
  const lines = rows.map((row) => {
    const coupon = hasRestaurantCoupon(row) ? 'SI' : 'NO';
    return [
      csvEscape(row.room_number || '—'),
      csvEscape(row.guest_name || '—'),
      csvEscape(row.phone),
      csvEscape(row.email || '—'),
      csvEscape(row.receptionist || 'RECEPTION'),
      csvEscape(row.guests_count ?? '2'),
      csvEscape(coupon),
      csvEscape(row.created_at),
    ].join(',');
  });
  return `\uFEFF${[header, ...lines].join('\n')}\n`;
}

export function formatRomeDate(date = new Date()) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function voucherPill(yes) {
  if (yes) {
    return `<span style="display:inline-block;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#FFFFFF !important;background-color:${C};border-radius:999px;padding:5px 10px;">Sì</span>`;
  }
  return `<span style="display:inline-block;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${C} !important;background-color:${IVORY};border:1px solid rgba(22,78,91,0.18);border-radius:999px;padding:5px 10px;">No</span>`;
}

function buildDailyTableRows(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="5" style="padding:22px 12px;border-bottom:1px solid #E8E4DC;color:#8A949C;text-align:center;font-family:${BODY};font-style:italic;font-size:15px;">
          Nessun contatto in questa giornata
        </td>
      </tr>
    `;
  }

  return rows
    .map((row) => {
      const room = cleanCell(row.room_number);
      const name = cleanCell(row.guest_name);
      const email = cleanCell(row.email);
      const phone = cleanCell(row.phone);
      const staff = cleanCell(row.receptionist) || '—';
      const coupon = hasRestaurantCoupon(row);

      return `
        <tr>
          <td style="padding:16px 10px;border-bottom:1px solid #E8E4DC;font-family:${SERIF};font-weight:700;font-size:17px;color:${C} !important;vertical-align:top;">
            ${escapeHtml(room || '—')}
          </td>
          <td style="padding:16px 10px;border-bottom:1px solid #E8E4DC;vertical-align:top;">
            <div style="font-family:${SANS};font-size:13px;font-weight:700;color:#1D1D1F !important;text-transform:uppercase;letter-spacing:0.03em;">
              ${escapeHtml(name || 'NON SPECIFICATO')}
            </div>
            <div style="font-family:${BODY};font-style:italic;font-size:13px;color:#6B7280 !important;margin-top:3px;">
              ${escapeHtml(email || '—')}
            </div>
          </td>
          <td style="padding:16px 10px;border-bottom:1px solid #E8E4DC;font-family:${MONO};font-size:12.5px;font-weight:600;color:#1D1D1F !important;vertical-align:top;">
            ${escapeHtml(phone)}
          </td>
          <td align="center" style="padding:16px 8px;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:10.5px;font-weight:700;color:${BRASS} !important;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;">
            ${escapeHtml(staff)}
          </td>
          <td align="center" style="padding:16px 8px;border-bottom:1px solid #E8E4DC;vertical-align:top;">
            ${voucherPill(coupon)}
          </td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Report notturno Payel: stesso calore della welcome (avorio, ottone, serif),
 * hero remoto leggero, KPI + registro + WhatsApp; CSV in allegato.
 */
export function buildReportEmail({ hotelName, count, dateLabel, rows = [] }) {
  const subject = `Hotel Canal · Ciao Payel · ${dateLabel} · ${count} ospiti`;
  const couponCount = rows.filter(hasRestaurantCoupon).length;

  const listaSoloNumeri = rows
    .map((row) => row.phone)
    .filter(Boolean)
    .join(', ');

  const text = [
    `Ciao Payel,`,
    ``,
    `Buonanotte — ecco il resoconto Fast Check-in di ${hotelName}.`,
    `Data: ${dateLabel}`,
    `Nuovi ospiti: ${count}`,
    `Coupon Trattoria: ${couponCount}`,
    ``,
    `Numeri WhatsApp:`,
    listaSoloNumeri || '—',
    ``,
    `Il file Excel (.CSV) è allegato.`,
    ``,
    `Grazie per il lavoro in reception.`,
    `La Direzione — ${hotelName}`,
  ].join('\n');

  const bodyHtml = `
              <p style="font-family:${BODY};font-style:italic;font-size:24px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;">
                Ciao Payel,
              </p>
              <p style="${bodyStyle};color:#4A5560 !important;margin:0 0 28px;">
                Buonanotte. Qui sotto trovi il registro caldo della giornata
                <span style="white-space:nowrap;">(${escapeHtml(dateLabel)})</span>:
                chi è arrivato, chi ha lo sconto in Trattoria, e i numeri pronti per WhatsApp.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 32px;">
                <tr>
                  <td width="50%" valign="top" style="padding:0 6px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BOX} !important;border-radius:20px;">
                      <tr>
                        <td align="center" style="padding:22px 12px;">
                          <div style="${labelStyle};margin:0 0 10px;color:#7A8690 !important;">Nuovi ospiti</div>
                          <div style="font-family:${SERIF};font-size:40px;font-weight:700;color:${C} !important;line-height:1;letter-spacing:0.02em;">${count}</div>
                          <div style="font-family:${BODY};font-style:italic;font-size:13px;color:#6B7280 !important;margin-top:8px;">via QR reception</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding:0 0 0 6px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;border:1.5px solid ${BRASS};border-radius:20px;">
                      <tr>
                        <td align="center" style="padding:22px 12px;">
                          <div style="${labelStyle};margin:0 0 10px;color:${BRASS} !important;">Coupon Trattoria</div>
                          <div style="font-family:${SERIF};font-size:40px;font-weight:700;color:${C} !important;line-height:1;letter-spacing:0.02em;">${couponCount}</div>
                          <div style="font-family:${BODY};font-style:italic;font-size:13px;color:#6B7280 !important;margin-top:8px;">sconto attivato</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${sectionTitle('Registro della sera')}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:0 0 34px;font-size:13px;">
                <thead>
                  <tr>
                    ${th('Stanza')}
                    ${th('Ospite')}
                    ${th('Telefono')}
                    ${th('Staff', 'center')}
                    ${th('Voucher', 'center')}
                  </tr>
                </thead>
                <tbody>
                  ${buildDailyTableRows(rows)}
                </tbody>
              </table>

              ${sectionTitle('Copia rapida WhatsApp')}
              <p style="${bodyStyle};color:#5C6670 !important;margin:0 0 12px;font-size:15.5px;">
                Un tap, seleziona, copia — tutti i numeri della notte:
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background-color:${IVORY} !important;border:1.5px solid ${C};border-radius:18px;">
                <tr>
                  <td style="padding:18px 16px;font-family:${MONO};font-size:12.5px;color:${C} !important;word-break:break-all;line-height:1.6;font-weight:600;">
                    ${escapeHtml(listaSoloNumeri || '—')}
                  </td>
                </tr>
              </table>

              ${closingFooter(
                hotelName,
                'L\'archivio completo in <strong style="color:' +
                  C +
                  ';font-style:normal;">Excel (.CSV)</strong> è in allegato — pronto da aprire e stampare.',
              )}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Santa Croce 553 · Venezia · Report Payel',
    preheader: `Ciao Payel — ${count} ospiti, ${couponCount} coupon · ${dateLabel}`,
    bodyHtml,
  });

  return { subject, text, html };
}

export function buildMonthlyStaffEmail({
  hotelName,
  monthLabel,
  year,
  totals,
  ranking,
}) {
  const subject = `Hotel Canal · Report Payel · ${monthLabel} ${year}`;
  const totaleMese = Number(totals?.totale_mese || 0);
  const totaleCoupon = Number(totals?.totale_coupon || 0);

  const rowsHtml = ranking
    .map((row, index) => {
      const bg =
        index === 0 ? `background-color:rgba(183,154,99,0.14);` : '';
      const pos = `${index + 1}`;
      return `
        <tr>
          <td style="padding:14px 10px;border-bottom:1px solid #E8E4DC;font-family:${SERIF};font-weight:700;font-size:16px;color:${C};${bg}">${pos}</td>
          <td style="padding:14px 10px;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:13px;text-transform:uppercase;font-weight:600;letter-spacing:0.04em;${bg}">${escapeHtml(row.receptionist)}</td>
          <td style="padding:14px 10px;border-bottom:1px solid #E8E4DC;text-align:center;font-family:${SERIF};font-weight:700;font-size:16px;color:${C};${bg}">${row.totale_registrati}</td>
          <td style="padding:14px 10px;border-bottom:1px solid #E8E4DC;text-align:center;font-family:${SANS};font-weight:600;color:${C};${bg}">${row.coupon_emessi}</td>
        </tr>
      `;
    })
    .join('');

  const csv = `\uFEFFClassifica Staff,Ospiti Registrati,Coupon Emessi\n${ranking
    .map(
      (row, i) =>
        `${i + 1}. ${csvEscape(row.receptionist)},${row.totale_registrati},${row.coupon_emessi}`,
    )
    .join('\n')}\n`;

  const bodyHtml = `
              <p style="font-family:${BODY};font-style:italic;font-size:22px;font-weight:500;color:${C} !important;margin:0 0 12px;letter-spacing:0.01em;text-align:left;">
                Ciao Payel,
              </p>
              <p style="${bodyStyle};color:#4A5560 !important;margin:0 0 28px;text-align:left;">
                Analisi conversioni reception — ${escapeHtml(monthLabel)} ${year}.
                Anagrafiche, coupon emessi e classifica staff.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 36px;">
                <tr>
                  <td width="50%" valign="top" style="padding:0 6px 0 0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:18px;">
                      <tr>
                        <td align="center" style="padding:22px 12px;">
                          <div style="${labelStyle};margin:0 0 10px;">Anagrafiche</div>
                          <div style="font-family:${SERIF};font-size:34px;font-weight:700;color:${C} !important;line-height:1;">${totaleMese}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding:0 0 0 6px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:18px;">
                      <tr>
                        <td align="center" style="padding:22px 12px;">
                          <div style="${labelStyle};margin:0 0 10px;">Coupon</div>
                          <div style="font-family:${SERIF};font-size:34px;font-weight:700;color:${C} !important;line-height:1;">${totaleCoupon}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${sectionTitle('Classifica performance')}
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13.5px;margin:0 0 8px;">
                <thead>
                  <tr>
                    ${th('Pos.')}
                    ${th('Receptionist')}
                    ${th('Contatti', 'center')}
                    ${th('Coupon', 'center')}
                  </tr>
                </thead>
                <tbody>${
                  rowsHtml ||
                  `<tr><td colspan="4" style="padding:18px;text-align:center;color:#8A949C;font-family:${BODY};font-style:italic;">Nessun dato</td></tr>`
                }</tbody>
              </table>

              ${closingFooter(
                hotelName,
                'CSV di audit mensile in allegato.',
              )}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Santa Croce 553 · Venezia · Performance Payel',
    preheader: `${monthLabel} ${year} · ${totaleMese} anagrafiche · ${totaleCoupon} coupon`,
    bodyHtml,
  });

  const text = [
    `Ciao Payel,`,
    ``,
    subject,
    ``,
    `Anagrafiche: ${totaleMese}`,
    `Coupon: ${totaleCoupon}`,
    ``,
    ...ranking.map(
      (row, i) =>
        `${i + 1}. ${row.receptionist} — ${row.totale_registrati} contatti, ${row.coupon_emessi} coupon`,
    ),
    ``,
    `La Direzione — ${hotelName}`,
  ].join('\n');

  return { subject, text, html, csv };
}
