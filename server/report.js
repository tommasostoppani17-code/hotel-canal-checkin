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
const CW = 456;
const REPORT_GREETING = 'Gentili Mizan & Payel,';
const REPORT_GREETING_SHORT = 'Gentili Mizan & Payel';
/** Scala tipografica = mail ospiti (coupon.js) */
const FS = {
  section: '14px',
  body: '16px',
  bodySm: '14px',
  itemTitle: '16px',
  label: '11px',
  button: '13.5px',
  legal: '10.5px',
};
const bodyStyle = emailBodyStyle({ size: FS.body, line: '1.55' });
const bodySmStyle = emailBodyStyle({ size: FS.bodySm, line: '1.4' });
const labelStyle = emailLabelStyle({ size: FS.label });

function reportIcon(...parts) {
  return publicAssetUrl('email', ...parts);
}

function iconCell(src, alt, size = 28) {
  if (!src) return '';
  return `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="${escapeHtml(alt)}" style="display:block;width:${size}px;height:${size}px;border:0;">`;
}

function stickerImg(src, size = 48) {
  if (!src) return '';
  return `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="" style="display:inline-block;width:${size}px;height:${size}px;border:0;">`;
}

function emailImg(src, alt, w, h = null) {
  const hAttr = h ? ` height="${h}"` : '';
  const hStyle = h ? `height:${h}px;` : 'height:auto;';
  return `<img src="${src}" width="${w}"${hAttr} alt="${alt}" style="display:block;width:${w}px;max-width:${w}px;${hStyle}border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">`;
}

