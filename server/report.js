/** Report email per Payel — stile Hotel Canal, leggibile su telefono */

import { emailLightModeHead, emailLightBodyAttrs } from './email-light.js';
import {
  EMAIL_SERIF as SERIF,
  EMAIL_BODY as BODY,
  EMAIL_SANS as SANS,
  EMAIL_CINZEL as CINZEL,
  emailFontsHead,
  emailBodyStyle,
  emailLabelStyle,
  emailSectionStyle,
  emailValueStyle,
  emailCtaStyle,
  emailDisplayStyle,
  emailEyebrowStyle,
} from './email-type.js';

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

function emailAssetCommit() {
  const pinned = String(process.env.EMAIL_ASSET_COMMIT || '').trim();
  if (pinned) return pinned.replace(/^@/, '');
  const renderSha = String(process.env.RENDER_GIT_COMMIT || '').trim();
  if (renderSha && /^[0-9a-f]{7,40}$/i.test(renderSha)) return renderSha.slice(0, 40);
  return 'main';
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
  const rev = emailAssetCommit();
  return `https://cdn.jsdelivr.net/gh/tommasostoppani17-code/hotel-canal-checkin@${rev}/public`;
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
const bodyStyle = emailBodyStyle();
const labelStyle = emailLabelStyle();

function sectionTitle(label) {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 12px;border-bottom:1px solid rgba(22,78,91,0.14);">
                <tr>
                  <td style="padding:0 0 10px 0;">
                    <div style="${emailSectionStyle({ color: C })}">${label}</div>
                  </td>
                </tr>
              </table>`;
}

function reportShell({ title, hotelName, eyebrow, preheader, bodyHtml }) {
  const hero = escapeHtml(publicAssetUrl('venice-bg.jpg'));
  return `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${emailFontsHead()}
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
                    <div style="${emailDisplayStyle({ color: C })}">
                      ${escapeHtml(hotelName)}
                    </div>
                    <div style="${emailEyebrowStyle({ color: BRASS })};margin-top:8px;">
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

/** Parti data/ora a Venezia (Europe/Rome). */
function romeParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const map = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

/**
 * Giorno relativo della cena (oggi / domani / gg/mm) + orario.
 * Le prenotazioni check-in sono per il servizio serale a Venezia.
 */
export function formatTableBookingWhen(rawTime, now = new Date()) {
  const raw = String(rawTime || '').trim();
  const isOpen =
    !raw || /REQUESTED|CALL|TAVOLO/i.test(raw) || !/^\d{1,2}:\d{2}$/.test(raw);

  if (isOpen) {
    return {
      dayLabel: 'oggi',
      timeLabel: 'da confermare',
      timeDisplay: 'Da confermare',
      whenPhrase: 'per oggi (orario da confermare)',
      subjectWhen: 'per oggi · orario da confermare',
    };
  }

  const [hh, mm] = raw.split(':').map((n) => Number(n));
  const timeLabel = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const nowR = romeParts(now);
  const nowMins = nowR.hour * 60 + nowR.minute;
  const bookMins = hh * 60 + mm;
  // Se l'orario richiesto è già passato oggi (fuso Roma) → cena di domani
  const dayOffset = bookMins <= nowMins ? 1 : 0;

  let dayLabel = 'oggi';
  if (dayOffset === 1) dayLabel = 'domani';
  if (dayOffset > 1) {
    const target = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    dayLabel = formatRomeDate(target).slice(0, 5);
  }

  return {
    dayLabel,
    timeLabel,
    timeDisplay: timeLabel,
    whenPhrase: `per ${dayLabel} alle ${timeLabel}`,
    subjectWhen: `per ${dayLabel} alle ${timeLabel}`,
  };
}

/** Subject / headline notifica tavolo → Trattoria (non Front Desk). */
export function buildTableBookingHeadline(rawTime, now = new Date()) {
  const when = formatTableBookingWhen(rawTime, now);
  return {
    ...when,
    subject: `Richiesta di prenotazione ${when.subjectWhen} · Trattoria alla Terrazza`,
    brand: 'Trattoria alla Terrazza',
  };
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
            <div style="${emailValueStyle({ size: '17px', color: C })};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;">
              ${escapeHtml(name)}
            </div>
            <div style="font-family:${SERIF};font-size:14px;font-weight:500;color:#334155 !important;letter-spacing:0.01em;line-height:1.4;margin-top:5px;white-space:nowrap;">
              ${escapeHtml(phone)}
            </div>
            ${
              email
                ? `<div style="font-family:${BODY};font-style:italic;font-size:12.5px;color:#8A949C !important;line-height:1.4;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:340px;">${escapeHtml(email)}</div>`
                : ''
            }
            <div style="${emailLabelStyle({ size: '9.5px', color: '#5C6670' })};margin-top:10px;letter-spacing:0.06em;white-space:nowrap;">
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
          <td width="36" style="width:36px;padding:14px 8px 14px 0;border-bottom:${border};font-family:${SERIF};font-weight:700;font-size:13px;color:${C};white-space:nowrap;${bg}">${pos}</td>
          <td style="padding:14px 8px;border-bottom:${border};font-family:${SERIF};font-size:14px;font-weight:600;letter-spacing:0.01em;color:${C};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${bg}">${escapeHtml(row.receptionist)}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SERIF};font-weight:700;font-size:14px;color:${C};white-space:nowrap;${bg}">${row.totale_registrati}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SERIF};font-weight:700;font-size:14px;color:${C};white-space:nowrap;${bg}">${row.coupon_emessi}</td>
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
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid #E8E4DC;text-align:center;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8A949C;">Check-in</td>
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid #E8E4DC;text-align:center;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8A949C;">Referral</td>
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
 * Alert richiesta tavolo — tono “Gentile Payel”, tipografia uniforme, foto catalogo.
 * Hero #26 · sotto #27 quadrata. Niente CTA colorate aggressive.
 */
export function buildTableBookingEmail({ hotelName, row }) {
  const rawTime = String(row?.table_booking || '').trim();
  const headline = buildTableBookingHeadline(rawTime);
  const timeDisplay = headline.timeDisplay;
  const timeHeadline =
    headline.timeLabel === 'da confermare'
      ? 'Da confermare'
      : `alle ${headline.timeLabel}`;
  const room = cleanCell(row?.room_number) || '-';
  const phone = cleanCell(row?.phone) || '-';
  const phoneTel = String(row?.phone || '').replace(/[\s\-()]/g, '');
  const name = cleanCell(row?.guest_name) || 'Ospite';
  const pax = row?.guests_count ?? 2;
  const staff = cleanCell(row?.receptionist) || '-';
  const hasCoupon = Boolean(row?.coupon_sent_at || row?.coupon_token);
  const hotel = cleanCell(hotelName) || 'Hotel Canal';
  const brand = headline.brand;

  const subject = headline.subject;
  const preheader = `Gentile Payel — ${headline.whenPhrase}. Stanza ${room}, ${name}. Confermare disponibilità.`;

  const text = [
    `Gentile Payel,`,
    ``,
    `ti scrivo per una richiesta di prenotazione ${headline.whenPhrase} presso ${brand}.`,
    ``,
    `Dettagli:`,
    `· Ospite: ${name}`,
    `· Stanza Hotel Canal: ${room}`,
    `· Orario richiesto: ${timeHeadline}`,
    `· Persone: ${pax}`,
    `· Telefono: ${phone}`,
    staff && staff !== '-' ? `· Receptionist check-in: ${staff}` : null,
    hasCoupon
      ? `· Coupon −10% Trattoria: già inviato all'ospite via email.`
      : `· Coupon −10%: non inviato in fase di check-in.`,
    ``,
    `Ti chiedo di chiamare l'ospite per confermare la disponibilità del tavolo e, se serve, proporre un orario alternativo.`,
    ``,
    `Grazie,`,
    `Front Desk — ${hotel}`,
    `(alert automatico · ${brand})`,
  ]
    .filter((line) => line != null)
    .join('\n');

  const hero = escapeHtml(publicAssetUrl('email', 'booking-hero-26.jpg'));
  const dish = escapeHtml(publicAssetUrl('email', 'booking-square-27.jpg'));

  const CW = 456;
  const BAND_H = 254;
  const emailImg = (src, alt, w, h) =>
    `<img src="${src}" width="${w}" height="${h}" alt="${alt}" style="display:block;width:${w}px;max-width:${w}px;height:${h}px;border:0;outline:none;-ms-interpolation-mode:bicubic;">`;

  const bodyCopy = emailBodyStyle({ size: '14px', line: '1.55' });
  const labelStyleLocal = emailLabelStyle({ size: '10px' });

  const sectionTitleLocal = (label) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 12px;border-bottom:1px solid rgba(22,78,91,0.12);">
                <tr>
                  <td style="padding:0 0 8px 0;">
                    <div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${C};">${label}</div>
                  </td>
                </tr>
              </table>`;

  const postcardBleed = (src, alt, bottom = 20, w = CW, h = BAND_H) => `
              <table role="presentation" width="${w}" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${bottom}px;width:${w}px;max-width:${w}px;border-radius:18px;overflow:hidden;border:1px solid #E2E6E8;">
                <tr>
                  <td width="${w}" height="${h}" bgcolor="#FFFFFF" style="padding:0;line-height:0;font-size:0;width:${w}px;height:${h}px;background-color:#FFFFFF !important;mso-line-height-rule:exactly;">
                    ${emailImg(src, alt, w, h)}
                  </td>
                </tr>
              </table>`;

  const fact = (label, valueHtml) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #E8E4DC;">
                    <div style="${labelStyleLocal};margin:0 0 3px;color:#8A949C;">${label}</div>
                    <div style="font-family:${BODY};font-style:italic;font-size:15px;font-weight:500;color:${C} !important;line-height:1.35;">${valueHtml}</div>
                  </td>
                </tr>`;

  const html = `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  ${emailFontsHead()}
  ${emailLightModeHead({
    canal: C,
    box: BOX,
    extraCss: `
    img { display: block; border: 0; outline: none; }
    a { color: ${C}; }
    `,
  })}
</head>
<body ${emailLightBodyAttrs()}>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" class="email-bg force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${BODY}, ${SANS};">
    <tr>
      <td align="center" class="force-white" bgcolor="${WHITE}" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td class="email-content force-white" bgcolor="#FFFFFF" style="padding:20px 22px 34px;background-color:#FFFFFF !important;">

              ${postcardBleed(hero, 'Trattoria alla Terrazza', 16, CW, BAND_H)}

              <p style="font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRASS};margin:0 0 6px;text-align:center;">
                ${escapeHtml(brand)}
              </p>
              <p style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#8A949C;margin:0 0 22px;text-align:center;">
                Richiesta tavolo · ospite ${escapeHtml(hotel)}
              </p>

              <p style="font-family:${BODY};font-style:italic;font-size:16px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;line-height:1.4;">
                Gentile Payel,
              </p>
              <p style="${bodyCopy};color:#4A5560 !important;margin:0 0 18px;text-align:left;font-family:${BODY};font-style:italic;">
                ti scrivo per una richiesta di prenotazione
                <span style="color:${C} !important;font-weight:600;">${escapeHtml(headline.whenPhrase)}</span>
                presso ${escapeHtml(brand)}.
                L&rsquo;ospite &egrave; in stanza
                <span style="color:${C} !important;font-weight:600;">${escapeHtml(room)}</span>
                (${escapeHtml(name)}, ${escapeHtml(String(pax))} pers.).
                Ti chiedo di confermare la disponibilit&agrave; del tavolo telefonando all&rsquo;ospite.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;background-color:${BOX} !important;border-radius:14px;">
                <tr>
                  <td align="center" style="padding:16px 14px;">
                    ${
                      phoneTel
                        ? `
                    <a href="tel:${escapeHtml(phoneTel)}" style="text-decoration:none;display:inline-block;margin:0 0 16px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto;">
                        <tr>
                          <td width="64" height="64" align="center" valign="middle" bgcolor="${C}" style="width:64px;height:64px;background-color:${C};border-radius:32px;text-align:center;line-height:64px;font-size:28px;color:#FFFFFF !important;">
                            &#9742;
                          </td>
                        </tr>
                      </table>
                      <div style="font-family:${SANS};font-size:12px;font-weight:600;color:${C} !important;margin-top:10px;letter-spacing:0.02em;">
                        ${escapeHtml(phone)}
                      </div>
                      <div style="font-family:${SANS};font-size:10px;font-weight:600;color:#8A949C !important;margin-top:4px;letter-spacing:0.08em;text-transform:uppercase;">
                        Tocca per chiamare l&rsquo;ospite
                      </div>
                    </a>
                    <div style="height:1px;line-height:1px;background-color:#D8DEE3;margin:0 0 16px;font-size:1px;">&nbsp;</div>`
                        : ''
                    }
                    <div style="font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;margin:0 0 6px;">
                      ${escapeHtml(headline.dayLabel)} · orario richiesto
                    </div>
                    <div style="font-family:${BODY};font-style:italic;font-size:22px;font-weight:600;color:${C} !important;letter-spacing:0.02em;line-height:1.2;">
                      ${escapeHtml(timeDisplay)}
                    </div>
                    <div style="font-family:${SANS};font-size:12px;font-weight:500;color:#7A8690 !important;margin-top:8px;">
                      Stanza ${escapeHtml(room)} · ${escapeHtml(String(pax))} ospiti
                    </div>
                  </td>
                </tr>
              </table>

              ${sectionTitleLocal('Dettagli richiesta')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;border-top:1px solid #E8E4DC;">
                ${fact('Ospite', escapeHtml(name))}
                ${fact('Stanza', escapeHtml(room))}
                ${fact(
                  'Telefono',
                  phoneTel
                    ? `<a href="tel:${escapeHtml(phoneTel)}" style="color:${C} !important;text-decoration:underline;">${escapeHtml(phone)}</a>`
                    : escapeHtml(phone),
                )}
                ${fact('Persone', escapeHtml(String(pax)))}
                ${fact('Quando', escapeHtml(headline.whenPhrase))}
                ${fact('Receptionist', escapeHtml(staff))}
                ${fact('Coupon −10%', hasCoupon ? 'Già inviato all’ospite' : 'Non inviato')}
              </table>

              ${
                hasCoupon
                  ? `
              <p style="${bodyCopy};color:#5C6670 !important;margin:14px 0 22px;text-align:left;font-family:${BODY};font-style:italic;">
                Nota: il coupon &minus;10% &egrave; gi&agrave; stato inviato all&rsquo;ospite via email; in chiamata puoi ricordarglielo.
              </p>`
                  : `<div style="height:16px;line-height:16px;font-size:1px;">&nbsp;</div>`
              }

              ${sectionTitleLocal('Cucina')}
              <p style="${bodyCopy};color:#5C6670 !important;margin:0 0 12px;text-align:left;font-family:${BODY};font-style:italic;">
                Cena sulla terrazza del canale, per gli ospiti ${escapeHtml(hotel)}.
              </p>
              ${postcardBleed(dish, 'Piatto della Terrazza', 24, CW, CW)}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E8E4DC;margin-top:4px;">
                <tr>
                  <td align="center" style="padding:22px 0 0;text-align:center;">
                    <div style="font-family:${BODY};font-style:italic;font-size:15px;font-weight:500;color:${C} !important;margin:0 0 4px;">
                      Grazie, Payel
                    </div>
                    <div style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${BRASS};">
                      Front Desk · ${escapeHtml(hotel)}
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
