/** Report email per Payel - audit front office istituzionale */

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

function buildDailyTableRows(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="5" style="padding:20px 2px;border-bottom:1px solid #E5E5EA;color:#8E8E93;text-align:center;font-size:12.5px;">
          Nessuna registrazione in questa giornata
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
      const staff = cleanCell(row.receptionist) || '-';
      const pax = cleanCell(row.guests_count ?? '2') || '2';
      const haVoucher = hasRestaurantCoupon(row);
      const couponCell = haVoucher
        ? `<span style="color:#124453 !important;font-weight:700;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;">YES (${escapeHtml(pax)})</span>`
        : `<span style="color:#B4B4B4 !important;font-weight:500;font-size:10px;letter-spacing:0.05em;text-transform:uppercase;">NO</span>`;

      return `
        <tr>
          <td width="12%" style="width:12%;font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:700;color:#124453 !important;padding:14px 2px;border-bottom:1px solid #E5E5EA;vertical-align:top;word-break:break-word;">
            ${escapeHtml(room || '-')}
          </td>
          <td width="40%" style="width:40%;padding:14px 6px;border-bottom:1px solid #E5E5EA;vertical-align:top;word-break:break-word;">
            <div style="font-weight:700;font-size:12px;color:#1D1D1F !important;text-transform:uppercase;letter-spacing:0.02em;line-height:1.35;word-break:break-word;">
              ${escapeHtml(name || 'NON SPECIFICATO')}
            </div>
            <div style="font-size:10.5px;color:#8E8E93 !important;margin-top:4px;line-height:1.35;word-break:break-all;">
              ${escapeHtml(email || '-')}
            </div>
          </td>
          <td width="24%" style="width:24%;padding:14px 6px;border-bottom:1px solid #E5E5EA;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;font-weight:600;color:#1D1D1F !important;vertical-align:top;word-break:break-all;">
            ${escapeHtml(phone)}
          </td>
          <td width="12%" align="center" style="width:12%;padding:14px 2px;border-bottom:1px solid #E5E5EA;font-size:9.5px;font-weight:700;color:#124453 !important;text-transform:uppercase;letter-spacing:0.04em;vertical-align:top;word-break:break-word;">
            ${escapeHtml(staff)}
          </td>
          <td width="12%" align="right" style="width:12%;padding:14px 2px;border-bottom:1px solid #E5E5EA;vertical-align:top;word-break:break-word;">
            ${couponCell}
          </td>
        </tr>
      `;
    })
    .join('');
}

/**
 * Report notturno Payel: tabella fixed-layout, copia nativa via textarea, CSV Excel-ready.
 */
