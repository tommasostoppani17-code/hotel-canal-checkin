import QRCode from 'qrcode';
import { Resend } from 'resend';

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function publicBaseUrl() {
  return (env('PUBLIC_URL', 'http://localhost:3000') || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function checkinPublicUrl() {
  return `${publicBaseUrl()}/`;
}

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 512,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#124453', light: '#FFFFFF' },
  });
}

/**
 * Poster A4 in HTML email-ready: stampa da client mail (Cmd/Ctrl+P).
 * QR remoto da PUBLIC_URL/qr-checkin.png (alta definizione, 0 allegati pesanti).
 */
export function buildPosterEmailHtml({
  hotelName = 'Hotel Canal',
  address = 'Santa Croce 553 · Venezia',
  qrSrc,
} = {}) {
  const brand = escapeHtml(hotelName);
  const place = escapeHtml(address);
  const qr = escapeHtml(qrSrc || `${publicBaseUrl()}/qr-checkin.png`);

  return `
<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${brand} — Poster Reception A4</title>
  <style type="text/css">
    :root { color-scheme: light only; }
    img { display: block; max-width: 100%; height: auto; border: 0; }
    html, body, table, td, p, div, h1, span {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    html, body { background-color: #FFFFFF !important; color: #1D1D1F !important; }
    @media (prefers-color-mode: dark) {
      body, table, td, .email-bg, .wrapper { background-color: #FFFFFF !important; color: #1D1D1F !important; }
      td, p, h1, span, div { color: #1D1D1F !important; }
      .qr-plate { background-color: #FFFFFF !important; border: 1px solid #124453 !important; }
      .lang-badge { background-color: rgba(18, 68, 83, 0.05) !important; color: #124453 !important; }
    }
    @media print {
      body { background: #FFFFFF !important; }
      .email-bg { padding: 0 !important; }
      .wrapper { border: none !important; max-width: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#FFFFFF !important;color:#1D1D1F !important;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-bg" style="background-color:#FFFFFF !important;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" class="wrapper" border="0" cellspacing="0" cellpadding="0" style="max-width:500px;background-color:#FFFFFF !important;border:1px solid #E5E5EA;border-top:6px solid #124453;border-radius:4px;">
          <tr>
            <td style="padding:52px 36px 40px 36px;">

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding:0 0 44px 0;border-bottom:1px solid #E5E5EA;">
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;letter-spacing:0.08em;color:#124453 !important;text-transform:uppercase;line-height:1;">
                      ${brand}
                    </div>
                    <div style="font-family:Georgia,'Times New Roman',serif;font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.25em;color:#C5A059 !important;margin-top:10px;">
                      ${place}
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:44px 12px 28px 12px;">
                    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;color:#124453 !important;line-height:1.4;margin:0 0 18px 0;letter-spacing:0.02em;text-transform:uppercase;text-align:center;">
                      Fast Check-in &amp;<br>Welcome Privilege
                    </h1>
                    <p style="font-size:13.5px;line-height:1.65;color:#48484A !important;font-weight:500;margin:0;text-align:center;">
                      Inquadra il codice per attivare all'istante i servizi digitali della tua camera e sbloccare l'esclusivo voucher di benvenuto per la tua esperienza a Venezia.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 24px 0;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0" class="qr-plate" style="background-color:#FFFFFF !important;border:1px solid #124453;border-radius:18px;">
                      <tr>
                        <td style="padding:18px;">
                          <img src="${qr}" width="180" height="180" alt="Fast Check-in QR" style="display:block;width:180px;height:180px;border:0;">
                        </td>
                      </tr>
                    </table>
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#124453 !important;margin-top:14px;">
                      Scan with your smartphone
                    </div>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="padding:0 0 40px 0;">
                    <span class="lang-badge" style="font-size:10px;font-weight:700;background-color:rgba(18,68,83,0.05);color:#124453 !important;padding:5px 10px;border-radius:4px;margin:0 2px;letter-spacing:0.02em;display:inline-block;">IT</span>
                    <span class="lang-badge" style="font-size:10px;font-weight:700;background-color:rgba(18,68,83,0.05);color:#124453 !important;padding:5px 10px;border-radius:4px;margin:0 2px;letter-spacing:0.02em;display:inline-block;">EN</span>
                    <span class="lang-badge" style="font-size:10px;font-weight:700;background-color:rgba(18,68,83,0.05);color:#124453 !important;padding:5px 10px;border-radius:4px;margin:0 2px;letter-spacing:0.02em;display:inline-block;">FR</span>
                    <span class="lang-badge" style="font-size:10px;font-weight:700;background-color:rgba(18,68,83,0.05);color:#124453 !important;padding:5px 10px;border-radius:4px;margin:0 2px;letter-spacing:0.02em;display:inline-block;">DE</span>
                    <span class="lang-badge" style="font-size:10px;font-weight:700;background-color:rgba(18,68,83,0.05);color:#124453 !important;padding:5px 10px;border-radius:4px;margin:0 2px;letter-spacing:0.02em;display:inline-block;">ES</span>
                  </td>
                </tr>

                <tr>
                  <td align="center" style="border-top:1px solid #E5E5EA;padding-top:18px;">
                    <p style="font-size:11px;color:#8E8E93 !important;font-weight:500;letter-spacing:0.02em;margin:0;text-transform:uppercase;">
                      Convenzione Lounge Esclusiva: Trattoria alla Terrazza Venezia
                    </p>
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
}

export async function sendPosterEmail({ to } = {}) {
  const apiKey = env('RESEND_API_KEY').trim();
  if (!apiKey) {
    throw new Error('RESEND_API_KEY non configurata');
  }

  const recipient =
    String(to || env('REPORT_EMAIL') || 'tommasostoppani17@gmail.com').trim();
  if (!recipient) {
    throw new Error('Destinatario poster non configurato');
  }

  const hotelName = env('HOTEL_NAME', 'Hotel Canal');
  const qrSrc = `${publicBaseUrl()}/qr-checkin.png`;
  const html = buildPosterEmailHtml({ hotelName, qrSrc });
  const from = env(
    'SMTP_FROM',
    'Welcome to Hotel Canal <onboarding@resend.dev>',
  );

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: `POSTER RECEPTION A4 — ${hotelName} (stampa)`,
    text: [
      `${hotelName} — Poster Reception A4`,
      ``,
      `Apri questa mail sul PC reception, stampa (Cmd/Ctrl+P),`,
      `margini nessuno, grafica di sfondo attiva.`,
      ``,
      `Check-in URL: ${checkinPublicUrl()}`,
      `QR: ${qrSrc}`,
    ].join('\n'),
    html,
  });

  if (error) {
    throw new Error(
      `Resend API error: ${error.message || JSON.stringify(error)}`.slice(
        0,
        300,
      ),
    );
  }

  return { to: recipient, id: data?.id || null, qrSrc };
}
