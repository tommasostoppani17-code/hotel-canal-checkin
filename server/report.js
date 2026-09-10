/** Report email — Riva OS (dark marble) */

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

const CSV_SEP = ';';

function csvEscape(value) {
  const raw = value == null ? '' : String(value);
  if (/[";\n\r]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function csvRow(cells) {
  return cells.map((cell) => csvEscape(cell)).join(CSV_SEP);
}

function formatReceptionistLabel(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.toUpperCase() === 'RECEPTION') return 'Reception';
  return raw
    .toLowerCase()
    .split(/[\s-]+/)
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : ''))
    .join(' ');
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

const C = '#F4F4F5';
const C_ACCENT = '#E8E8EA';
const BOX = '#18181C';
const WHITE = '#0A0A0A';
const CARD = '#111114';
const BRASS = '#A1A1AA';
const LINE = '#2A2A2E';
const CW = 456;
const REPORT_GREETING = 'Ciao,';
const REPORT_GREETING_SHORT = 'Ciao';
const BRAND = 'Riva OS';
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 16px;border-bottom:1px solid ${LINE};">
                <tr>
                  <td width="28" valign="middle" style="padding:0 8px 12px 0;line-height:0;font-size:0;">
                    ${iconCell(iconSrc, iconAlt || label, 20)}
                  </td>
                  <td valign="middle" style="padding:0 0 12px 0;">
                    <div class="brand-title" style="${emailSectionStyle({ size: FS.section, color: C })};letter-spacing:0.12em;text-transform:uppercase;">${label}</div>
                  </td>
                </tr>
              </table>`;
}

function copyBlockHtml(text) {
  return `
              <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background-color:${BOX} !important;border:1px solid ${LINE};border-radius:18px;">
                <tr>
                  <td style="padding:18px 16px;font-family:${SANS};font-size:${FS.bodySm};line-height:1.65;color:#D4D4D8 !important;font-weight:400;word-break:break-all;mso-line-height-rule:exactly;">
                    ${escapeHtml(text || '-')}
                  </td>
                </tr>
              </table>`;
}

function reportFooter(hotelName, note = 'Grazie e a presto.') {
  const marble = publicAssetUrl('assets', 'sidebar-marble.png');
  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;border-radius:16px;overflow:hidden;">
                <tr>
                  <td bgcolor="#000000" style="padding:0;line-height:0;font-size:0;background-color:#000000 !important;">
                    ${emailImg(escapeHtml(marble), 'Riva OS', CW, Math.round((CW * 180) / 740))}
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 0;">
                <tr>
                  <td align="center" style="text-align:center;padding:0;">
                    <div class="brand-title" style="font-family:${SANS};font-size:15px;font-weight:500;color:#A1A1AA !important;letter-spacing:0.01em;line-height:1.55;text-align:center;">
                      ${escapeHtml(note)}
                    </div>
                    <div style="width:36px;height:1px;line-height:1px;font-size:1px;background-color:${LINE};margin:22px auto 16px;">&nbsp;</div>
                    <div class="brand-title" style="font-family:${SANS};font-size:22px;font-weight:800;color:${C} !important;letter-spacing:-0.02em;text-align:center;">
                      ${BRAND}
                    </div>
                    <div class="brass" style="font-family:${SANS};font-size:13px;font-weight:500;color:${BRASS} !important;letter-spacing:0.08em;margin-top:8px;text-align:center;line-height:1.4;text-transform:uppercase;">
                      ${escapeHtml(hotelName)}
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;">
                <tr>
                  <td align="center" style="border-top:1px solid ${LINE};padding-top:24px;text-align:center;">
                    <p style="font-family:${SANS};font-size:${FS.label};color:#71717A !important;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px 0;line-height:1.4;">
                      Report operativo · Riva OS<br>
                      ${escapeHtml(hotelName)} · Santa Croce 553, Venezia<br>
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
  const marble = escapeHtml(publicAssetUrl('assets', 'sidebar-marble.png'));
  const preheaderSafe = escapeHtml(preheader);
  const hashSafe = escapeHtml(preheaderHash);
  return `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
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
<body ${emailLightBodyAttrs()} style="background-color:${WHITE} !important;margin:0;padding:0;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${preheaderSafe}
  </div>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">${hashSafe}${'&nbsp;'.repeat(48)}</div>
  <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" bgcolor="${WHITE}" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CARD}" style="max-width:500px;background-color:${CARD} !important;border-radius:24px;overflow:hidden;border:1px solid ${LINE};">
          <tr>
            <td bgcolor="#000000" style="padding:0;line-height:0;font-size:0;background-color:#000000 !important;">
              ${emailImg(marble, 'Riva OS', CW, Math.round((CW * 220) / 740))}
            </td>
          </tr>
          <tr>
            <td class="email-content" bgcolor="${CARD}" style="padding:22px 22px 36px;background-color:${CARD} !important;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
                <tr>
                  <td align="left" style="padding:2px 0 16px 0;border-bottom:1px solid ${LINE};">
                    <div style="font-family:${SANS};font-size:28px;font-weight:800;letter-spacing:-0.03em;color:${C} !important;line-height:1;">${BRAND}</div>
                    <div style="font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${BRASS} !important;margin-top:8px;">${escapeHtml(eyebrow)}</div>
                    <div style="font-family:${SANS};font-size:13px;font-weight:500;color:#71717A !important;margin-top:6px;">${escapeHtml(hotelName)}</div>
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

