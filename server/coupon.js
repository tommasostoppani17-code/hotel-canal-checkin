import QRCode from 'qrcode';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function resendConfigured() {
  return Boolean(env('RESEND_API_KEY').trim());
}

function smtpConfigured() {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getFrom() {
  return env(
    'SMTP_FROM',
    'Hotel Canal Check-in <onboarding@resend.dev>',
  );
}

export function publicBaseUrl() {
  return (env('PUBLIC_URL', 'http://localhost:3000') || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

export function couponRedeemUrl(token) {
  return `${publicBaseUrl()}/coupon/${token}`;
}

export async function buildCouponQrPng(token) {
  return QRCode.toBuffer(couponRedeemUrl(token), {
    type: 'png',
    width: 360,
    margin: 1,
    color: { dark: '#124453', light: '#FFFFFF' },
  });
}

function buildCouponHtml({ receptionist, guestName, redeemUrl, qrDataUrl }) {
  const staff = escapeHtml(receptionist || 'RECEPTION');
  const guest = guestName
    ? `<p style="font-size:13px;color:#515154;margin:0 0 8px 0;">Ciao ${escapeHtml(guestName)},</p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;text-align:center;">
  <div style="max-width:400px;margin:0 auto;background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E5E5EA;">
    <div style="background:#124453;padding:24px;color:#FFFFFF;">
      <div style="font-family:Times New Roman,Times,Georgia,serif;font-size:22px;letter-spacing:0.05em;margin:0;">Trattoria alla Terrazza</div>
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:#A0C2CB;margin-top:6px;">Ristorante tipico veneziano · Vista canale</div>
    </div>
    <div style="padding:28px 24px;">
      ${guest}
      <p style="font-size:14px;color:#515154;margin:0 0 16px 0;line-height:1.45;">
        Grazie per il check-in all'Hotel Canal. Ecco il tuo coupon di benvenuto.
      </p>
      <div style="font-size:36px;font-weight:800;color:#124453;line-height:1;margin:8px 0;">SCONTO 10%</div>
      <p style="font-size:12px;color:#8E8E93;margin:0 0 20px 0;">Valido per tutta la durata del soggiorno.</p>
      <div style="margin:0 auto 20px;padding:12px;background:#F8FAFC;border-radius:12px;display:inline-block;border:1px solid #E2E8F0;">
        <img src="${qrDataUrl}" width="180" height="180" alt="Coupon QR" style="display:block;">
      </div>
      <p style="font-size:12px;color:#64748B;margin:0 0 16px 0;line-height:1.4;">
        Mostra questo QR al ristorante. Il cameriere lo scannerizza e conferma lo sconto.
      </p>
      <div style="background:#F4F6F9;border-radius:8px;padding:10px 12px;font-size:11px;color:#515154;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">
        Presentato da: ${staff}
      </div>
      <p style="font-size:11px;color:#94A3B8;margin:16px 0 0;word-break:break-all;">
        <a href="${escapeHtml(redeemUrl)}" style="color:#124453;">${escapeHtml(redeemUrl)}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function buildCouponRedeemPage({ receptionist, roomNumber, guestName }) {
  const staff = escapeHtml(receptionist || 'RECEPTION');
  const room = roomNumber ? escapeHtml(roomNumber) : '—';
  const guest = guestName ? escapeHtml(guestName) : '';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sconto 10% — Trattoria alla Terrazza</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --canal: #124453; }
    body {
      margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      font-family: Montserrat, -apple-system, sans-serif; padding: 24px;
      background: linear-gradient(160deg, #0A2D37 0%, #124453 55%, #1a5a6b 100%);
      color: #1D1D1F; -webkit-font-smoothing: antialiased;
    }
    .card {
      width: 100%; max-width: 380px; background: rgba(255,255,255,0.92);
      backdrop-filter: blur(24px); border-radius: 24px; padding: 36px 28px; text-align: center;
      border: 1px solid rgba(255,255,255,0.7);
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    }
    .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #5C7A82; margin-bottom: 10px; }
    h1 { font-family: Cinzel, Georgia, serif; font-size: 22px; color: var(--canal); margin: 0 0 8px; }
    .discount { font-size: 42px; font-weight: 700; color: var(--canal); margin: 18px 0 6px; letter-spacing: 0.02em; }
    .meta { font-size: 13px; color: #515154; line-height: 1.5; margin: 0; }
    .staff {
      margin-top: 22px; padding: 14px; border-radius: 12px;
      background: rgba(18,68,83,0.06); border: 1px dashed var(--canal);
    }
    .staff strong { display: block; font-size: 18px; color: var(--canal); margin-top: 4px; letter-spacing: 0.04em; }
    .staff span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; }
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">Trattoria alla Terrazza</div>
    <h1>Coupon attivo</h1>
    <p class="meta">Ristorante tipico veneziano con vista sul canale</p>
    <div class="discount">−10%</div>
    <p class="meta">${guest ? `Ospite: <strong>${guest}</strong><br>` : ''}Stanza: <strong>${room}</strong></p>
    <div class="staff">
      <span>Presentato da</span>
      <strong>${staff}</strong>
    </div>
  </div>
</body>
</html>`;
}

async function sendMail({ to, subject, text, html, attachments = [] }) {
  if (resendConfigured()) {
    const resend = new Resend(env('RESEND_API_KEY').trim());
    const { data, error } = await resend.emails.send({
      from: getFrom(),
      to: [to],
      subject,
      text,
      html,
      attachments,
    });
    if (error) {
      throw new Error(error.message || JSON.stringify(error));
    }
    return data;
  }

  if (!smtpConfigured()) {
    throw new Error('Email non configurata');
  }

  const transporter = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT', '587')),
    secure: env('SMTP_SECURE', 'false') === 'true',
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });

  await transporter.sendMail({
    from: getFrom(),
    to,
    subject,
    text,
    html,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });
}

export async function sendRestaurantCoupon({
  to,
  receptionist,
  guestName,
  token,
}) {
  const redeemUrl = couponRedeemUrl(token);
  const qrPng = await buildCouponQrPng(token);
  const qrDataUrl = `data:image/png;base64,${qrPng.toString('base64')}`;
  const html = buildCouponHtml({
    receptionist,
    guestName,
    redeemUrl,
    qrDataUrl,
  });

  await sendMail({
    to,
    subject: 'Il tuo sconto 10% — Trattoria alla Terrazza',
    text: [
      'Hotel Canal — Trattoria alla Terrazza',
      'Sconto 10% sul tuo soggiorno.',
      `Presentato da: ${receptionist}`,
      `Mostra questo link al ristorante: ${redeemUrl}`,
    ].join('\n'),
    html,
    attachments: [
      {
        filename: 'coupon-trattoria-terrazza.png',
        content: qrPng,
      },
    ],
  });
}
