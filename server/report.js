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

export function buildCsv(rows) {
  const header = 'Data/Ora,Telefono,Email,Nome,Stanza,Receptionist';
  const lines = rows.map((row) =>
    [
      csvEscape(row.created_at),
      csvEscape(row.phone),
      csvEscape(row.email),
      csvEscape(row.guest_name),
      csvEscape(row.room_number),
      csvEscape(row.receptionist || 'RECEPTION'),
    ].join(','),
  );
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

function buildTableRows(rows) {
  if (!rows.length) {
    return `
      <tr>
        <td colspan="4" style="padding:12px;border-bottom:1px solid #E5E5EA;color:#8E8E93;text-align:center;">
          Nessun contatto in questa giornata
        </td>
      </tr>
    `;
  }

  return rows
    .map((row) => {
      const room = cleanCell(row.room_number);
      const name = cleanCell(row.guest_name);
      const phone = cleanCell(row.phone);
      const staff = cleanCell(row.receptionist) || 'RECEPTION';

      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);font-weight:700;color:#124453;">
            ${escapeHtml(room || '—')}
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);color:#1D1D1F;text-transform:uppercase;font-weight:500;">
            ${escapeHtml(name || 'NON SPECIFICATO')}
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13.5px;font-weight:600;color:#1D1D1F;">
            ${escapeHtml(phone)}
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);font-size:11px;color:#7F8C8D;font-weight:600;text-transform:uppercase;">
            ${escapeHtml(staff)}
          </td>
        </tr>
      `;
    })
    .join('');
}

export function buildReportEmail({ hotelName, count, dateLabel, rows = [] }) {
  const subject = `REPORT GIORNALIERO: ${count} Nuovi Ospiti Registrati — ${dateLabel}`;

  const listaSoloNumeri = rows.map((row) => row.phone).filter(Boolean).join(', ');

  const bloccoDatiAI = JSON.stringify(
    rows.map((row) => ({
      telefono: row.phone,
      email: row.email || 'NON SPECIFICATO',
      ospite: row.guest_name || 'NON SPECIFICATO',
      stanza: row.room_number || '—',
      receptionist: row.receptionist || 'RECEPTION',
      data: row.created_at,
    })),
    null,
    2,
  );

  const text = [
    `Ciao Payel,`,
    ``,
    `Report automatico ${hotelName}. Nuovi contatti: ${count}.`,
    `Data: ${dateLabel}`,
    ``,
    `Numeri: ${listaSoloNumeri || '—'}`,
    ``,
    `Il file CSV è allegato.`,
    ``,
    `— Sistema check-in ${hotelName}`,
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ECEFF4;color:#1D1D1F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:30px auto;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:24px;overflow:hidden;">
    <div style="background:#124453;padding:36px 24px;text-align:center;color:#FFFFFF;">
      <div style="font-family:Times New Roman,Times,Georgia,serif;font-size:24px;font-weight:700;letter-spacing:0.06em;margin-bottom:4px;">
        ${escapeHtml(hotelName)}
      </div>
      <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.25em;color:#A0C2CB;">
        Venice Experience
      </div>
    </div>

    <div style="padding:32px 24px;">
      <p style="font-size:14px;font-weight:600;margin:0 0 10px 0;">Ciao Payel,</p>
      <p style="font-size:13.5px;line-height:1.5;color:#515154;margin:0 0 24px 0;">
        Registro automatico dei contatti raccolti tramite QR in reception
        <span style="white-space:nowrap;">(${escapeHtml(dateLabel)})</span>.
      </p>

      <div style="background-color:rgba(18,68,83,0.04);border:1px dashed #124453;border-radius:14px;padding:24px;text-align:center;margin-bottom:32px;">
        <span style="font-size:42px;font-weight:700;color:#124453;display:block;line-height:1;margin-bottom:6px;">${count}</span>
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#515154;letter-spacing:0.08em;">
          Ospiti registrati nelle ultime 24 ore
        </span>
      </div>

      <h3 style="font-family:Times New Roman,Times,Georgia,serif;font-size:16px;font-weight:700;color:#124453;letter-spacing:0.04em;margin:0 0 16px 0;border-bottom:1px solid rgba(0,0,0,0.06);padding-bottom:8px;">
        Registro giornaliero
      </h3>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:32px;font-size:13px;">
        <thead>
          <tr>
            <th align="left" style="background-color:rgba(18,68,83,0.06);color:#124453;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:0.05em;text-align:left;padding:12px;">Stanza</th>
            <th align="left" style="background-color:rgba(18,68,83,0.06);color:#124453;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:0.05em;text-align:left;padding:12px;">Ospite</th>
            <th align="left" style="background-color:rgba(18,68,83,0.06);color:#124453;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:0.05em;text-align:left;padding:12px;">Telefono</th>
            <th align="left" style="background-color:rgba(18,68,83,0.06);color:#124453;font-weight:700;text-transform:uppercase;font-size:10px;letter-spacing:0.05em;text-align:left;padding:12px;">Staff</th>
          </tr>
        </thead>
        <tbody>
          ${buildTableRows(rows)}
        </tbody>
      </table>

      <h3 style="font-family:Times New Roman,Times,Georgia,serif;font-size:16px;font-weight:700;color:#124453;letter-spacing:0.04em;margin:0 0 8px 0;border-bottom:1px solid rgba(0,0,0,0.06);padding-bottom:8px;">
        Copia rapida lista numeri
      </h3>
      <p style="font-size:12px;color:#64748B;margin:0 0 12px 0;">Seleziona il box e copia tutti i numeri (separati da virgola):</p>
      <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:#334155;word-break:break-all;margin-bottom:32px;">
        ${escapeHtml(listaSoloNumeri || '—')}
      </div>

      <h3 style="font-family:Times New Roman,Times,Georgia,serif;font-size:16px;font-weight:700;color:#124453;letter-spacing:0.04em;margin:0 0 8px 0;border-bottom:1px solid rgba(0,0,0,0.06);padding-bottom:8px;">
        Dati strutturati (JSON)
      </h3>
      <p style="font-size:12px;color:#64748B;margin:0 0 12px 0;">Pronto per automazioni future / CRM / WhatsApp:</p>
      <pre style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:#334155;white-space:pre-wrap;word-break:break-word;margin:0 0 28px 0;max-height:220px;overflow:auto;">${escapeHtml(bloccoDatiAI)}</pre>

      <div style="font-size:11px;color:#8E8E93;line-height:1.5;border-top:1px solid #E5E5EA;padding-top:20px;text-align:center;">
        Il file sorgente <strong>.CSV</strong> è allegato a questa comunicazione.<br>
        <span style="opacity:0.7;">Sistema check-in ${escapeHtml(hotelName)} · 00:00 Europe/Rome</span>
      </div>
    </div>
  </div>
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
  const subject = `REPORT MENSILE STAFF — ${monthLabel} ${year}`;
  const totaleMese = Number(totals?.totale_mese || 0);
  const totaleCoupon = Number(totals?.totale_coupon || 0);

  const rowsHtml = ranking
    .map((row, index) => {
      const bg =
        index === 0 ? 'background-color:rgba(197,160,89,0.10);' : '';
      const pos =
        index === 0
          ? '1'
          : `${index + 1}`;
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);font-weight:700;color:#124453;${bg}">${pos}</td>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);text-transform:uppercase;font-weight:600;${bg}">${escapeHtml(row.receptionist)}</td>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:center;font-weight:700;${bg}">${row.totale_registrati}</td>
          <td style="padding:14px 12px;border-bottom:1px solid rgba(0,0,0,0.04);text-align:center;color:#124453;font-weight:600;${bg}">${row.coupon_emessi}</td>
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

  const html = `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ECEFF4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1D1D1F;">
  <div style="max-width:600px;margin:30px auto;background:#FFFFFF;border:1px solid #E5E5EA;border-radius:24px;overflow:hidden;">
    <div style="background:#124453;padding:40px 24px;text-align:center;color:#FFFFFF;">
      <div style="font-family:Times New Roman,Times,Georgia,serif;font-size:24px;font-weight:700;letter-spacing:0.06em;">${escapeHtml(hotelName)}</div>
      <div style="font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:0.25em;color:#A0C2CB;margin-top:6px;">Performance Reception</div>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="font-family:Times New Roman,Times,Georgia,serif;font-size:18px;margin:0 0 24px;text-align:center;color:#1D1D1F;">
        Analisi conversioni — ${escapeHtml(monthLabel)} ${year}
      </h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td width="50%" style="padding-right:8px;">
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:20px;text-align:center;">
              <span style="font-size:32px;font-weight:700;color:#124453;display:block;">${totaleMese}</span>
              <span style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:#64748B;letter-spacing:0.05em;">Anagrafiche</span>
            </div>
          </td>
          <td width="50%" style="padding-left:8px;">
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;padding:20px;text-align:center;">
              <span style="font-size:32px;font-weight:700;color:#124453;display:block;">${totaleCoupon}</span>
              <span style="font-size:10.5px;font-weight:700;text-transform:uppercase;color:#64748B;letter-spacing:0.05em;">Coupon ristorante</span>
            </div>
          </td>
        </tr>
      </table>

      <h3 style="font-family:Times New Roman,Times,Georgia,serif;font-size:16px;font-weight:700;color:#124453;margin:0 0 16px;border-bottom:2px solid #124453;padding-bottom:6px;">
        Classifica performance reception
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13.5px;">
        <thead>
          <tr>
            <th align="left" style="background:rgba(18,68,83,0.06);color:#124453;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;padding:12px;">Pos.</th>
            <th align="left" style="background:rgba(18,68,83,0.06);color:#124453;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;padding:12px;">Receptionist</th>
            <th align="center" style="background:rgba(18,68,83,0.06);color:#124453;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;padding:12px;">Contatti</th>
            <th align="center" style="background:rgba(18,68,83,0.06);color:#124453;font-size:10px;text-transform:uppercase;letter-spacing:0.05em;padding:12px;">Coupon</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>

      <div style="font-size:11px;color:#8E8E93;line-height:1.5;border-top:1px solid #E5E5EA;padding-top:24px;text-align:center;margin-top:32px;">
        CSV di audit mensile in allegato.<br>
        <span style="opacity:0.7;">Sistema check-in ${escapeHtml(hotelName)}</span>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text = [
    subject,
    ``,
    `Anagrafiche: ${totaleMese}`,
    `Coupon: ${totaleCoupon}`,
    ``,
    ...ranking.map(
      (row, i) =>
        `${i + 1}. ${row.receptionist} — ${row.totale_registrati} contatti, ${row.coupon_emessi} coupon`,
    ),
  ].join('\n');

  return { subject, text, html, csv };
}