export function buildReportEmail({ hotelName, count, dateLabel, rows = [] }) {
  const subject = `AUDIT RECEPTION - ${count} Camere - ${dateLabel}`;
  const couponCount = rows.filter(hasRestaurantCoupon).length;
  const hero = escapeHtml(publicAssetUrl('email', 'hero-venice.jpg'));

  const listaSoloNumeri = rows
    .map((row) => row.phone)
    .filter(Boolean)
    .join(', ');

  const text = [
    `Ciao Payel,`,
    ``,
    `Front Office Audit ${hotelName} - ${dateLabel}.`,
    `Sincronizzazioni: ${count}`,
    `Coupon YES: ${couponCount}`,
    ``,
    `WhatsApp broadcast (tieni premuto sul box in mail per Copia):`,
    listaSoloNumeri || '-',
    ``,
    `CSV allegato (Excel: sep=, + BOM).`,
    ``,
    `${hotelName} Ledger`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(subject)}</title>
  <style type="text/css">
    :root { color-scheme: light only; }
    img { display: block; max-width: 100%; height: auto; border: 0; }
    html, body, table, td, th, p, div, textarea {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    html, body { background-color: #FFFFFF !important; color: #1D1D1F !important; }
    .data-table { table-layout: fixed !important; width: 100% !important; }
    .utility-textarea {
      width: 100% !important;
      box-sizing: border-box !important;
      -webkit-user-select: text !important;
      user-select: text !important;
    }
    @media (prefers-color-mode: dark) {
      body, table, td, .email-bg, .wrapper { background-color: #FFFFFF !important; color: #1D1D1F !important; }
      td, p, h2, div, th, strong, span, textarea { color: #1D1D1F !important; background-color: #FFFFFF !important; }
      .data-table th { color: #8E8E93 !important; border-bottom: 1px solid #1D1D1F !important; background: #FFFFFF !important; }
      .data-table td { border-bottom: 1px solid #E5E5EA !important; }
      .utility-textarea { background-color: #F4F7F9 !important; border: 1px solid #E5E5EA !important; color: #1D1D1F !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FFFFFF !important;color:#1D1D1F !important;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FFFFFF;">
    ${escapeHtml(`Ciao Payel - ${count} camere - audit ${dateLabel}`)}
  </div>
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-bg" style="background-color:#FFFFFF !important;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" class="wrapper" border="0" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#FFFFFF !important;table-layout:fixed;">

          <tr>
            <td align="center" style="padding:0 0 36px 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:14px;overflow:hidden;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:#E9EEF0;border-radius:14px;">
                    <img src="${hero}" width="580" alt="Venezia" style="display:block;width:100%;max-width:580px;height:auto;border:0;border-radius:14px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:0 0 40px 0;border-bottom:1px solid #1D1D1F;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:0.1em;color:#124453 !important;text-transform:uppercase;line-height:1;">
                ${escapeHtml(hotelName)}
              </div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.28em;color:#8E8E93 !important;margin-top:8px;">
                Venice Experience · Front Office Business Intelligence
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 0 16px 0;">
              <p style="font-size:14px;line-height:1.45;color:#124453 !important;margin:0 0 18px;font-weight:600;">
                Ciao Payel,
              </p>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td valign="bottom">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:13.5px;font-weight:700;color:#124453 !important;margin:0;letter-spacing:0.08em;text-transform:uppercase;">
                      Front Office Audit
                    </div>
                  </td>
                  <td align="right" valign="bottom" style="font-size:13px;color:#64748B !important;font-weight:500;">
                    Sincronizzazioni totali:
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#124453 !important;margin-left:2px;">${count}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:8px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="data-table" style="width:100%;border-collapse:collapse;font-size:12.5px;table-layout:fixed;">
                <colgroup>
                  <col style="width:12%">
                  <col style="width:40%">
                  <col style="width:24%">
                  <col style="width:12%">
                  <col style="width:12%">
                </colgroup>
                <thead>
                  <tr>
                    <th width="12%" align="left" style="width:12%;color:#8E8E93 !important;background:#FFFFFF !important;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:0.08em;text-align:left;padding:12px 2px;border-bottom:1px solid #1D1D1F;">Room</th>
                    <th width="40%" align="left" style="width:40%;color:#8E8E93 !important;background:#FFFFFF !important;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:0.08em;text-align:left;padding:12px 6px;border-bottom:1px solid #1D1D1F;">Guest / Parameters</th>
                    <th width="24%" align="left" style="width:24%;color:#8E8E93 !important;background:#FFFFFF !important;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:0.08em;text-align:left;padding:12px 6px;border-bottom:1px solid #1D1D1F;">Telephone</th>
                    <th width="12%" align="center" style="width:12%;color:#8E8E93 !important;background:#FFFFFF !important;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:0.08em;text-align:center;padding:12px 2px;border-bottom:1px solid #1D1D1F;">Staff</th>
                    <th width="12%" align="right" style="width:12%;color:#8E8E93 !important;background:#FFFFFF !important;font-weight:600;text-transform:uppercase;font-size:9px;letter-spacing:0.08em;text-align:right;padding:12px 2px;border-bottom:1px solid #1D1D1F;">Privilege</th>
                  </tr>
                </thead>
                <tbody>
                  ${buildDailyTableRows(rows)}
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:28px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:11px;font-weight:700;color:#8E8E93 !important;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">
                WhatsApp Broadcast List (tap &amp; hold to copy)
              </div>
              <textarea class="utility-textarea" readonly rows="3" style="display:block;width:100%;max-width:100%;box-sizing:border-box;margin:0 0 28px;padding:12px;background-color:#F4F7F9 !important;border:1px solid #E5E5EA;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;line-height:1.55;color:#1D1D1F !important;-webkit-user-select:text;user-select:text;resize:none;">${escapeHtml(listaSoloNumeri || '-')}</textarea>
            </td>
          </tr>

          <tr>
            <td style="font-size:10px;color:#8E8E93 !important;line-height:1.5;border-top:1px solid #1D1D1F;padding-top:16px;text-align:center;font-weight:500;">
              L'archivio master completo in formato <strong style="color:#124453 !important;">.CSV</strong> &egrave; allegato a questo flusso informativo.<br>
              <span style="opacity:0.65;text-transform:uppercase;font-size:8.5px;letter-spacing:0.05em;display:block;margin-top:6px;">
                Generato da ${escapeHtml(hotelName)} Ledger Core
              </span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

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
