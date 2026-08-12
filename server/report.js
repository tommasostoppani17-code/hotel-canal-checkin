/** Report email per Payel — stile Hotel Canal, leggibile su telefono */

import { emailLightModeHead, emailLightBodyAttrs } from './email-light.js';

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
const CINZEL = "'Cinzel',Georgia,'Times New Roman',serif";
const bodyStyle = `font-family:${BODY};font-style:italic;font-size:14.5px;line-height:1.55;font-weight:400`;
const labelStyle = `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important`;

function sectionTitle(label) {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 12px;border-bottom:1px solid rgba(22,78,91,0.14);">
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <div style="font-family:${CINZEL};font-size:13px;font-weight:700;color:${C} !important;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;">${label}</div>
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
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  ${emailLightModeHead({
    canal: C,
    box: BOX,
    extraCss: `
    img { display: block; max-width: 100%; height: auto; border: 0; }
    .utility-textarea {
      width: 100% !important;
      box-sizing: border-box !important;
      -webkit-user-select: text !important;
      user-select: text !important;
      background-color: ${BOX} !important;
      color: #1D1D1F !important;
    }
    `,
  })}
</head>
<body ${emailLightBodyAttrs()}>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" class="email-bg force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" class="force-white" bgcolor="${WHITE}" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td class="force-white" bgcolor="#FFFFFF" style="padding:20px 22px 0;background-color:#FFFFFF !important;">
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
                    <div style="font-family:${SERIF};font-size:24px;font-weight:700;letter-spacing:0.12em;color:${C} !important;text-transform:uppercase;line-height:1.15;mso-line-height-rule:exactly;">
                      ${escapeHtml(hotelName)}
                    </div>
                    <div style="font-family:${SANS};font-size:9.5px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:${BRASS} !important;margin-top:8px;">
                      ${escapeHtml(eyebrow)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-content force-white" bgcolor="#FFFFFF" style="padding:8px 22px 40px;background-color:#FFFFFF !important;">
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

function closingFooter(hotelName, note, signOff = 'La Direzione &amp; lo Staff', stickersHtml = '') {
  return `
              ${stickersHtml}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E8E4DC;margin-top:12px;">
                <tr>
                  <td align="center" style="padding:28px 0 0;text-align:center;">
                    <p style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;font-size:13px;">
                      ${note}
                    </p>
                    <div style="width:28px;height:1px;line-height:1px;font-size:1px;background-color:${BRASS};margin:0 auto 14px;">&nbsp;</div>
                    <div style="font-family:${BODY};font-style:italic;font-size:17px;font-weight:500;color:${C} !important;letter-spacing:0.02em;line-height:1.45;margin:0 0 6px;">
                      ${signOff}
                    </div>
                    <div style="font-family:${SERIF};font-style:italic;font-size:13px;font-weight:600;color:${BRASS} !important;letter-spacing:0.06em;line-height:1.4;">
                      ${escapeHtml(hotelName)}
                    </div>
                  </td>
                </tr>
              </table>`;
}

function veniceStickersRow() {
  const assets = [
    ['stickers', 'mask.png'],
    ['icons', 'gondola.png'],
    ['stickers', 'basilica.png'],
    ['stickers', 'mooring.png'],
  ];
  const cells = assets
    .map(([folder, file]) => {
      const src = escapeHtml(publicAssetUrl('email', folder, file));
      return `<td align="center" style="padding:0 6px;line-height:0;font-size:0;">
                      <img src="${src}" width="36" height="36" alt="" style="display:block;width:36px;height:36px;border:0;">
                    </td>`;
    })
    .join('');
  return `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:8px auto 24px;">
                <tr>
                  ${cells}
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
    'Numero Stanza,Nome Capogruppo,Numero Telefono,Email,Receptionist Assistente,Numero Ospiti (Pax),Voucher Ristorante,Prenotazione Tavolo,Data/Ora';
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
      csvEscape(row.table_booking || '-'),
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
      const tableTime = cleanCell(row.table_booking);
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
              ${escapeHtml(staff)}&nbsp;&nbsp;·&nbsp;&nbsp;${escapeHtml(pax)} pax&nbsp;&nbsp;·&nbsp;&nbsp;<span style="color:${offerColor} !important;">${offer}</span>${
                tableTime
                  ? `&nbsp;&nbsp;·&nbsp;&nbsp;<span style="color:${C} !important;">Tavolo ${escapeHtml(tableTime)}</span>`
                  : ''
              }
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Report notturno Payel: un solo saluto, un solo blocco di testo, poi i dati.
 */
export function buildReportEmail({ hotelName, count, dateLabel, rows = [] }) {
  const subject = `🛶 Report contatti · ${dateLabel}`;
  const couponCount = rows.filter(hasRestaurantCoupon).length;
  const statsLine = couponCount
    ? `${count} check-in, ${couponCount} voucher ristorante`
    : `${count} check-in`;
  const reportPreheader = `Gentile Payel — report contatti del ${dateLabel}: ${statsLine}. CSV in allegato.`;

  const listaSoloNumeri = rows
    .map((row) => row.phone)
    .filter(Boolean)
    .join(', ');

  const introPlain = `in allegato il report contatti di oggi (${dateLabel}): ${statsLine}. Il CSV è pronto per Excel.`;

  const text = [
    `Gentile Payel,`,
    ``,
    introPlain,
    ``,
    `Numeri WhatsApp:`,
    listaSoloNumeri || '-',
    ``,
    `Front Desk — ${hotelName}`,
  ].join('\n');

  const bodyHtml = `
              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;">
                Gentile Payel,
              </p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 28px;text-align:left;">
                in allegato il report contatti di oggi
                (<strong style="color:${C} !important;font-weight:600;font-style:italic;">${escapeHtml(dateLabel)}</strong>):
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${count}</strong> check-in${
                  couponCount
                    ? `, <strong style="color:${C} !important;font-weight:600;font-style:italic;">${couponCount}</strong> voucher ristorante`
                    : ''
                }.
                Il CSV &egrave; pronto per Excel.
              </p>

              ${sectionTitle('Presenze')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 12px;border-top:1px solid #E8E4DC;">
                ${buildDailyGuestRows(rows)}
              </table>

              ${sectionTitle('Numeri WhatsApp')}
              <p style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#8A949C !important;margin:0 0 10px;line-height:1.4;">
                Tieni premuto per copiare
              </p>
              <textarea class="utility-textarea" readonly rows="3" style="display:block;width:100%;max-width:100%;box-sizing:border-box;margin:0 0 28px;padding:14px 14px;background-color:${BOX} !important;border:1px solid #E2E6E8;border-radius:12px;font-family:${SANS};font-size:12px;line-height:1.55;color:#1D1D1F !important;-webkit-user-select:text;user-select:text;resize:none;">${escapeHtml(listaSoloNumeri || '-')}</textarea>

              ${closingFooter(
                hotelName,
                'Grazie e a presto.',
                'Front Desk',
                veniceStickersRow(),
              )}
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
  const period = `${monthLabel} ${year}`;
  const introPlain = `riepilogo di ${period}: ${totaleMese} check-in, ${totaleCoupon} voucher ristorante. Qui sotto la classifica staff: i check-in effettuati da ciascun receptionist e, a fianco, quanti ospiti hanno preso il voucher della Trattoria (referral).`;

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

  const csv = `\uFEFFReceptionist,Check-in,Voucher ristorante (referral)\n${ranking
    .map(
      (row) =>
        `${csvEscape(row.receptionist)},${row.totale_registrati},${row.coupon_emessi}`,
    )
    .join('\n')}\n`;

  const bodyHtml = `
              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;">
                Gentile Payel,
              </p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 28px;text-align:left;">
                riepilogo di <strong style="color:${C} !important;font-weight:600;font-style:italic;">${escapeHtml(period)}</strong>:
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${totaleMese}</strong> check-in,
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${totaleCoupon}</strong> voucher ristorante.
                Qui sotto la classifica staff: i check-in effettuati da ciascun receptionist e, a fianco, quanti ospiti hanno preso il voucher della Trattoria (referral).
              </p>

              ${sectionTitle('Classifica staff')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 12px;border-top:1px solid #E8E4DC;">
                <tr>
                  <td width="36" style="padding:12px 8px 12px 0;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">#</td>
                  <td style="padding:12px 8px;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">Reception</td>
                  <td align="right" style="padding:12px 0 12px 8px;border-bottom:1px solid #E8E4DC;text-align:right;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8A949C;">Check-in</td>
                  <td align="right" style="padding:12px 0 12px 8px;border-bottom:1px solid #E8E4DC;text-align:right;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8A949C;">Referral</td>
                </tr>
                ${rowsHtml}
              </table>
              <p style="font-family:${SANS};font-size:11px;font-weight:500;color:#8A949C !important;margin:0 0 28px;line-height:1.45;">
                Referral = ospiti che hanno ricevuto il voucher &minus;10% Trattoria alla Terrazza.
              </p>

              ${closingFooter(hotelName, 'CSV di riepilogo mensile in allegato.')}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Santa Croce 553 · Venezia',
    preheader: `Gentile Payel — ${period}: ${totaleMese} check-in, ${totaleCoupon} voucher ristorante`,
    bodyHtml,
  });

  const text = [
    `Gentile Payel,`,
    ``,
    introPlain,
    ``,
    ...ranking.map(
      (row, i) =>
        `${i + 1}. ${row.receptionist} — ${row.totale_registrati} check-in, ${row.coupon_emessi} referral`,
    ),
    ``,
    `La Direzione — ${hotelName}`,
  ].join('\n');

  return { subject, text, html, csv };
}

/**
 * Alert richiesta tavolo — stessa qualità tipografica/foto della welcome ospite.
 */
export function buildTableBookingEmail({ hotelName, row }) {
  const rawTime = String(row?.table_booking || '').trim();
  const timeLabel =
    !rawTime || /REQUESTED|CALL|TAVOLO/i.test(rawTime)
      ? 'Da confermare'
      : rawTime;
  const timeDisplay =
    timeLabel === 'Da confermare' ? 'Da confermare' : timeLabel;
  const timeHeadline =
    timeLabel === 'Da confermare' ? 'Da confermare' : `Ore ${timeLabel}`;
  const room = cleanCell(row?.room_number) || '-';
  const phone = cleanCell(row?.phone) || '-';
  const phoneTel = String(row?.phone || '').replace(/[\s\-()]/g, '');
  const name = cleanCell(row?.guest_name) || 'Ospite';
  const pax = row?.guests_count ?? 2;
  const staff = cleanCell(row?.receptionist) || '-';
  const hasCoupon = Boolean(row?.coupon_sent_at || row?.coupon_token);
  const hotel = cleanCell(hotelName) || 'Hotel Canal';

  const subject = `Nuova richiesta tavolo · Stanza ${room} · ${timeHeadline}`;
  const preheader = `Buongiorno — stanza ${room}, ${name}, ${timeHeadline}. Chiamare per confermare.`;

  const text = [
    `Buongiorno,`,
    ``,
    `nuova richiesta di tavolo dalla stanza ${room}.`,
    ``,
    `Ospite: ${name}`,
    `Orario: ${timeHeadline}`,
    `Persone: ${pax}`,
    `Telefono: ${phone}`,
    staff && staff !== '-' ? `Receptionist: ${staff}` : null,
    hasCoupon ? `Coupon −10% già inviato all'ospite.` : null,
    ``,
    `Chiamare per confermare la disponibilità.`,
    ``,
    `Il front desk — ${hotel}`,
  ]
    .filter((line) => line != null)
    .join('\n');

  const hero = escapeHtml(publicAssetUrl('email', 'postcard-terrazza.jpg'));
  const dish = escapeHtml(publicAssetUrl('email', 'postcard-dish.jpg'));
  const iconCloche = escapeHtml(publicAssetUrl('email', 'icons', 'cloche.png'));
  const iconWine = escapeHtml(publicAssetUrl('email', 'icons', 'wine.png'));

  const bodyStyle = `font-family:${BODY};font-style:italic;font-size:13px;line-height:1.45;font-weight:400`;
  const labelStyle = `font-family:${SANS};font-size:9.5px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important`;

  const sectionTitle = (label) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 14px;border-bottom:1px solid rgba(22,78,91,0.14);">
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <div class="brand-title" style="font-family:${CINZEL};font-size:12px;font-weight:700;color:${C} !important;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;">${label}</div>
                  </td>
                </tr>
              </table>`;

  const postcard = (src, alt, bottom = 24) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${bottom}px;border-radius:20px;overflow:hidden;border:1px solid #E2E6E8;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${BOX};">
                    <img src="${src}" width="436" alt="${alt}" style="display:block;width:100%;max-width:436px;height:auto;border:0;">
                  </td>
                </tr>
              </table>`;

  const fact = (label, valueHtml) => `
                <tr>
                  <td style="padding:11px 0;border-bottom:1px solid #E8E4DC;">
                    <div style="${labelStyle};margin:0 0 4px;">${label}</div>
                    <div class="text-main" style="font-family:${SERIF};font-size:16px;font-weight:600;color:${C} !important;letter-spacing:0.02em;line-height:1.3;">${valueHtml}</div>
                  </td>
                </tr>`;

  const html = `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:wght@500;600;700&family=DM+Sans:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  ${emailLightModeHead({
    canal: C,
    box: BOX,
    extraCss: `img { display: block; max-width: 100%; height: auto; border: 0; outline: none; }`,
  })}
</head>
<body ${emailLightBodyAttrs()}>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" class="email-bg force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" class="force-white" bgcolor="${WHITE}" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td class="email-content force-white" bgcolor="#FFFFFF" style="padding:20px 22px 36px;background-color:#FFFFFF !important;">

              ${postcard(hero, 'Terrazza sul canale', 18)}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
                <tr>
                  <td align="center" style="padding:2px 0 16px 0;border-bottom:1px solid #E8E4DC;">
                    <div style="font-family:${SERIF};font-size:22px;font-weight:700;letter-spacing:0.1em;color:${C} !important;text-transform:uppercase;line-height:1.15;mso-line-height-rule:exactly;">Trattoria alla Terrazza</div>
                    <div class="brass" style="font-family:${SANS};font-size:9.5px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:${BRASS} !important;margin-top:8px;">Partner · ${escapeHtml(hotel)}</div>
                  </td>
                </tr>
              </table>

              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;">Buongiorno,</p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 28px;text-align:left;">
                nuova richiesta di tavolo dalla
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">stanza ${escapeHtml(room)}</strong>.
                Ospite <strong style="color:${C} !important;font-weight:600;font-style:italic;">${escapeHtml(name)}</strong>,
                per le <strong style="color:${C} !important;font-weight:600;font-style:italic;">${escapeHtml(timeHeadline)}</strong>
                (${escapeHtml(String(pax))} pers.).
                Chiamare per confermare la disponibilit&agrave;.
              </p>

              <table role="presentation" class="room-badge force-box" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;background-color:${BOX} !important;border-radius:16px;">
                <tr>
                  <td align="center" style="padding:20px 14px;">
                    ${
                      iconCloche
                        ? `<img src="${iconCloche}" width="28" height="28" alt="" style="display:inline-block;width:28px;height:28px;border:0;margin:0 0 8px;">`
                        : ''
                    }
                    <span style="font-family:${SANS};font-size:10px;font-weight:600;text-transform:uppercase;color:#7A8690 !important;letter-spacing:0.14em;display:block;margin-bottom:6px;">Orario richiesto</span>
                    <strong class="brand-title" style="font-family:${SERIF};font-size:28px;color:${C} !important;font-weight:700;letter-spacing:0.06em;line-height:1;text-transform:uppercase;">${escapeHtml(timeDisplay)}</strong>
                    <div style="font-family:${SANS};font-size:12px;font-weight:600;color:#7A8690 !important;letter-spacing:0.03em;margin-top:10px;">
                      Stanza ${escapeHtml(room)} · ${escapeHtml(String(pax))} ospiti
                    </div>
                  </td>
                </tr>
              </table>

              ${
                phoneTel
                  ? `
              <a href="tel:${escapeHtml(phoneTel)}" style="display:block;text-align:center;background-color:${C};color:#FFFFFF !important;text-decoration:none;padding:15px;border-radius:14px;font-family:${SANS};font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">
                Chiama ${escapeHtml(name)}
              </a>
              <p style="font-family:${SANS};font-size:12px;font-weight:600;color:${BRASS} !important;text-align:center;margin:0 0 28px;letter-spacing:0.02em;">
                ${escapeHtml(phone)}
              </p>`
                  : `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background-color:${BOX};border-radius:14px;border:1px solid #E2E6E8;">
                <tr>
                  <td style="padding:15px 18px;font-family:${BODY};font-style:italic;font-size:14px;color:#4A5560 !important;line-height:1.45;text-align:center;">
                    Contatto ospite non disponibile — chiedere in reception.
                  </td>
                </tr>
              </table>`
              }

              ${sectionTitle('Dettagli richiesta')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;border-top:1px solid #E8E4DC;">
                ${fact('Ospite', escapeHtml(name))}
                ${fact('Stanza', escapeHtml(room))}
                ${fact(
                  'Telefono',
                  phoneTel
                    ? `<a href="tel:${escapeHtml(phoneTel)}" style="color:${C} !important;text-decoration:none;">${escapeHtml(phone)}</a>`
                    : escapeHtml(phone),
                )}
                ${fact('Persone', escapeHtml(String(pax)))}
                ${fact('Orario', escapeHtml(timeHeadline))}
                ${fact('Receptionist', escapeHtml(staff))}
                ${fact('Coupon −10%', hasCoupon ? 'Già inviato all’ospite' : 'Non inviato')}
              </table>

              ${
                hasCoupon
                  ? `
              <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0 28px;background-color:#FFFFFF !important;border:1.5px dashed ${C};border-radius:18px;">
                <tr>
                  <td style="padding:18px 16px;text-align:center;">
                    ${
                      iconWine
                        ? `<img src="${iconWine}" width="24" height="24" alt="" style="display:inline-block;width:24px;height:24px;border:0;margin:0 0 8px;">`
                        : ''
                    }
                    <div class="brand-title" style="font-family:${CINZEL};font-size:12px;font-weight:700;color:${C} !important;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px;">Coupon &minus;10%</div>
                    <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0;text-align:center;">
                      Gi&agrave; inviato all&rsquo;ospite via email. In chiamata puoi ricordarglielo.
                    </p>
                  </td>
                </tr>
              </table>`
                  : `<div style="height:20px;line-height:20px;font-size:1px;">&nbsp;</div>`
              }

              ${sectionTitle('La cucina')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;text-align:center;">
                Cena sulla terrazza del canale, pensata per gli ospiti ${escapeHtml(hotel)}.
              </p>
              ${postcard(dish, 'Cucina della Terrazza', 28)}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E8E4DC;margin-top:8px;">
                <tr>
                  <td align="center" style="padding:28px 0 0;text-align:center;">
                    <div style="width:28px;height:1px;line-height:1px;font-size:1px;background-color:${BRASS};margin:0 auto 14px;">&nbsp;</div>
                    <div style="font-family:${BODY};font-style:italic;font-size:17px;font-weight:500;color:${C} !important;letter-spacing:0.02em;line-height:1.45;margin:0 0 6px;">
                      Il front desk
                    </div>
                    <div style="font-family:${SERIF};font-style:italic;font-size:13px;font-weight:600;color:${BRASS} !important;letter-spacing:0.06em;line-height:1.4;">
                      ${escapeHtml(hotel)}
                    </div>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return { subject, text, html, timeLabel: timeHeadline, room, phone };
}

