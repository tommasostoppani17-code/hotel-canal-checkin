import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    'Hotel Canal Venice <onboarding@resend.dev>',
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

function mapsDirectionsUrl() {
  // Percorso a piedi: Hotel Canal (Santa Croce 553) → Trattoria alla Terrazza
  return (
    env('RESTAURANT_MAPS_URL') ||
    'https://www.google.com/maps/dir/?api=1&origin=Hotel+Canal,+Santa+Croce+553,+30135+Venezia+VE,+Italy&destination=Trattoria+alla+Terrazza,+Venezia&travelmode=walking'
  );
}

function emailAssetPath(...parts) {
  return path.join(__dirname, '..', 'public', ...parts);
}

function readEmailAsset(...parts) {
  try {
    const p = emailAssetPath(...parts);
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch (_) {
    /* ignore */
  }
  return null;
}

function buildWelcomeHtml({
  guestName,
  roomNumber,
  receptionist,
  guestsCount,
  qrSrc,
  mapsUrl,
  heroSrc,
  restaurantSrc,
}) {
  const name = escapeHtml(guestName || 'OSPITE');
  const room = escapeHtml(roomNumber || 'DA ASSEGNARE');
  const staff = escapeHtml(receptionist || 'RECEPTION');
  const guests = escapeHtml(String(guestsCount ?? 2));
  const maps = escapeHtml(mapsUrl);
  const hero = escapeHtml(heroSrc);
  const resto = escapeHtml(restaurantSrc);
  const preheader = escapeHtml(
    `Camera ${roomNumber || 'da assegnare'} · Check-in 14:00 · Voucher 10% Trattoria alla Terrazza`,
  );

  const stepRows = [
    {
      icon: '🛶',
      text: 'Esca dall&rsquo;hotel e <strong style="color:#124453;">giri subito a destra</strong> lungo la Fondamenta, costeggiando il Canal Grande.',
    },
    {
      icon: '🧭',
      text: 'Cammini dritto per circa 150 metri tenendo l&rsquo;acqua alla sinistra, fino al primo <strong style="color:#124453;">ponte in pietra</strong>.',
    },
    {
      icon: '🔑',
      text: '<strong style="color:#124453;">NON attraversi il ponte</strong>. Subito prima dei gradini, giri a destra nella calle stretta (sotoportego).',
    },
    {
      icon: '🍷',
      text: 'Circa 50 passi: sbucher&agrave; sul campiello della <strong style="color:#124453;">Trattoria alla Terrazza</strong>, affacciata sull&rsquo;acqua.',
    },
  ]
    .map(
      (step, i) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${i === 3 ? '0' : '14px'} 0;">
          <tr>
            <td width="40" valign="top" style="padding-right:10px;">
              <div style="width:32px;height:32px;border-radius:50%;background-color:#124453;color:#FFFFFF;font-size:15px;line-height:32px;text-align:center;">${step.icon}</div>
            </td>
            <td valign="middle" style="font-family:Georgia,'Times New Roman',serif;font-size:13.5px;line-height:1.6;color:#334155 !important;font-weight:500;">
              ${step.text}
            </td>
          </tr>
        </table>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Benvenuto — Hotel Canal Venezia</title>
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light only; }
    img { display: block; max-width: 100%; height: auto; border: 0; outline: none; }
    @media (prefers-color-scheme: dark) {
      .email-bg, .email-card, .email-content, .room-badge, .route-card, .voucher-body {
        background-color: #FFFFFF !important;
      }
      .text-main, .text-muted, .email-content, .email-content p, .email-content td, .email-content div, .email-content strong {
        color: #1D1D1F !important;
      }
      .brand-title { color: #124453 !important; }
      .route-card { background-color: #FFFDF9 !important; border-color: #E6DFD3 !important; }
      .room-badge { background-color: #F4F7F9 !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:#FFFFFF !important;color:#1D1D1F !important;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#FFFFFF;">
    ${preheader}
  </div>
  <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr>
      <td align="center" style="padding:24px 12px;background-color:#FFFFFF !important;">
        <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E5E5EA;">
          <tr>
            <td style="padding:0;line-height:0;font-size:0;background-color:#124453;">
              <img src="${hero}" width="500" height="180" alt="Hotel Canal — Venezia" style="display:block;width:100%;max-width:500px;height:auto;border:0;">
            </td>
          </tr>
          <tr>
            <td align="center" style="background-color:#124453;padding:18px 24px 22px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;letter-spacing:0.08em;color:#FFFFFF;text-transform:uppercase;">Hotel Canal</div>
              <div style="font-family:Georgia,serif;font-size:9px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#A0C2CB;margin-top:4px;">Santa Croce 553 · Venezia</div>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding:36px 28px 44px;background-color:#FFFFFF !important;">
              <p class="brand-title text-main" style="font-family:Georgia,'Times New Roman',serif;font-size:16px;font-weight:700;color:#124453 !important;margin:0 0 16px;letter-spacing:0.02em;">Gentile ${name},</p>
              <p class="text-muted" style="font-size:14px;line-height:1.65;color:#334155 !important;margin:0 0 28px;font-weight:400;">
                Benvenuto a Venezia. Siamo felici di ospitarla all&rsquo;Hotel Canal.
                Orari, percorso a piedi al ristorante partner e il pass di benvenuto sono qui sotto.
              </p>
              <table role="presentation" class="room-badge" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 36px;background-color:#F4F7F9 !important;border-radius:16px;border:1px solid rgba(18,68,83,0.06);">
                <tr>
                  <td align="center" style="padding:18px;">
                    <span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#64748B !important;letter-spacing:0.08em;display:block;margin-bottom:4px;">Stanza assegnata</span>
                    <strong class="brand-title" style="font-family:Georgia,serif;font-size:22px;color:#124453 !important;font-weight:700;letter-spacing:0.04em;">CAMERA ${room}</strong>
                  </td>
                </tr>
              </table>
              <p class="brand-title" style="font-family:Georgia,serif;font-size:13.5px;font-weight:700;color:#124453 !important;border-bottom:1px solid rgba(18,68,83,0.12);padding-bottom:6px;margin:0 0 12px;letter-spacing:0.06em;text-transform:uppercase;">Orari della struttura</p>
              <p class="text-muted" style="font-size:14px;line-height:1.65;color:#48484A !important;margin:0 0 36px;font-weight:400;">
                <strong style="color:#124453 !important;">Check-in:</strong> dalle ore 14:00<br>
                <strong style="color:#124453 !important;">Check-out:</strong> entro le ore 10:30
              </p>
              <p class="brand-title" style="font-family:Georgia,serif;font-size:13.5px;font-weight:700;color:#124453 !important;border-bottom:1px solid rgba(18,68,83,0.12);padding-bottom:6px;margin:0 0 12px;letter-spacing:0.06em;text-transform:uppercase;">Come raggiungere la Trattoria alla Terrazza</p>
              <p class="text-muted" style="font-size:14px;line-height:1.6;color:#48484A !important;margin:0 0 18px;font-weight:400;">
                Parta dall&rsquo;ingresso dell&rsquo;<strong style="color:#124453 !important;">Hotel Canal (Santa Croce 553)</strong> e segua questa guida:
              </p>
              <table role="presentation" class="route-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;background-color:#FFFDF9 !important;border:1px solid #E6DFD3;border-radius:16px;">
                <tr>
                  <td style="padding:20px 18px;">
                    ${stepRows}
                  </td>
                </tr>
              </table>
              <a href="${maps}" target="_blank" style="display:block;text-align:center;background-color:#124453;color:#FFFFFF !important;text-decoration:none;padding:15px;border-radius:12px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 44px;">
                Apri il navigatore (Google Maps)
              </a>
              <p class="brand-title" style="font-family:Georgia,serif;font-size:13.5px;font-weight:700;color:#124453 !important;border-bottom:1px solid rgba(18,68,83,0.12);padding-bottom:6px;margin:0 0 12px;letter-spacing:0.06em;text-transform:uppercase;">Privilegio di benvenuto</p>
              <p class="text-muted" style="font-size:14px;line-height:1.65;color:#48484A !important;margin:0 0 22px;font-weight:400;">
                Presentando questo pass al cameriere <strong style="color:#124453 !important;">prima di ordinare</strong>, ricever&agrave; uno
                <strong style="color:#124453 !important;">sconto del 10%</strong> sul totale, valido per tutti i componenti della stanza.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1.5px solid #124453;border-radius:20px;overflow:hidden;margin:0 0 8px;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:#124453;">
                    <img src="${resto}" width="500" height="170" alt="Trattoria alla Terrazza" style="display:block;width:100%;max-width:500px;height:auto;border:0;">
                  </td>
                </tr>
                <tr>
                  <td class="voucher-body" align="center" style="padding:28px 22px;background-color:#FFFFFF !important;">
                    <div class="brand-title" style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#124453 !important;letter-spacing:0.04em;">VOUCHER SCONTO 10%</div>
                    <div style="font-size:11px;color:#8E8E93 !important;font-weight:500;margin-top:4px;text-transform:uppercase;letter-spacing:0.04em;">Trattoria alla Terrazza — Convenzione ospiti</div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:22px auto;">
                      <tr>
                        <td align="center" style="background:#FFFFFF;padding:10px;border-radius:12px;border:1px solid #E5E5EA;">
                          <img src="${qrSrc}" width="140" height="140" alt="Voucher QR Code" style="display:block;width:140px;height:140px;margin:0 auto;border:0;">
                        </td>
                      </tr>
                    </table>
                    <div style="font-size:10px;font-weight:600;color:#124453 !important;text-transform:uppercase;letter-spacing:0.06em;background:rgba(18,68,83,0.04);padding:8px 16px;border-radius:6px;display:inline-block;line-height:1.5;">
                      Camera: ${room} · Check-in: ${staff} · Pax: ${guests}
                    </div>
                  </td>
                </tr>
              </table>
              <p class="brand-title" style="font-size:13.5px;font-weight:500;text-align:center;margin:44px 0 0;color:#124453 !important;font-family:Georgia,serif;letter-spacing:0.02em;line-height:1.5;">
                Le auguriamo un soggiorno indimenticabile.<br>
                <span style="display:block;font-size:9.5px;color:#8E8E93 !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-top:8px;">
                  La Direzione — Hotel Canal Venezia
                </span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildCouponRedeemPage({
  receptionist,
  roomNumber,
  guestName,
  guestsCount,
}) {
  const staff = escapeHtml(receptionist || 'RECEPTION');
  const room = roomNumber ? escapeHtml(roomNumber) : '—';
  const guest = guestName ? escapeHtml(guestName) : '';
  const guests = guestsCount != null ? escapeHtml(String(guestsCount)) : '—';

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
    .meta { font-size: 13px; color: #515154; line-height: 1.55; margin: 0; }
    .staff {
      margin-top: 22px; padding: 14px; border-radius: 12px;
      background: rgba(18,68,83,0.06); border: 1px dashed var(--canal);
    }
    .staff strong { display: block; font-size: 18px; color: var(--canal); margin-top: 4px; letter-spacing: 0.04em; }
    .staff span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748B; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; text-align: left; }
    .cell { background: #F8FAFC; border-radius: 10px; padding: 10px 12px; border: 1px solid #E2E8F0; }
    .cell span { display: block; font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748B; }
    .cell strong { font-size: 14px; color: var(--canal); }
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">Trattoria alla Terrazza</div>
    <h1>Coupon attivo</h1>
    <p class="meta">Ristorante tipico veneziano con vista sul canale</p>
    <div class="discount">−10%</div>
    <p class="meta">${guest ? `Ospite: <strong>${guest}</strong>` : ''}</p>
    <div class="grid">
      <div class="cell"><span>Stanza</span><strong>${room}</strong></div>
      <div class="cell"><span>Ospiti</span><strong>${guests}</strong></div>
    </div>
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
      attachments: attachments.map((a) => {
        const content =
          Buffer.isBuffer(a.content)
            ? a.content.toString('base64')
            : a.content;
        return {
          filename: a.filename,
          content,
          contentType: a.contentType || 'image/png',
          ...(a.contentId ? { contentId: a.contentId } : {}),
        };
      }),
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
      content: Buffer.isBuffer(a.content)
        ? a.content
        : Buffer.from(String(a.content), 'base64'),
      contentType: a.contentType || undefined,
      cid: a.contentId || undefined,
      contentDisposition: a.contentId ? 'inline' : 'attachment',
    })),
  });
}

/** Instant concierge welcome + restaurant coupon QR (always on registration). */
export async function sendWelcomeEmail({
  to,
  guestName,
  roomNumber,
  receptionist,
  guestsCount,
  token,
}) {
  const redeemUrl = couponRedeemUrl(token);
  const qrPng = await buildCouponQrPng(token);
  const qrCid = 'coupon_qr_code';
  const heroCid = 'venice_hero';
  const restoCid = 'restaurant_photo';
  const mapsUrl = mapsDirectionsUrl();

  const heroBuf =
    readEmailAsset('email', 'hero-venice.jpg') ||
    readEmailAsset('venice-bg.jpg');
  // Copertina voucher: terrazza/tavolo sul canale
  const restoBuf =
    readEmailAsset('restaurant', 'terrazza.jpg') ||
    readEmailAsset('restaurant', '11-tavolo-canale.jpg') ||
    readEmailAsset('restaurant', '01-terrazza-canale.jpg') ||
    readEmailAsset('restaurant', 'ingresso.jpg');
  const heroSrc = heroBuf
    ? `cid:${heroCid}`
    : `${publicBaseUrl()}/email/hero-venice.jpg`;
  const restaurantSrc = restoBuf
    ? `cid:${restoCid}`
    : `${publicBaseUrl()}/restaurant/terrazza.jpg`;

  const html = buildWelcomeHtml({
    guestName,
    roomNumber,
    receptionist,
    guestsCount,
    qrSrc: `cid:${qrCid}`,
    mapsUrl,
    heroSrc,
    restaurantSrc,
  });

  const room = roomNumber || 'DA ASSEGNARE';
  const staff = receptionist || 'RECEPTION';
  const guests = guestsCount ?? 2;

  const attachments = [
    {
      filename: 'coupon-qr.png',
      content: qrPng.toString('base64'),
      contentType: 'image/png',
      contentId: qrCid,
    },
  ];
  if (heroBuf) {
    attachments.push({
      filename: 'venice-hero.jpg',
      content: heroBuf.toString('base64'),
      contentType: 'image/jpeg',
      contentId: heroCid,
    });
  }
  if (restoBuf) {
    attachments.push({
      filename: 'trattoria.jpg',
      content: restoBuf.toString('base64'),
      contentType: 'image/jpeg',
      contentId: restoCid,
    });
  }

  await sendMail({
    to,
    subject: 'Benvenuto a Venezia — Hotel Canal (Santa Croce 553)',
    text: [
      `Gentile ${guestName || 'Ospite'},`,
      '',
      'Benvenuto a Venezia — Hotel Canal, Santa Croce 553.',
      'Check-in: dalle 14:00 · Check-out: entro le 10:30',
      `Camera: ${room}`,
      '',
      'Come raggiungere Trattoria alla Terrazza a piedi:',
      '1) Esci e gira a destra lungo la Fondamenta (Canal Grande a sinistra).',
      '2) Circa 150 m fino al primo ponte in pietra.',
      '3) NON attraversare: subito prima, gira a destra nel sotoportego.',
      '4) 50 passi e arrivi alla terrazza sull\'acqua.',
      `Maps: ${mapsUrl}`,
      '',
      'Voucher sconto 10%: mostra il QR di questa email al cameriere.',
      `Link coupon: ${redeemUrl}`,
      `Check-in staff: ${staff} · Pax: ${guests}`,
      '',
      'La Direzione — Hotel Canal Venezia',
    ].join('\n'),
    html,
    attachments,
  });
}

/** @deprecated use sendWelcomeEmail — kept for compatibility */
export async function sendRestaurantCoupon(opts) {
  return sendWelcomeEmail(opts);
}
