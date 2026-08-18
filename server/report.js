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

/** Title Case per nomi tutto-maiuscolo; lascia intatti i nomi già misti. */
function formatGuestDisplayName(name) {
  const raw = String(name || '').trim();
  if (!raw) return '';
  const letters = raw.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  const isAllCaps =
    letters.length > 1 &&
    letters === letters.toUpperCase() &&
    letters !== letters.toLowerCase();
  if (!isAllCaps) return raw;
  return raw
    .toLowerCase()
    .replace(/(^|[\s'’-])([\p{L}])/gu, (_, sep, ch) => sep + ch.toUpperCase());
}

function formatStaffDisplayName(raw) {
  return formatGuestDisplayName(raw) || '—';
}

function emptyDash(value) {
  const v = String(value || '').trim();
  return v || '—';
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

const C = '#124453';
const BOX = '#E9EEF0';
const WHITE = '#FFFFFF';
const BRASS = '#6E868F';
const MUTED = '#86868b';
const LINE = '#e5e5ea';
const ZEBRA = '#fafafa';
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

function reportShell({ title, hotelName, eyebrow, preheader, bodyHtml, maxWidth = 560 }) {
  const hero = escapeHtml(publicAssetUrl('email', 'hero-01.jpg'));
  const cardW = Number(maxWidth) || 560;
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
    `,
  })}
</head>
<body ${emailLightBodyAttrs()}>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" class="email-bg force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f5f5f7" style="background-color:#f5f5f7 !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" class="force-white" bgcolor="#f5f5f7" style="padding:16px 10px;background-color:#f5f5f7 !important;">
        <table role="presentation" class="email-card force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:${cardW}px;background-color:#FFFFFF !important;border-radius:16px;overflow:hidden;border:1px solid ${LINE};">
          <tr>
            <td class="force-white" bgcolor="#FFFFFF" style="padding:20px 22px 0;background-color:#FFFFFF !important;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${BOX};border-radius:16px;">
                    <img src="${hero}" width="556" alt="${escapeHtml(hotelName)}" style="display:block;width:100%;max-width:556px;height:auto;border:0;border-radius:16px;">
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
                    <p style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;">
                      ${note}
                    </p>
                    <div style="width:28px;height:1px;line-height:1px;font-size:1px;background-color:${BRASS};margin:0 auto 14px;">&nbsp;</div>
                    <div style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;letter-spacing:0.02em;line-height:1.45;margin:0 0 6px;">
                      ${signOff}
                    </div>
                    <div style="font-family:${SERIF};font-style:italic;font-size:14px;font-weight:600;color:${BRASS} !important;letter-spacing:0.06em;line-height:1.4;">
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
                      <img src="${src}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;border:0;">
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
  const dated = raw.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})/,
  );
  const isOpen =
    !raw || /REQUESTED|CALL|TAVOLO/i.test(raw) || (!dated && !/^\d{1,2}:\d{2}$/.test(raw));

  if (isOpen) {
    return {
      dayLabel: 'oggi',
      timeLabel: 'da confermare',
      timeDisplay: 'Da confermare',
      whenPhrase: 'per oggi (orario da confermare)',
      subjectWhen: 'per oggi · orario da confermare',
    };
  }

  const hh = dated ? Number(dated[2]) : Number(raw.split(':')[0]);
  const mm = dated ? Number(dated[3]) : Number(raw.split(':')[1]);
  const timeLabel = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const nowR = romeParts(now);
  const todayStamp = `${nowR.year}-${String(nowR.month).padStart(2, '0')}-${String(nowR.day).padStart(2, '0')}`;

  let dayOffset = 0;
  if (dated) {
    const bookDay = dated[1];
    if (bookDay > todayStamp) dayOffset = 1;
    else if (bookDay < todayStamp) dayOffset = -1;
    else dayOffset = 0;
    if (bookDay !== todayStamp && bookDay !== nextRomeDate(now, 1) && bookDay !== nextRomeDate(now, -1)) {
      return {
        dayLabel: bookDay.slice(8, 10) + '/' + bookDay.slice(5, 7),
        timeLabel,
        timeDisplay: timeLabel,
        whenPhrase: `per il ${bookDay.slice(8, 10)}/${bookDay.slice(5, 7)} alle ${timeLabel}`,
        subjectWhen: `per il ${bookDay.slice(8, 10)}/${bookDay.slice(5, 7)} alle ${timeLabel}`,
      };
    }
  } else {
    const nowMins = nowR.hour * 60 + nowR.minute;
    const bookMins = hh * 60 + mm;
    dayOffset = bookMins <= nowMins ? 1 : 0;
  }

  let dayLabel = 'oggi';
  if (dayOffset === 1) dayLabel = 'domani';
  if (dayOffset === -1) dayLabel = 'ieri';

  return {
    dayLabel,
    timeLabel,
    timeDisplay: timeLabel,
    whenPhrase: `per ${dayLabel} alle ${timeLabel}`,
    subjectWhen: `per ${dayLabel} alle ${timeLabel}`,
  };
}

function nextRomeDate(now, dayDelta) {
  const d = new Date(now.getTime() + dayDelta * 24 * 60 * 60 * 1000);
  const p = romeParts(d);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
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

/** KPI in tre colonne: Gmail-safe, niente flex. */
function kpiCell(value, label, isLast = false) {
  return `
                    <td width="33%" valign="top" style="width:33%;padding:0 ${isLast ? '0' : '5px'} 0 0;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${ZEBRA}" style="width:100%;background-color:${ZEBRA};border:1px solid ${LINE};border-radius:10px;">
                        <tr>
                          <td align="center" style="padding:12px 8px;text-align:center;">
                            <div style="font-family:${SANS};font-size:20px;font-weight:700;color:${C} !important;line-height:1.15;">${escapeHtml(String(value))}</div>
                            <div style="font-family:${SANS};font-size:11px;font-weight:500;color:${MUTED} !important;margin-top:3px;line-height:1.2;">${escapeHtml(label)}</div>
                          </td>
                        </tr>
                      </table>
                    </td>`;
}

function thCell(label, extra = '') {
  return `<th align="left" style="padding:12px 10px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6e6e73 !important;text-align:left;border-bottom:1px solid ${LINE};white-space:nowrap;${extra}">${label}</th>`;
}

function phoneHref(phone) {
  const raw = String(phone || '').trim();
  if (!raw || raw === '—') return '';
  const tel = raw.replace(/[^\d+]/g, '');
  return tel ? `tel:${tel}` : '';
}

function emailHref(email) {
  const raw = String(email || '').trim();
  if (!raw || raw === '—' || !raw.includes('@')) return '';
  return `mailto:${raw}`;
}

function linkedCell(href, label, extraStyle = '') {
  const text = escapeHtml(label);
  const style = `font-family:${SANS};font-size:13px;color:#1d1d1f !important;text-decoration:none;${extraStyle}`;
  if (!href) return `<span style="${style}">${text}</span>`;
  return `<a href="${escapeHtml(href)}" style="color:${C} !important;text-decoration:none;${style}">${text}</a>`;
}

/**
 * Tabella ad alta densità (layout di ieri): una riga per ospite.
 * Font di oggi: stanza/nome 15px, contatti 13px, etichette 11px.
 */
function buildDailyGuestTable(rows) {
  if (!rows.length) {
    return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;border:1px solid ${LINE};border-radius:12px;">
                <tr>
                  <td style="padding:20px 16px;color:${MUTED};text-align:center;font-size:14px;font-family:${BODY};font-style:italic;">
                    Nessuna registrazione in questo periodo
                  </td>
                </tr>
              </table>`;
  }

  const bodyRows = rows
    .map((row, index) => {
      const room = emptyDash(cleanCell(row.room_number));
      const name = emptyDash(formatGuestDisplayName(cleanCell(row.guest_name)));
      const phone = emptyDash(cleanCell(row.phone));
      const email = emptyDash(cleanCell(row.email));
      const staff = emptyDash(formatStaffDisplayName(cleanCell(row.receptionist)));
      const haVoucher = hasRestaurantCoupon(row);
      const zebra = index % 2 === 1 ? ZEBRA : WHITE;
      const border = index === rows.length - 1 ? '0' : `1px solid #f2f2f7`;
      const emptyStyle = `color:#c7c7cc !important;`;
      const phoneHtml =
        phone === '—'
          ? `<span style="${emptyStyle}">—</span>`
          : linkedCell(phoneHref(phone), phone);
      const emailHtml =
        email === '—'
          ? `<span style="${emptyStyle}">—</span>`
          : linkedCell(emailHref(email), email);
      const voucherHtml = haVoucher
        ? `<span style="display:inline-block;background:#E8F1F4;color:${C} !important;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.04em;padding:2px 6px;border-radius:4px;">SÌ</span>`
        : `<span style="${emptyStyle}">—</span>`;

      return `
                <tr bgcolor="${zebra}">
                  <td align="center" style="padding:12px 8px;font-family:${SANS};font-size:15px;font-weight:700;color:${C} !important;text-align:center;white-space:nowrap;border-bottom:${border};">${escapeHtml(room)}</td>
                  <td style="padding:12px 10px;font-family:${SANS};font-size:15px;font-weight:700;color:${C} !important;white-space:nowrap;border-bottom:${border};">${escapeHtml(name)}</td>
                  <td style="padding:12px 10px;font-family:${SANS};font-size:13px;color:#1d1d1f !important;white-space:nowrap;border-bottom:${border};">${phoneHtml}</td>
                  <td style="padding:12px 10px;font-family:${SANS};font-size:13px;color:#1d1d1f !important;white-space:nowrap;border-bottom:${border};">${emailHtml}</td>
                  <td align="center" style="padding:12px 8px;text-align:center;white-space:nowrap;border-bottom:${border};">${voucherHtml}</td>
                  <td style="padding:12px 10px;font-family:${SANS};font-size:11px;font-weight:600;color:${MUTED} !important;white-space:nowrap;border-bottom:${border};">${escapeHtml(staff)}</td>
                </tr>`;
    })
    .join('');

  return `
              <div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;min-width:540px;border-collapse:collapse;border:1px solid ${LINE};border-radius:12px;">
                  <tr bgcolor="#f5f5f7">
                    ${thCell('St.', 'text-align:center;width:40px;')}
                    ${thCell('Ospite')}
                    ${thCell('WhatsApp')}
                    ${thCell('Email')}
                    ${thCell('Voucher', 'text-align:center;')}
                    ${thCell('By')}
                  </tr>
                  ${bodyRows}
                </table>
              </div>`;
}

/**
 * Report notturno Payel: KPI + una tabella. Un solo punto per nome/telefono/email.
 */
export function buildReportEmail({ hotelName, count, dateLabel, rows = [] }) {
  const subject = `Report contatti · ${dateLabel}`;
  const couponCount = rows.filter(hasRestaurantCoupon).length;
  const statsLine = couponCount
    ? `${count} check-in, ${couponCount} voucher ristorante`
    : `${count} check-in`;
  const reportPreheader = `Gentile Payel — report contatti del ${dateLabel}: ${statsLine}. CSV in allegato.`;

  const introPlain = `in allegato il report contatti di oggi (${dateLabel}): ${statsLine}. Il CSV è pronto per Excel.`;

  const textLines = rows.map((row) => {
    const room = emptyDash(cleanCell(row.room_number));
    const name = emptyDash(formatGuestDisplayName(cleanCell(row.guest_name)));
    const phone = emptyDash(cleanCell(row.phone));
    const email = emptyDash(cleanCell(row.email));
    const staff = emptyDash(formatStaffDisplayName(cleanCell(row.receptionist)));
    const voucher = hasRestaurantCoupon(row) ? 'voucher sì' : 'voucher —';
    return `${room}  ${name}  ${phone}  ${email}  ${voucher}  ${staff}`;
  });

  const text = [
    `Gentile Payel,`,
    ``,
    introPlain,
    ``,
    `Arrivi: ${count}  ·  Voucher: ${couponCount}  ·  ${dateLabel}`,
    ``,
    ...textLines,
    ``,
    `Front Desk — ${hotelName}`,
  ].join('\n');

  const bodyHtml = `
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 20px;text-align:left;">
                Gentile <strong style="color:${C} !important;font-weight:600;">Payel</strong>,
                in allegato il report di oggi
                (<strong style="color:${C} !important;font-weight:600;">${escapeHtml(dateLabel)}</strong>).
                Il CSV &egrave; pronto per Excel.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 20px;">
                <tr>
                  ${kpiCell(count, 'Arrivi totali')}
                  ${kpiCell(couponCount, 'Voucher rist.')}
                  ${kpiCell(dateLabel, 'Data report', true)}
                </tr>
              </table>

              ${buildDailyGuestTable(rows)}

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
    eyebrow: 'Report presenze giornaliero',
    preheader: reportPreheader,
    bodyHtml,
    maxWidth: 600,
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
          <td width="36" style="width:36px;padding:14px 8px 14px 0;border-bottom:${border};font-family:${SERIF};font-weight:700;font-size:14px;color:${C};white-space:nowrap;${bg}">${pos}</td>
          <td style="padding:14px 8px;border-bottom:${border};font-family:${SERIF};font-size:15px;font-weight:600;letter-spacing:0.01em;color:${C};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${bg}">${escapeHtml(row.receptionist)}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SERIF};font-weight:700;font-size:15px;color:${C};white-space:nowrap;${bg}">${row.totale_registrati}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SERIF};font-weight:700;font-size:15px;color:${C};white-space:nowrap;${bg}">${row.coupon_emessi}</td>
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
              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:19px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;">
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
                  <td width="36" style="padding:12px 8px 12px 0;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">#</td>
                  <td style="padding:12px 8px;border-bottom:1px solid #E8E4DC;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#8A949C;">Reception</td>
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid #E8E4DC;text-align:center;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8A949C;">Check-in</td>
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid #E8E4DC;text-align:center;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8A949C;">Referral</td>
                </tr>
                ${rowsHtml}
              </table>
              <p style="font-family:${SANS};font-size:12px;font-weight:500;color:#8A949C !important;margin:0 0 28px;line-height:1.45;">
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

  // Hero + dish landscape, height:auto (Gmail). Icona PNG fissa 48×48.
  const hero = escapeHtml(publicAssetUrl('email', 'booking-hero-v3.jpg'));
  const dish = escapeHtml(publicAssetUrl('email', 'booking-dish-v4.jpg'));

  const CW = 456;
  const BAND_H = Math.round((CW * 780) / 1400);
  const emailImg = (src, alt, w, h) =>
    `<img src="${src}" width="${w}" height="${h}" alt="${alt}" style="display:block;width:100%;max-width:${w}px;height:auto !important;border:0;outline:none;-ms-interpolation-mode:bicubic;">`;

  // Più compatta della welcome — Payel su telefono.
  const FS = {
    section: '13px',
    body: '14px',
    itemTitle: '15px',
    label: '10.5px',
    greet: '16px',
    time: '18px',
  };
  const bodyCopy = emailBodyStyle({ size: FS.body, line: '1.5' });
  const labelStyleLocal = emailLabelStyle({ size: FS.label });

  const sectionTitleLocal = (label) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 10px;border-bottom:1px solid rgba(22,78,91,0.14);">
                <tr>
                  <td style="padding:0 0 8px 0;">
                    <div class="brand-title" style="${emailSectionStyle({ size: FS.section, color: C })}">${label}</div>
                  </td>
                </tr>
              </table>`;

  const postcardBleed = (src, alt, bottom = 20, w = CW, h = BAND_H) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${bottom}px;width:100%;max-width:${w}px;border-radius:16px;overflow:hidden;border:1px solid #E2E6E8;">
                <tr>
                  <td bgcolor="#FFFFFF" style="padding:0;line-height:0;font-size:0;background-color:#FFFFFF !important;">
                    ${emailImg(src, alt, w, h)}
                  </td>
                </tr>
              </table>`;

  const fact = (label, valueHtml) => `
                <tr>
                  <td style="padding:8px 0;border-bottom:1px solid #E8E4DC;">
                    <div style="${labelStyleLocal};margin:0 0 2px;">${label}</div>
                    <div style="${emailValueStyle({ size: FS.itemTitle, color: C })}">${valueHtml}</div>
                  </td>
                </tr>`;

  const phoneBlock = phoneTel
    ? `
                    <a href="tel:${escapeHtml(phoneTel)}" style="text-decoration:none;display:inline-block;margin:0 0 14px;background-color:${C};color:#FFFFFF !important;padding:12px 18px;border-radius:14px;${emailCtaStyle({ size: '12px' })};">
                      Chiama l&rsquo;ospite · ${escapeHtml(phone)}
                    </a>
                    <div style="height:1px;line-height:1px;background-color:#E8E4DC;margin:0 0 14px;font-size:1px;">&nbsp;</div>`
    : '';

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
  <table role="presentation" class="email-bg force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" class="force-white" bgcolor="${WHITE}" style="padding:16px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td class="email-content force-white" bgcolor="#FFFFFF" style="padding:18px 22px 32px;background-color:#FFFFFF !important;">

              ${postcardBleed(hero, 'Trattoria alla Terrazza', 14, CW, BAND_H)}

              <p style="${emailEyebrowStyle({ size: '10px', color: BRASS })};margin:0 0 5px;text-align:center;">
                ${escapeHtml(brand)}
              </p>
              <p style="${emailLabelStyle({ size: FS.label, color: '#8A949C' })};letter-spacing:0.06em;margin:0 0 18px;text-align:center;">
                Richiesta tavolo · ospite ${escapeHtml(hotel)}
              </p>

              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:${FS.greet};font-weight:500;color:${C} !important;margin:0 0 8px;letter-spacing:0.01em;text-align:left;line-height:1.35;">
                Gentile Payel,
              </p>
              <p class="text-muted" style="${bodyCopy};color:#4A5560 !important;margin:0 0 16px;text-align:left;">
                ti scrivo per una richiesta di prenotazione
                <span style="color:${C} !important;font-weight:600;">${escapeHtml(headline.whenPhrase)}</span>
                presso ${escapeHtml(brand)}.
                L&rsquo;ospite &egrave; in stanza
                <span style="color:${C} !important;font-weight:600;">${escapeHtml(room)}</span>
                (${escapeHtml(name)}, ${escapeHtml(String(pax))} pers.).
                Ti chiedo di confermare la disponibilit&agrave; del tavolo telefonando all&rsquo;ospite.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:22px;">
                <tr>
                  <td align="center" style="padding:16px 14px;background-color:#FFFFFF !important;">
                    ${phoneBlock}
                    <div style="${labelStyleLocal};margin:0 0 5px;">
                      ${escapeHtml(headline.dayLabel)} · orario richiesto
                    </div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:${FS.time};font-weight:700;color:${C} !important;letter-spacing:0.04em;line-height:1.15;">
                      ${escapeHtml(timeDisplay)}
                    </div>
                    <div style="font-family:${SANS};font-size:${FS.label};font-weight:600;color:#7A8690 !important;margin-top:6px;">
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
              <p class="text-muted" style="${bodyCopy};color:#5C6670 !important;margin:12px 0 18px;text-align:left;">
                Nota: il coupon &minus;10% &egrave; gi&agrave; stato inviato all&rsquo;ospite via email; in chiamata puoi ricordarglielo.
              </p>`
                  : `<div style="height:12px;line-height:12px;font-size:1px;">&nbsp;</div>`
              }

              ${sectionTitleLocal('Cucina')}
              <p class="text-muted" style="${bodyCopy};color:#5C6670 !important;margin:0 0 10px;text-align:left;">
                Cena sulla terrazza del canale, per gli ospiti ${escapeHtml(hotel)}.
              </p>
              ${postcardBleed(dish, 'Piatto della Terrazza', 20, CW, BAND_H)}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E8E4DC;margin-top:4px;">
                <tr>
                  <td align="center" style="padding:18px 0 0;text-align:center;">
                    <div class="brand-title" style="font-family:${BODY};font-style:italic;font-size:15px;font-weight:500;color:${C} !important;letter-spacing:0.02em;line-height:1.4;margin:0 0 6px;">
                      Grazie, Payel
                    </div>
                    <div class="brass" style="font-family:${SERIF};font-style:italic;font-size:12.5px;font-weight:600;color:${BRASS} !important;letter-spacing:0.06em;line-height:1.35;">
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
