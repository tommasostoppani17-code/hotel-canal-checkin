/** Report email per Payel — stile Hotel Canal, leggibile su telefono */

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

function emailAssetBaseUrl() {
  const custom = String(process.env.EMAIL_ASSET_BASE || '')
    .trim()
    .replace(/\/$/, '');
  if (custom) return custom;
  const mode = String(process.env.EMAIL_ASSETS_CDN || 'jsdelivr')
    .trim()
    .toLowerCase();
  if (mode === 'render' || mode === 'public' || mode === 'off') {
    return publicBaseUrl();
  }
  return 'https://cdn.jsdelivr.net/gh/tommasostoppani17-code/hotel-canal-checkin@main/public';
}

function publicAssetUrl(...parts) {
  const rel = parts
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `${emailAssetBaseUrl()}/${rel}`;
}

const C = '#164E5B';
const BOX = '#E9EEF0';
const WHITE = '#FFFFFF';
const BRASS = '#6E868F';
const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
const BODY = "'EB Garamond',Georgia,'Times New Roman',serif";
const SANS =
  "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const bodyStyle = `font-family:${BODY};font-style:italic;font-size:14px;line-height:1.6;font-weight:400`;
const labelStyle = `font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C !important`;

function sectionTitle(label) {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 12px;border-bottom:1px solid rgba(22,78,91,0.12);">
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <div style="font-family:${SANS};font-size:11px;font-weight:700;color:${C} !important;letter-spacing:0.12em;text-transform:uppercase;line-height:1.2;">${label}</div>
                  </td>
                </tr>
              </table>`;
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  <style type="text/css">
    :root { color-scheme: light only; }
    img { display: block; max-width: 100%; height: auto; border: 0; }
    .utility-textarea {
      width: 100% !important;
      box-sizing: border-box !important;
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${WHITE} !important;color:#1D1D1F !important;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td style="padding:20px 22px 0;background-color:#FFFFFF !important;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${BOX};border-radius:16px;">
                    <img src="${hero}" width="452" alt="${escapeHtml(hotelName)}" style="display:block;width:100%;max-width:452px;height:auto;border:0;border-radius:16px;">
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;">
                <tr>
                  <td align="center" style="padding:2px 0 18px 0;border-bottom:1px solid #E8E4DC;">
                    <div style="font-family:${SERIF};font-size:20px;font-weight:700;letter-spacing:0.1em;color:${C} !important;text-transform:uppercase;line-height:1.2;">
                      ${escapeHtml(hotelName)}
                    </div>
                    <div style="font-family:${SANS};font-size:9px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:${BRASS} !important;margin-top:8px;">
                      ${escapeHtml(eyebrow)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 22px 40px;background-color:#FFFFFF !important;">
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E8E4DC;margin-top:12px;">
                <tr>
                  <td align="center" style="padding:28px 0 0;text-align:center;">
                    <p style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;font-size:13px;">
                      ${note}
                    </p>
                    <div style="width:28px;height:1px;line-height:1px;font-size:1px;background-color:${BRASS};margin:0 auto 14px;">&nbsp;</div>
                    <div style="font-family:${BODY};font-style:italic;font-size:14.5px;font-weight:500;color:${C} !important;letter-spacing:0.02em;line-height:1.45;margin:0 0 6px;">
                      La Direzione &amp; lo Staff
                    </div>
                    <div style="font-family:${SERIF};font-style:italic;font-size:12px;font-weight:600;color:${BRASS} !important;letter-spacing:0.05em;line-height:1.4;">
                      ${escapeHtml(hotelName)}
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
    'Numero Stanza,Nome Capogruppo,Numero Telefono,Email,Receptionist Assistente,Numero Ospiti (Pax),Voucher Ristorante,Data/Ora';
  const lines = rows.map((row) => {
    const coupon = hasRestaurantCoupon(row) ? 'EMESSO' : 'NON EMESSO';
    return [
      csvEscape(row.room_number || '-'),
      csvEscape(row.guest_name || '-'),
      csvEscape(row.phone),
      csvEscape(row.email || '-'),
      csvEscape(row.receptionist || 'RECEPTION'),
      csvEscape(row.guests_count ?? '2'),
      csvEscape(coupon),
      csvEscape(row.created_at),
    ].join(',');
  });
  // BOM + sep=, so Excel (IT/EU) opens columns correctly on double-click
  return `\uFEFFsep=,\n${[header, ...lines].join('\n')}\n`;
}

export function formatRomeDate(date = new Date()) {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Righe persona: stanza a sinistra, dati a destra.
 * Nessuna card/riquadro — solo divider tra ospiti. nowrap per non spezzare su mobile.
 */
function buildDailyGuestRows(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="2" style="padding:18px 0;border-bottom:1px solid #E8E4DC;color:#8E8E93;text-align:center;font-size:13px;font-family:${BODY};font-style:italic;">
          Nessuna registrazione in questo periodo
        </td>
      </tr>
    `;
  }

  return rows
    .map((row, index) => {
      const room = cleanCell(row.room_number) || '-';
      const name = cleanCell(row.guest_name) || 'Ospite';
      const email = cleanCell(row.email);
      const phone = cleanCell(row.phone) || '-';
      const staff = cleanCell(row.receptionist) || '-';
      const pax = cleanCell(row.guests_count ?? '2') || '2';
      const haVoucher = hasRestaurantCoupon(row);
      const offer = haVoucher ? 'Voucher sì' : 'Voucher no';
      const offerColor = haVoucher ? C : '#8A949C';
      const border = index === rows.length - 1 ? '0' : '1px solid #E8E4DC';

      return `
        <tr>
          <td width="48" valign="top" style="width:48px;max-width:48px;padding:18px 12px 18px 0;border-bottom:${border};font-family:${SERIF};font-size:15px;font-weight:700;color:${C} !important;line-height:1.25;white-space:nowrap;vertical-align:top;">
            ${escapeHtml(room)}
          </td>
          <td valign="top" style="padding:18px 0;border-bottom:${border};vertical-align:top;">
            <div style="font-family:${SANS};font-size:12.5px;font-weight:600;color:#1D1D1F !important;letter-spacing:0.01em;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;">
              ${escapeHtml(name)}
            </div>
            <div style="font-family:${SANS};font-size:12px;font-weight:500;color:#334155 !important;line-height:1.4;margin-top:5px;white-space:nowrap;">
              ${escapeHtml(phone)}
            </div>
            ${
              email
                ? `<div style="font-family:${SANS};font-size:11px;color:#8A949C !important;line-height:1.4;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;">${escapeHtml(email)}</div>`
                : ''
            }
            <div style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.03em;color:#5C6670 !important;line-height:1.4;margin-top:8px;white-space:nowrap;">
              ${escapeHtml(staff)}&nbsp;&nbsp;·&nbsp;&nbsp;${escapeHtml(pax)} pax&nbsp;&nbsp;·&nbsp;&nbsp;<span style="color:${offerColor} !important;">${offer}</span>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Report notturno Payel: saluto professionale, lista a righe, CSV allegato.
 */
export function buildReportEmail({ hotelName, count, dateLabel, rows = [] }) {
  const subject = `Hotel Canal · Report giornaliero · ${dateLabel}`;
  const couponCount = rows.filter(hasRestaurantCoupon).length;
  const reportPreheader = `Gentile Payel, registro check-in del ${dateLabel}: ${count} registrazioni. CSV allegato.`;

  const listaSoloNumeri = rows
    .map((row) => row.phone)
    .filter(Boolean)
    .join(', ');

  const text = [
    `Gentile Payel,`,
    ``,
    `in allegato il registro check-in di ${hotelName} del ${dateLabel}.`,
    `Registrazioni: ${count}`,
    `Voucher ristorante: ${couponCount}`,
    ``,
    `Numeri WhatsApp:`,
    listaSoloNumeri || '-',
    ``,
    `Cordiali saluti,`,
    `La Direzione — ${hotelName}`,
  ].join('\n');

  const bodyHtml = `
              <p style="font-family:${BODY};font-style:italic;font-size:15px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;line-height:1.4;">
                Gentile Payel,
              </p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 8px;text-align:left;">
                in allegato trovi il registro check-in del <strong style="color:${C} !important;font-weight:600;font-style:italic;">${escapeHtml(dateLabel)}</strong>:
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${count}</strong> registrazioni${
                  couponCount
                    ? ` e <strong style="color:${C} !important;font-weight:600;font-style:italic;">${couponCount}</strong> voucher ristorante`
                    : ''
                }.
                Il file <strong style="color:${C} !important;font-weight:600;font-style:italic;">.CSV</strong> è pronto per Excel.
              </p>

              ${sectionTitle('Presenze')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 12px;border-top:1px solid #E8E4DC;">
                ${buildDailyGuestRows(rows)}
              </table>

              ${sectionTitle('Numeri WhatsApp')}
              <p style="font-family:${SANS};font-size:11px;font-weight:500;color:#8A949C !important;margin:0 0 10px;line-height:1.4;">
                Tieni premuto per copiare
              </p>
              <textarea class="utility-textarea" readonly rows="3" style="display:block;width:100%;max-width:100%;box-sizing:border-box;margin:0 0 32px;padding:14px 14px;background-color:${BOX} !important;border:1px solid #E2E6E8;border-radius:12px;font-family:${SANS};font-size:12px;line-height:1.55;color:#1D1D1F !important;-webkit-user-select:text;user-select:text;resize:none;">${escapeHtml(listaSoloNumeri || '-')}</textarea>

              ${closingFooter(hotelName, 'Grazie per il controllo in reception.')}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Santa Croce 553 · Venezia',
    preheader: reportPreheader,
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
  const subject = `Hotel Canal · Report mensile · ${monthLabel} ${year}`;
  const totaleMese = Number(totals?.totale_mese || 0);
  const totaleCoupon = Number(totals?.totale_coupon || 0);

  const rowsHtml = ranking
    .map((row, index) => {
      const bg =
        index === 0 ? `background-color:rgba(110,134,143,0.14);` : '';
      const pos = `${index + 1}`;
      const border =
        index === ranking.length - 1 ? '0' : '1px solid #E8E4DC';
      return `
        <tr>
          <td width="36" style="width:36px;padding:16px 8px 16px 0;border-bottom:${border};font-family:${SERIF};font-weight:700;font-size:14px;color:${C};white-space:nowrap;${bg}">${pos}</td>
          <td style="padding:16px 8px;border-bottom:${border};font-family:${SANS};font-size:12.5px;font-weight:600;letter-spacing:0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${bg}">${escapeHtml(row.receptionist)}</td>
          <td align="right" style="padding:16px 0 16px 8px;border-bottom:${border};text-align:right;font-family:${SERIF};font-weight:700;font-size:14px;color:${C};white-space:nowrap;${bg}">${row.totale_registrati}</td>
          <td align="right" style="padding:16px 0 16px 8px;border-bottom:${border};text-align:right;font-family:${SANS};font-weight:600;font-size:12.5px;color:${C};white-space:nowrap;${bg}">${row.coupon_emessi}</td>
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
              <p style="font-family:${BODY};font-style:italic;font-size:15px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;line-height:1.4;">
                Gentile Payel,
              </p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 8px;text-align:left;">
                riepilogo performance reception di <strong style="color:${C} !important;font-weight:600;font-style:italic;">${escapeHtml(monthLabel)} ${escapeHtml(String(year))}</strong>:
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${totaleMese}</strong> registrazioni,
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${totaleCoupon}</strong> voucher.
              </p>

              ${sectionTitle('Classifica staff')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 12px;border-top:1px solid #E8E4DC;">
                <tr>
                  <td width="36" style="padding:12px 8px 12px 0;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">#</td>
                  <td style="padding:12px 8px;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">Reception</td>
                  <td align="right" style="padding:12px 0 12px 8px;border-bottom:1px solid #E8E4DC;text-align:right;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">Ospiti</td>
                  <td align="right" style="padding:12px 0 12px 8px;border-bottom:1px solid #E8E4DC;text-align:right;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">Voucher</td>
                </tr>
                ${rowsHtml}
              </table>

              ${closingFooter(hotelName, 'CSV di riepilogo mensile in allegato.')}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Santa Croce 553 · Venezia',
    preheader: `${monthLabel} ${year} · ${totaleMese} registrazioni · ${totaleCoupon} voucher`,
    bodyHtml,
  });

  const text = [
    `Gentile Payel,`,
    ``,
    `riepilogo ${hotelName} — ${monthLabel} ${year}.`,
    `Registrazioni: ${totaleMese}`,
    `Voucher: ${totaleCoupon}`,
    ``,
    ...ranking.map(
      (row, i) =>
        `${i + 1}. ${row.receptionist} — ${row.totale_registrati} ospiti, ${row.coupon_emessi} voucher`,
    ),
    ``,
    `Cordiali saluti,`,
    `La Direzione — ${hotelName}`,
  ].join('\n');

  return { subject, text, html, csv };
}