function sectionTitle(label, iconSrc, iconAlt = label) {
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 16px;border-bottom:1px solid rgba(22,78,91,0.14);">
                <tr>
                  <td width="28" valign="middle" style="padding:0 8px 12px 0;line-height:0;font-size:0;">
                    ${iconCell(iconSrc, iconAlt || label, 20)}
                  </td>
                  <td valign="middle" style="padding:0 0 12px 0;">
                    <div class="brand-title" style="${emailSectionStyle({ size: FS.section, color: C })}">${label}</div>
                  </td>
                </tr>
              </table>`;
}

function copyBlockHtml(text) {
  return `
              <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:18px;">
                <tr>
                  <td style="padding:18px 16px;font-family:${BODY};font-style:italic;font-size:${FS.bodySm};line-height:1.65;color:#4A5560 !important;font-weight:400;word-break:break-all;mso-line-height-rule:exactly;">
                    ${escapeHtml(text || '-')}
                  </td>
                </tr>
              </table>`;
}

function reportFooter(hotelName, note = 'Grazie e a presto.') {
  const stickers = {
    palazzo: reportIcon('stickers', 'palazzo.png'),
    mooring: reportIcon('stickers', 'mooring.png'),
    basilica: reportIcon('stickers', 'basilica.png'),
    campanile: reportIcon('stickers', 'campanile.png'),
    lion: reportIcon('stickers', 'lion.png'),
  };
  const stickerRow = ['palazzo', 'mooring', 'basilica', 'campanile']
    .map((key) =>
      stickers[key]
        ? `<td align="center" style="padding:0 4px;">${stickerImg(stickers[key], 40)}</td>`
        : '',
    )
    .join('');
  return `
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 0;">
                <tr>${stickerRow}</tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 0;">
                <tr>
                  <td align="center" style="text-align:center;padding:0;">
                    ${stickers.lion ? `<div style="margin:0 0 14px;line-height:0;font-size:0;">${stickerImg(stickers.lion, 52)}</div>` : ''}
                    <div class="brand-title" style="font-family:${BODY};font-style:italic;font-size:19px;font-weight:500;color:${C} !important;letter-spacing:0.01em;line-height:1.55;text-align:center;">
                      ${note}
                    </div>
                    <div style="width:36px;height:1px;line-height:1px;font-size:1px;background-color:${BRASS};margin:22px auto 16px;">&nbsp;</div>
                    <div class="brand-title" style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;letter-spacing:0.02em;line-height:1.45;text-align:center;">
                      Front Desk
                    </div>
                    <div class="brass" style="font-family:${SERIF};font-style:italic;font-size:14px;font-weight:600;color:${BRASS} !important;letter-spacing:0.06em;margin-top:8px;text-align:center;line-height:1.4;">
                      ${escapeHtml(hotelName)}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;">
                <tr>
                  <td align="center" style="border-top:1px solid #E5E5EA;padding-top:24px;text-align:center;">
                    <p style="font-family:${SANS};font-size:${FS.label};color:#8E8E93 !important;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px 0;line-height:1.4;">
                      Hotel Canal<br>
                      Santa Croce 553, 30135 Venezia (VE) &mdash; Italy<br>
                      P.IVA / C.F.: 04711930273
                    </p>
                  </td>
                </tr>
              </table>`;
}

function reportShell({
  title,
  hotelName,
  eyebrow,
  preheader,
  preheaderHash = 'report',
  bodyHtml,
}) {
  const hero = escapeHtml(reportIcon('hero-01.jpg'));
  const mask = escapeHtml(reportIcon('stickers', 'mask.png'));
  const preheaderSafe = escapeHtml(preheader);
  const hashSafe = escapeHtml(preheaderHash);
  return `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  ${emailFontsHead()}
  ${emailLightModeHead({
    canal: C,
    box: BOX,
    extraCss: `
    img { display: block; border: 0; outline: none; }
    `,
  })}
</head>
<body ${emailLightBodyAttrs()}>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${preheaderSafe}
  </div>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">${hashSafe}${'&nbsp;'.repeat(48)}</div>
  <table role="presentation" class="email-bg force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" class="force-white" bgcolor="${WHITE}" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td class="email-content force-white" bgcolor="#FFFFFF" style="padding:20px 22px 36px;background-color:#FFFFFF !important;">
              <table role="presentation" width="${CW}" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;width:${CW}px;max-width:${CW}px;border-radius:16px;overflow:hidden;">
                <tr>
                  <td width="${CW}" bgcolor="#FFFFFF" style="padding:0;line-height:0;font-size:0;width:${CW}px;background-color:#FFFFFF !important;border-radius:16px;mso-line-height-rule:exactly;">
                    ${emailImg(hero, 'Hotel Canal - Venezia', CW, Math.round((CW * 686) / 1200))}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
                <tr>
                  <td align="center" style="padding:2px 0 16px 0;border-bottom:1px solid #E8E4DC;">
                    <div style="margin:0 0 8px;line-height:0;font-size:0;">${stickerImg(mask, 40)}</div>
                    <div style="${emailDisplayStyle({ color: C })}">${escapeHtml(hotelName)}</div>
                    <div class="brass" style="${emailEyebrowStyle({ color: BRASS })};margin-top:8px;">${escapeHtml(eyebrow)}</div>
                  </td>
                </tr>
              </table>
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

/**
 * Lista ospiti — stesso pattern righe guida Venezia (welcome).
 */
function buildGuestListHtml(rows) {
  if (!rows.length) {
    return `
              <p class="text-muted" style="${bodySmStyle};color:#8E8E93 !important;margin:0 0 28px;text-align:center;font-weight:400;">
                Nessuna registrazione in questo periodo
              </p>`;
  }

  const doorIcon = reportIcon('icons', 'door.png');
  const itemRows = rows
    .map((row, index) => {
      const room = cleanCell(row.room_number) || '-';
      const name = cleanCell(row.guest_name) || 'Ospite';
      const email = cleanCell(row.email);
      const phone = cleanCell(row.phone) || '-';
      const staff = cleanCell(row.receptionist) || '-';
      const pax = cleanCell(row.guests_count ?? '2') || '2';
      const haVoucher = hasRestaurantCoupon(row);
      const offer = haVoucher ? 'VOUCHER S&Igrave;' : 'VOUCHER NO';
      const tableTime = cleanCell(row.table_booking);
      const phoneHtml =
        phone && phone !== '-'
          ? `<div style="${bodySmStyle};color:#5C6670 !important;margin:0;">${escapeHtml(phone)}</div>`
          : '';
      const emailHtml = email
        ? `<div style="margin-top:2px;line-height:1.4;"><a href="mailto:${escapeHtml(email)}" style="font-family:${BODY};font-style:italic;font-size:${FS.bodySm};color:${C} !important;text-decoration:underline;">${escapeHtml(email)}</a></div>`
        : '';
      const contactHtml =
        phoneHtml || emailHtml
          ? `${phoneHtml}${emailHtml}`
          : `<div style="${bodySmStyle};color:#5C6670 !important;margin:0;">&mdash;</div>`;
      const border =
        index === rows.length - 1 ? '0' : '1px solid #E8E4DC';
      const metaLine = `${offer} &middot; ${escapeHtml(staff.toUpperCase())} &middot; ${escapeHtml(pax)} PAX${
        tableTime
          ? ` &middot; TAVOLO ${escapeHtml(tableTime.toUpperCase())}`
          : ''
      }`;

      return `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;border-bottom:${border};">
                      <tr>
                        <td width="34" valign="top" style="padding:10px 10px 10px 0;line-height:0;font-size:0;">
                          ${iconCell(doorIcon, 'Ospite', 26)}
                        </td>
                        <td valign="middle" style="padding:10px 0;">
                          <div class="brand-title" style="font-family:${SERIF};font-size:${FS.itemTitle};font-weight:700;color:${C} !important;letter-spacing:0.02em;line-height:1.2;margin:0 0 3px;text-transform:uppercase;">${escapeHtml(room)} &middot; ${escapeHtml(name)}</div>
                          ${contactHtml}
                          <div style="font-family:${SERIF};font-size:12px;font-weight:700;color:${C} !important;letter-spacing:0.04em;text-transform:uppercase;margin-top:8px;line-height:1.35;">
                            ${metaLine}
                          </div>
                        </td>
                      </tr>
                    </table>`;
    })
    .join('');

  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;border-top:1px solid #E8E4DC;">
                <tr>
                  <td style="padding:0;">
                    ${itemRows}
                  </td>
                </tr>
              </table>`;
}

/** Ospiti fittizi per anteprima / test email report (solo dev). */
export function demoReportPreviewRows() {
  const withVoucher = (row) => ({
    guests_count: 2,
    coupon_token: 'preview-voucher',
    coupon_sent_at: new Date().toISOString(),
    ...row,
  });
  const noVoucher = (row) => ({
    guests_count: row.guests_count ?? 2,
    coupon_token: null,
    coupon_sent_at: null,
    ...row,
  });

  return [
    withVoucher({
      guest_name: 'GUILHEM JACQUOT',
      room_number: '105',
      phone: '0761920337',
      email: 'guilhem.jct@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'MICHAEL VERBEEK',
      room_number: '114',
      phone: '+31651175635',
      email: 'ti141807@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'LAWRENCE NG',
      room_number: '202',
      phone: '+4407760260610',
      email: 'nglawrence2005@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'AGNES BAUER',
      room_number: '203',
      phone: '+436804432245',
      email: 'agnes.bauer5@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'ASTRID FORRESTOL',
      room_number: '206',
      phone: '+4748166265',
      email: 'aforrestol@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'MARA JOS ARREGUI FERNANDEZ',
      room_number: '210',
      phone: '+34655709968',
      email: 'marajosfernandez@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'ALONSO ANDRES JESUS MARIA',
      room_number: '211',
      phone: '+34688612173',
      email: 'alonsojesusmaria@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'MARTA CAMPALANS TORRES',
      room_number: '311',
      phone: '+34687055355',
      email: 'campalans.marta@gmail.com',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'ELENA BIANCHI',
      room_number: '108',
      phone: '+39 333 444 5566',
      email: 'elena.bianchi.lunghissima@example-hotel-test.com',
      receptionist: 'PAYEL',
      table_booking: '20:00',
    }),
    withVoucher({
      guest_name: 'JOHN SMITH',
      room_number: '12',
      phone: '+44 7700 900123',
      email: 'john.smith@example.com',
      receptionist: 'MIZAN',
    }),
    noVoucher({
      guest_name: 'ANNA KOWALSKI',
      room_number: '115',
      phone: '+48 501 234 567',
      email: 'anna.kowalski@example.com',
      receptionist: 'PAYEL',
      guests_count: 1,
    }),
    withVoucher({
      guest_name: 'PIERRE DUBOIS',
      room_number: '204',
      phone: '+33 6 12 34 56 78',
      email: 'pierre.dubois@example.fr',
      receptionist: 'ALEJANDRO',
      table_booking: '20:30',
    }),
    withVoucher({
      guest_name: 'YUKI TANAKA',
      room_number: '207',
      phone: '+81 90 1234 5678',
      email: 'yuki.tanaka@example.jp',
      receptionist: 'MARIA',
    }),
    noVoucher({
      guest_name: 'HANS MUELLER',
      room_number: '209',
      phone: '+49 170 1234567',
      email: '',
      receptionist: 'SAYEED',
    }),
    withVoucher({
      guest_name: 'SOPHIE MARTIN',
      room_number: '212',
      phone: '+32 470 12 34 56',
      email: 'sophie.martin@example.be',
      receptionist: 'TOMMASO',
    }),
    withVoucher({
      guest_name: 'CARLOS RODRIGUEZ',
      room_number: '301',
      phone: '+34 612 345 678',
      email: 'carlos.rodriguez@example.es',
      receptionist: 'JOHN',
    }),
    noVoucher({
      guest_name: 'WEI ZHANG',
      room_number: '302',
      phone: '+86 138 0000 1234',
      email: 'wei.zhang@example.cn',
      receptionist: 'MIZAN',
      guests_count: 3,
    }),
    withVoucher({
      guest_name: 'ISABELLA ROMANO',
      room_number: '303',
      phone: '+39 347 998 7766',
      email: 'isabella.romano@example.it',
      receptionist: 'PAYEL',
      table_booking: '21:00',
    }),
    withVoucher({
      guest_name: 'THOMAS ANDERSON',
      room_number: '304',
      phone: '+1 415 555 0199',
      email: 'thomas.anderson@example.com',
      receptionist: 'TOMMASO',
    }),
    noVoucher({
      guest_name: 'OLGA PETROVA',
      room_number: '305',
      phone: '+7 916 123 45 67',
      email: 'olga.petrova@example.ru',
      receptionist: 'MARIA',
      guests_count: 4,
    }),
  ];
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
  const reportPreheader = `${REPORT_GREETING_SHORT} — report contatti del ${dateLabel}: ${statsLine}. CSV in allegato.`;

  const listaSoloNumeri = rows
    .map((row) => row.phone)
    .filter(Boolean)
    .join(', ');

  const listaEmail = rows
    .map((row) => row.email)
    .filter(Boolean)
    .join(', ');

  const introPlain = `in allegato il report contatti di oggi (${dateLabel}): ${statsLine}. Il CSV è pronto per Excel.`;

  const text = [
    `${REPORT_GREETING}`,
    ``,
    introPlain,
    ``,
    `Numeri WhatsApp:`,
    listaSoloNumeri || '-',
    ``,
    `Email:`,
    listaEmail || '-',
    ``,
    `Front Desk — ${hotelName}`,
  ].join('\n');

  const bodyHtml = `
              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:19px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;">
                ${escapeHtml(REPORT_GREETING)}
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

              ${sectionTitle('Presenze', reportIcon('icons', 'door.png'), 'Presenze')}
              ${buildGuestListHtml(rows)}

              ${sectionTitle('Numeri WhatsApp', reportIcon('icons', 'bricola.png'), 'WhatsApp')}
              <p class="text-muted" style="${bodySmStyle};color:#5C6670 !important;margin:0 0 12px;text-align:center;">
                Tieni premuto per copiare
              </p>
              ${copyBlockHtml(listaSoloNumeri || '-')}

              ${sectionTitle('Email', reportIcon('icons', 'calendar.png'), 'Email')}
              <p class="text-muted" style="${bodySmStyle};color:#5C6670 !important;margin:0 0 12px;text-align:center;">
                Tieni premuto per copiare
              </p>
              ${copyBlockHtml(listaEmail || '-')}

              ${reportFooter(hotelName)}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Santa Croce 553 · Venezia',
    preheader: reportPreheader,
    preheaderHash: dateLabel.replace(/\D/g, '').slice(-8) || 'report',
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
          <td width="36" style="width:36px;padding:14px 8px 14px 0;border-bottom:${border};font-family:${SERIF};font-weight:700;font-size:${FS.bodySm};color:${C};white-space:nowrap;${bg}">${pos}</td>
          <td style="padding:14px 8px;border-bottom:${border};font-family:${SERIF};font-size:${FS.itemTitle};font-weight:600;letter-spacing:0.01em;color:${C};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${bg}">${escapeHtml(row.receptionist)}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SERIF};font-weight:700;font-size:${FS.bodySm};color:${C};white-space:nowrap;${bg}">${row.totale_registrati}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SERIF};font-weight:700;font-size:${FS.bodySm};color:${C};white-space:nowrap;${bg}">${row.coupon_emessi}</td>
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
                ${escapeHtml(REPORT_GREETING)}
              </p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 28px;text-align:left;">
                riepilogo di <strong style="color:${C} !important;font-weight:600;font-style:italic;">${escapeHtml(period)}</strong>:
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${totaleMese}</strong> check-in,
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${totaleCoupon}</strong> voucher ristorante.
                Qui sotto la classifica staff: i check-in effettuati da ciascun receptionist e, a fianco, quanti ospiti hanno preso il voucher della Trattoria (referral).
              </p>

              ${sectionTitle('Classifica staff', reportIcon('icons', 'key-discount.png'), 'Staff')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 12px;border-top:1px solid #E8E4DC;">
                <tr>
                  <td width="36" style="padding:12px 8px 12px 0;border-bottom:1px solid #E8E4DC;${labelStyle};letter-spacing:0.1em;color:#8A949C;">#</td>
                  <td style="padding:12px 8px;border-bottom:1px solid #E8E4DC;${labelStyle};letter-spacing:0.1em;color:#8A949C;">Reception</td>
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid #E8E4DC;text-align:center;${labelStyle};letter-spacing:0.08em;color:#8A949C;">Check-in</td>
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid #E8E4DC;text-align:center;${labelStyle};letter-spacing:0.08em;color:#8A949C;">Referral</td>
                </tr>
                ${rowsHtml}
              </table>
              <p style="${bodySmStyle};color:#8A949C !important;margin:0 0 28px;font-weight:400;">
                Referral = ospiti che hanno ricevuto il voucher &minus;10% Trattoria alla Terrazza.
              </p>

              ${reportFooter(hotelName, 'CSV di riepilogo mensile in allegato.')}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Santa Croce 553 · Venezia',
    preheader: `${REPORT_GREETING_SHORT} — ${period}: ${totaleMese} check-in, ${totaleCoupon} voucher ristorante`,
    preheaderHash: String(period).replace(/\D/g, '').slice(-8) || 'mensile',
    bodyHtml,
  });

  const text = [
    `${REPORT_GREETING}`,
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
 * Alert richiesta tavolo — tono “Gentili Mizan & Payel”, tipografia uniforme, foto catalogo.
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
  const preheader = `${REPORT_GREETING_SHORT} — ${headline.whenPhrase}. Stanza ${room}, ${name}. Confermare disponibilità.`;

  const text = [
    `${REPORT_GREETING}`,
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

              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:19px;font-weight:500;color:${C} !important;margin:0 0 8px;letter-spacing:0.01em;text-align:left;line-height:1.35;">
                ${escapeHtml(REPORT_GREETING)}
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