function sortCheckinsForExport(rows) {
  return [...(rows || [])].sort((a, b) => {
    const ra = String(a?.receptionist || 'RECEPTION').trim().toUpperCase() || 'RECEPTION';
    const rb = String(b?.receptionist || 'RECEPTION').trim().toUpperCase() || 'RECEPTION';
    const byName = ra.localeCompare(rb, 'it', { sensitivity: 'base' });
    if (byName) return byName;
    const roomA = String(a?.room_number || '').trim();
    const roomB = String(b?.room_number || '').trim();
    const numA = Number.parseInt(roomA, 10);
    const numB = Number.parseInt(roomB, 10);
    if (Number.isFinite(numA) && Number.isFinite(numB) && numA !== numB) return numA - numB;
    return roomA.localeCompare(roomB, 'it', { numeric: true });
  });
}

function groupCheckinsByReceptionist(rows) {
  const sorted = sortCheckinsForExport(rows);
  const groups = [];
  let current = null;
  for (const row of sorted) {
    const key = String(row?.receptionist || 'RECEPTION').trim().toUpperCase() || 'RECEPTION';
    if (!current || current.key !== key) {
      current = { key, label: key, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }
  return groups;
}

function formatCheckinDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

export function buildCsvFilename({ date = '', prefix = 'report-contatti' } = {}) {
  const day = String(date || '').trim() || formatRomeDate().replace(/\//g, '-');
  const iso =
    /^\d{4}-\d{2}-\d{2}$/.test(day)
      ? day
      : new Date().toISOString().slice(0, 10);
  return `${prefix}_${iso}.csv`;
}

/** CSV per Excel italiano: separatore ;, intestazioni brevi, date leggibili. */
export function buildCsv(rows, { hotelName = '', dateLabel = '' } = {}) {
  const sorted = sortCheckinsForExport(rows);
  const count = sorted.length;
  const voucherCount = sorted.filter(hasRestaurantCoupon).length;
  const headers = [
    'Stanza',
    'Ospite',
    'Telefono',
    'Email',
    'Reception',
    'Ospiti',
    'Voucher ristorante',
    'Tavolo',
    'Registrato',
  ];
  const metaParts = ['Report contatti'];
  if (dateLabel) metaParts.push(dateLabel);
  if (hotelName) metaParts.push(hotelName);
  metaParts.push(
    `${count} check-in`,
    voucherCount ? `${voucherCount} voucher` : null,
  );
  const metaLine = `# ${metaParts.filter(Boolean).join(' · ')}`;
  const lines = sorted.map((row) =>
    csvRow([
      row.room_number || '',
      row.guest_name || '',
      row.phone || '',
      row.email || '',
      formatReceptionistLabel(row.receptionist),
      String(row.guests_count ?? '2'),
      hasRestaurantCoupon(row) ? 'Sì' : 'No',
      row.table_booking || '',
      formatCheckinDateTime(row.created_at),
    ]),
  );
  return `\uFEFF${metaLine}\n${csvRow(headers)}\n${lines.join('\n')}\n`;
}

/** Foglio HTML autoformattato — apre bene su iPad / Safari (no CSV grezzo). */
export function buildCheckinSheetHtml(rows, { date = '', hotelName = 'Hotel' } = {}) {
  const day = String(date || '').trim() || formatRomeDate();
  const dateLabel = (() => {
    const d = new Date(`${day}T12:00:00`);
    if (Number.isNaN(d.getTime())) return day;
    return new Intl.DateTimeFormat('it-IT', {
      timeZone: 'Europe/Rome',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  })();
  const groups = groupCheckinsByReceptionist(rows);
  const totalRows = groups.reduce((n, g) => n + g.rows.length, 0);
  const totalVoucher = groups.reduce(
    (n, g) => n + g.rows.filter((r) => hasRestaurantCoupon(r)).length,
    0,
  );
  const generatedAt = formatCheckinDateTime(new Date().toISOString());

  const groupHtml = groups.length
    ? groups
        .map((group) => {
          const voucherN = group.rows.filter((r) => hasRestaurantCoupon(r)).length;
          const bodyRows = group.rows
            .map((row) => {
              const coupon = hasRestaurantCoupon(row);
              const badgeClass = coupon ? 'badge badge--yes' : 'badge badge--no';
              const badgeLabel = coupon ? 'Emesso' : 'Non emesso';
              return `<tr>
                <td class="col-room">${escapeHtml(row.room_number || '—')}</td>
                <td class="col-name">${escapeHtml(row.guest_name || '—')}</td>
                <td class="col-phone">${escapeHtml(row.phone || '—')}</td>
                <td class="col-email">${escapeHtml(row.email || '—')}</td>
                <td class="col-pax num">${escapeHtml(String(row.guests_count ?? '2'))}</td>
                <td class="col-voucher"><span class="${badgeClass}">${badgeLabel}</span></td>
                <td class="col-table">${escapeHtml(row.table_booking || '—')}</td>
                <td class="col-time num">${escapeHtml(formatCheckinDateTime(row.created_at))}</td>
              </tr>`;
            })
            .join('');
          return `<section class="group">
            <header class="group-head">
              <h2>${escapeHtml(group.label)}</h2>
              <p class="group-meta">${group.rows.length} check-in · ${voucherN} voucher</p>
            </header>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Stanza</th>
                    <th>Ospite</th>
                    <th>Telefono</th>
                    <th>Email</th>
                    <th class="num">Pax</th>
                    <th>Voucher</th>
                    <th>Tavolo</th>
                    <th class="num">Registrato</th>
                  </tr>
                </thead>
                <tbody>${bodyRows}</tbody>
              </table>
            </div>
          </section>`;
        })
        .join('')
    : `<section class="empty"><p>Nessun check-in per questa data.</p></section>`;

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <title>Check-in ${escapeHtml(day)} · ${escapeHtml(hotelName)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; }
    body {
      margin: 0;
      padding: calc(20px + env(safe-area-inset-top, 0px)) 16px calc(28px + env(safe-area-inset-bottom, 0px));
      font-family: "Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 14px;
      line-height: 1.45;
      color: #0a0a0a;
      background: #f5f3f0;
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      max-width: 980px;
      margin: 0 auto;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 8px 32px rgba(10, 10, 10, 0.08);
      overflow: hidden;
    }
    .sheet-head {
      padding: 24px 20px 20px;
      border-bottom: 1px solid #ece8e2;
      background: linear-gradient(180deg, #faf9f7 0%, #fff 100%);
    }
    .kicker {
      margin: 0 0 6px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6e868f;
    }
    h1 {
      margin: 0 0 4px;
      font-size: clamp(22px, 4vw, 28px);
      font-weight: 700;
      letter-spacing: -0.03em;
      color: #164e5b;
    }
    .subtitle { margin: 0; color: #636366; font-size: 14px; }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 16px;
    }
    .stat {
      flex: 1 1 120px;
      min-width: 0;
      padding: 12px 14px;
      border-radius: 14px;
      background: #f3f4f6;
    }
    .stat b {
      display: block;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #0a0a0a;
    }
    .stat span {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #8a847c;
    }
    .sheet-body { padding: 8px 0 4px; }
    .group { padding: 0 0 8px; }
    .group-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 18px 20px 10px;
    }
    .group-head h2 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: #0a0a0a;
    }
    .group-meta {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      color: #8a847c;
      white-space: nowrap;
    }
    .table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      padding: 0 12px 12px;
    }
    table {
      width: 100%;
      min-width: 720px;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
    }
    thead th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 10px 12px;
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #6e868f;
      background: #faf9f7;
      border-bottom: 1px solid #ece8e2;
      white-space: nowrap;
    }
    tbody td {
      padding: 11px 12px;
      vertical-align: top;
      border-bottom: 1px solid #f1f1f1;
      word-break: break-word;
    }
    tbody tr:nth-child(even) td { background: #fcfcfb; }
    tbody tr:last-child td { border-bottom: 0; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .col-room { width: 72px; font-weight: 600; }
    .col-name { min-width: 140px; font-weight: 600; }
    .col-phone { min-width: 118px; white-space: nowrap; }
    .col-email { min-width: 160px; }
    .col-pax { width: 48px; }
    .col-voucher { width: 108px; }
    .col-table { min-width: 100px; }
    .col-time { min-width: 118px; white-space: nowrap; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
    }
    .badge--yes { background: #e8f5ec; color: #1b5e20; }
    .badge--no { background: #f3f4f6; color: #636366; }
    .empty { padding: 48px 24px; text-align: center; color: #8a847c; }
    .sheet-foot {
      padding: 14px 20px 18px;
      border-top: 1px solid #ece8e2;
      font-size: 11px;
      color: #8a847c;
      text-align: center;
    }
    @media (max-width: 720px) {
      body { padding-left: 0; padding-right: 0; background: #fff; }
      .sheet { border-radius: 0; box-shadow: none; max-width: none; }
      .group-head { flex-direction: column; align-items: flex-start; gap: 4px; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .sheet { box-shadow: none; border-radius: 0; max-width: none; }
      .table-wrap { overflow: visible; }
      .group { break-inside: avoid-page; page-break-inside: avoid; }
      thead th { position: static; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    <header class="sheet-head">
      <p class="kicker">Registro check-in</p>
      <h1>${escapeHtml(hotelName)}</h1>
      <p class="subtitle">${escapeHtml(dateLabel)}</p>
      <div class="stats">
        <div class="stat"><b>${totalRows}</b><span>Check-in</span></div>
        <div class="stat"><b>${groups.length}</b><span>Receptionist</span></div>
        <div class="stat"><b>${totalVoucher}</b><span>Voucher emessi</span></div>
      </div>
    </header>
    <div class="sheet-body">${groupHtml}</div>
    <footer class="sheet-foot">Generato ${escapeHtml(generatedAt)} · Riva OS</footer>
  </article>
</body>
</html>`;
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
              <p class="text-muted" style="${bodySmStyle};color:#71717A !important;margin:0 0 28px;text-align:center;font-weight:400;">
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
          ? `<div style="${bodySmStyle};color:#A1A1AA !important;margin:0;">${escapeHtml(phone)}</div>`
          : '';
      const emailHtml = email
        ? `<div style="margin-top:2px;line-height:1.4;"><a href="mailto:${escapeHtml(email)}" style="font-family:${SANS};font-size:${FS.bodySm};color:${C} !important;text-decoration:underline;">${escapeHtml(email)}</a></div>`
        : '';
      const contactHtml =
        phoneHtml || emailHtml
          ? `${phoneHtml}${emailHtml}`
          : `<div style="${bodySmStyle};color:#71717A !important;margin:0;">&mdash;</div>`;
      const border =
        index === rows.length - 1 ? '0' : `1px solid ${LINE}`;
      const metaLine = `${offer} &middot; ${escapeHtml(staff.toUpperCase())} &middot; ${escapeHtml(pax)} PAX${
        tableTime
          ? ` &middot; TAVOLO ${escapeHtml(tableTime.toUpperCase())}`
          : ''
      }`;

      return `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;border-bottom:${border};">
                      <tr>
                        <td width="34" valign="top" style="padding:12px 10px 12px 0;line-height:0;font-size:0;">
                          ${iconCell(doorIcon, 'Ospite', 26)}
                        </td>
                        <td valign="middle" style="padding:12px 0;">
                          <div class="brand-title" style="font-family:${SANS};font-size:${FS.itemTitle};font-weight:700;color:${C} !important;letter-spacing:0.01em;line-height:1.2;margin:0 0 3px;text-transform:uppercase;">${escapeHtml(room)} &middot; ${escapeHtml(name)}</div>
                          ${contactHtml}
                          <div style="font-family:${SANS};font-size:11px;font-weight:600;color:#A1A1AA !important;letter-spacing:0.06em;text-transform:uppercase;margin-top:8px;line-height:1.35;">
                            ${metaLine}
                          </div>
                        </td>
                      </tr>
                    </table>`;
    })
    .join('');

  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;border-top:1px solid ${LINE};">
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
  const subject = `Riva OS · Report · ${dateLabel}`;
  const couponCount = rows.filter(hasRestaurantCoupon).length;
  const statsLine = couponCount
    ? `${count} check-in, ${couponCount} voucher ristorante`
    : `${count} check-in`;
  const reportPreheader = `${BRAND} — report del ${dateLabel}: ${statsLine}. CSV in allegato.`;

  const listaSoloNumeri = rows
    .map((row) => row.phone)
    .filter(Boolean)
    .join(', ');

  const listaEmail = rows
    .map((row) => row.email)
    .filter(Boolean)
    .join(', ');

  const introPlain = `report contatti di oggi (${dateLabel}): ${statsLine}. Il CSV è pronto per Excel.`;

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
    `${BRAND} — ${hotelName}`,
  ].join('\n');

  const bodyHtml = `
              <p class="brand-title text-main" style="font-family:${SANS};font-size:20px;font-weight:700;color:${C} !important;margin:0 0 10px;letter-spacing:-0.02em;text-align:left;">
                ${escapeHtml(REPORT_GREETING)}
              </p>
              <p class="text-muted" style="${bodyStyle};color:#A1A1AA !important;margin:0 0 28px;text-align:left;">
                report contatti di oggi
                (<strong style="color:${C} !important;font-weight:600;">${escapeHtml(dateLabel)}</strong>):
                <strong style="color:${C} !important;font-weight:600;">${count}</strong> check-in${
                  couponCount
                    ? `, <strong style="color:${C} !important;font-weight:600;">${couponCount}</strong> voucher ristorante`
                    : ''
                }.
                Il CSV &egrave; pronto per Excel.
              </p>

              ${sectionTitle('Presenze', reportIcon('icons', 'door.png'), 'Presenze')}
              ${buildGuestListHtml(rows)}

              ${sectionTitle('Numeri WhatsApp', reportIcon('icons', 'bricola.png'), 'WhatsApp')}
              <p class="text-muted" style="${bodySmStyle};color:#71717A !important;margin:0 0 12px;text-align:center;">
                Tieni premuto per copiare
              </p>
              ${copyBlockHtml(listaSoloNumeri || '-')}

              ${sectionTitle('Email', reportIcon('icons', 'calendar.png'), 'Email')}
              <p class="text-muted" style="${bodySmStyle};color:#71717A !important;margin:0 0 12px;text-align:center;">
                Tieni premuto per copiare
              </p>
              ${copyBlockHtml(listaEmail || '-')}

              ${reportFooter(hotelName)}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Daily ops · Venezia',
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
  const subject = `Riva OS · Report mensile · ${monthLabel} ${year}`;
  const totaleMese = Number(totals?.totale_mese || 0);
  const totaleCoupon = Number(totals?.totale_coupon || 0);
  const period = `${monthLabel} ${year}`;
  const introPlain = `riepilogo di ${period}: ${totaleMese} check-in, ${totaleCoupon} voucher ristorante. Qui sotto la classifica staff: i check-in effettuati da ciascun receptionist e, a fianco, quanti ospiti hanno preso il voucher della Trattoria (referral).`;

  const rowsHtml = ranking
    .map((row, index) => {
      const bg =
        index === 0 ? `background-color:rgba(255,255,255,0.06);` : '';
      const pos = `${index + 1}`;
      const border =
        index === ranking.length - 1 ? '0' : `1px solid ${LINE}`;
      return `
        <tr>
          <td width="36" style="width:36px;padding:14px 8px 14px 0;border-bottom:${border};font-family:${SANS};font-weight:700;font-size:${FS.bodySm};color:${C};white-space:nowrap;${bg}">${pos}</td>
          <td style="padding:14px 8px;border-bottom:${border};font-family:${SANS};font-size:${FS.itemTitle};font-weight:600;letter-spacing:0.01em;color:${C};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${bg}">${escapeHtml(row.receptionist)}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SANS};font-weight:700;font-size:${FS.bodySm};color:${C};white-space:nowrap;${bg}">${row.totale_registrati}</td>
          <td width="72" align="center" style="width:72px;padding:14px 4px;border-bottom:${border};text-align:center;font-family:${SANS};font-weight:700;font-size:${FS.bodySm};color:${C};white-space:nowrap;${bg}">${row.coupon_emessi}</td>
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
              <p class="brand-title text-main" style="font-family:${SANS};font-size:20px;font-weight:700;color:${C} !important;margin:0 0 10px;letter-spacing:-0.02em;text-align:left;">
                ${escapeHtml(REPORT_GREETING)}
              </p>
              <p class="text-muted" style="${bodyStyle};color:#A1A1AA !important;margin:0 0 28px;text-align:left;">
                riepilogo di <strong style="color:${C} !important;font-weight:600;">${escapeHtml(period)}</strong>:
                <strong style="color:${C} !important;font-weight:600;">${totaleMese}</strong> check-in,
                <strong style="color:${C} !important;font-weight:600;">${totaleCoupon}</strong> voucher ristorante.
                Qui sotto la classifica staff.
              </p>

              ${sectionTitle('Classifica staff', reportIcon('icons', 'key-discount.png'), 'Staff')}
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin:0 0 12px;border-top:1px solid ${LINE};">
                <tr>
                  <td width="36" style="padding:12px 8px 12px 0;border-bottom:1px solid ${LINE};${labelStyle};letter-spacing:0.1em;color:#71717A;">#</td>
                  <td style="padding:12px 8px;border-bottom:1px solid ${LINE};${labelStyle};letter-spacing:0.1em;color:#71717A;">Reception</td>
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid ${LINE};text-align:center;${labelStyle};letter-spacing:0.08em;color:#71717A;">Check-in</td>
                  <td width="72" align="center" style="width:72px;padding:12px 4px;border-bottom:1px solid ${LINE};text-align:center;${labelStyle};letter-spacing:0.08em;color:#71717A;">Referral</td>
                </tr>
                ${rowsHtml}
              </table>
              <p style="${bodySmStyle};color:#71717A !important;margin:0 0 28px;font-weight:400;">
                Referral = ospiti che hanno ricevuto il voucher &minus;10% Trattoria alla Terrazza.
              </p>

              ${reportFooter(hotelName, 'CSV di riepilogo mensile in allegato.')}
  `;

  const html = reportShell({
    title: subject,
    hotelName,
    eyebrow: 'Monthly ops · Venezia',
    preheader: `${BRAND} — ${period}: ${totaleMese} check-in, ${totaleCoupon} voucher ristorante`,
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
    `${BRAND} — ${hotelName}`,
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
