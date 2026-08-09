import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { resolveWelcomeLang, welcomeCopy } from './welcome-i18n.js';

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
    'Welcome to Hotel Canal <onboarding@resend.dev>',
  );
}

export function publicBaseUrl() {
  return (env('PUBLIC_URL', 'http://localhost:3000') || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

/** Absolute URL for a file under /public (remote assets → email sotto 102KB Gmail). */
function publicAssetUrl(...parts) {
  const rel = parts
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `${publicBaseUrl()}/${rel}`;
}

/** True when PUBLIC_URL is a stable public HTTPS host (e.g. Render). */
function canUseRemoteEmailAssets() {
  const mode = env('EMAIL_ASSETS', 'auto').trim().toLowerCase();
  if (mode === 'remote') return true;
  if (mode === 'cid') return false;
  const base = publicBaseUrl();
  if (!/^https:\/\//i.test(base)) return false;
  // Tunnel / local: Gmail cannot fetch these → CID fallback (but Gmail clips if too heavy)
  if (
    /(localhost|127\.0\.0\.1|trycloudflare\.com|ngrok|loca\.lt|cloudflaretunnel)/i.test(
      base,
    )
  ) {
    return false;
  }
  return true;
}

function assertInlineImages(html, attachments) {
  const needed = new Set(
    [...String(html).matchAll(/\bcid:([A-Za-z0-9_.+-]+)/g)].map((m) => m[1]),
  );
  const have = new Set(
    attachments.filter((a) => a.contentId).map((a) => a.contentId),
  );
  const missing = [...needed].filter((id) => !have.has(id));
  if (missing.length) {
    throw new Error(
      `Email immagini CID mancanti: ${missing.join(', ')}. Allegati: ${[...have].join(', ') || '(nessuno)'}`,
    );
  }
}

export function couponRedeemUrl(token) {
  return `${publicBaseUrl()}/coupon/${encodeURIComponent(token)}`;
}

export function couponClaimUrl(token) {
  return `${publicBaseUrl()}/coupon/claim/${encodeURIComponent(token)}`;
}

export async function buildCouponQrPng(token) {
  return QRCode.toBuffer(couponRedeemUrl(token), {
    type: 'png',
    width: 220,
    margin: 1,
    color: { dark: '#164E5B', light: '#FFFFFF' },
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
  wifiSsid,
  wifiPassword,
  doorWalter,
  doorAirone,
  lang = 'en',
  includeCoupon = true,
  claimUrl = '',
}) {
  const lp = welcomeCopy(lang);
  const C = '#164E5B';
  const BOX = '#E9EEF0';
  const WHITE = '#FFFFFF';
  const BRASS = '#B79A63';
  const SERIF = "'Cormorant Garamond',Georgia,'Times New Roman',serif";
  const BODY = "'EB Garamond',Georgia,'Times New Roman',serif";
  const SANS =
    "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const bodyStyle = `font-family:${BODY};font-style:italic;font-size:14.5px;line-height:1.55;font-weight:400`;
  const labelStyle = `font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#8A949C !important`;

  const name = escapeHtml(guestName || lp.guestFallback);
  const room = escapeHtml(roomNumber || lp.roomFallback);
  const staff = escapeHtml(receptionist || 'RECEPTION');
  const guests = escapeHtml(String(guestsCount ?? 2));
  const maps = escapeHtml(mapsUrl);
  const claim = escapeHtml(claimUrl);
  const hero = escapeHtml(heroSrc);
  const resto = escapeHtml(restaurantSrc);
  const wifiSsidSafe = escapeHtml(wifiSsid || 'hotel canal');
  const wifiPasswordSafe = escapeHtml(wifiPassword || '-');
  const doorWalterSafe = escapeHtml(doorWalter || '5358#');
  const doorAironeSafe = escapeHtml(doorAirone || '532E');
  const preheader = escapeHtml(
    includeCoupon ? lp.preheader(roomNumber) : lp.preheaderNoCoupon,
  );

  const sectionHead = (label) => `
              <div style="font-family:${SERIF};font-size:13px;font-weight:700;color:${C} !important;letter-spacing:0.14em;text-transform:uppercase;margin:0 0 14px;padding:0 0 10px;border-bottom:1px solid #1D1D1F;">
                ${label}
              </div>`;

  const routeSteps = [
    { n: '01', title: lp.step1Title, line: lp.step1Line },
    { n: '02', title: lp.step2Title, line: lp.step2Line },
    { n: '03', title: lp.step3Title, line: lp.step3Line },
    { n: '04', title: lp.step4Title, line: lp.step4Line },
  ];
  const stepRows = routeSteps
    .map(
      (step, i) => `
        <tr>
          <td width="36" valign="top" style="padding:12px 10px 12px 0;font-family:${SERIF};font-size:16px;font-weight:700;color:${C} !important;border-bottom:${i === routeSteps.length - 1 ? '0' : '1px solid #E8E4DC'};">
            ${step.n}
          </td>
          <td valign="top" style="padding:12px 0;border-bottom:${i === routeSteps.length - 1 ? '0' : '1px solid #E8E4DC'};">
            <div style="font-family:${SANS};font-size:13px;font-weight:700;color:#1D1D1F !important;letter-spacing:0.02em;line-height:1.3;margin:0 0 3px;">${step.title}</div>
            <div style="font-family:${BODY};font-style:italic;font-size:13.5px;line-height:1.4;color:#5C6670 !important;">${step.line}</div>
          </td>
        </tr>`,
    )
    .join('');

  const voucherBlock = includeCoupon
    ? `
              ${sectionHead(lp.discountTitle)}
              <p style="${bodyStyle};color:#4A5560 !important;margin:0 0 16px;">
                ${lp.discountBefore}<strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.discountBold1}</strong>${lp.discountMid}
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.discountBold2}</strong>${lp.discountAfter}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1.5px solid ${C};border-radius:18px;overflow:hidden;margin:0 0 36px;background-color:#FFFFFF;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${C};">
                    <img src="${resto}" width="452" alt="Trattoria alla Terrazza" style="display:block;width:100%;max-width:452px;height:auto;border:0;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px 18px 24px;background-color:#FFFFFF !important;">
                    <div style="font-family:${SERIF};font-size:18px;font-weight:700;color:${C} !important;letter-spacing:0.06em;text-transform:uppercase;">${lp.voucherTitle}</div>
                    <div style="font-family:${SANS};font-size:10px;color:#8E8E93 !important;font-weight:600;margin:6px 0 16px;text-transform:uppercase;letter-spacing:0.08em;">${lp.voucherSub}</div>
                    <img src="${escapeHtml(qrSrc)}" width="148" height="148" alt="Discount QR" style="display:block;width:148px;height:148px;margin:0 auto 14px;border:0;">
                    <div style="font-family:${SANS};font-size:11px;font-weight:600;color:${C} !important;letter-spacing:0.04em;text-transform:uppercase;">
                      ${lp.metaCamera} ${room} · ${lp.metaCheckin} ${staff} · ${lp.metaPax} ${guests}
                    </div>
                  </td>
                </tr>
              </table>`
    : `
              ${sectionHead(lp.claimTitle)}
              <p style="${bodyStyle};color:#4A5560 !important;margin:0 0 14px;text-align:left;">
                ${lp.claimDesc}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1.5px solid ${C};border-radius:18px;overflow:hidden;margin:0 0 36px;background-color:#FFFFFF;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${C};">
                    <img src="${resto}" width="452" alt="Trattoria alla Terrazza" style="display:block;width:100%;max-width:452px;height:auto;border:0;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:22px 18px 24px;background-color:#FFFFFF !important;">
                    <a href="${claim}" target="_blank" style="display:inline-block;text-align:center;background-color:${C};color:#FFFFFF !important;text-decoration:none;padding:14px 22px;border-radius:10px;font-family:${SANS};font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:0.08em;">
                      ${lp.claimBtn}
                    </a>
                  </td>
                </tr>
              </table>`;

  return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(lp.htmlTitle)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet">
  <style type="text/css">
    :root { color-scheme: light only; }
    img { display: block; max-width: 100%; height: auto; border: 0; }
    @media (prefers-color-scheme: dark) {
      .email-bg, .email-card, .email-content, .room-badge, .access-card { background-color: #FFFFFF !important; }
      td, p, div, strong, span { color: #1D1D1F !important; }
      .brand-title { color: ${C} !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:${WHITE} !important;color:#1D1D1F !important;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">${preheader}</div>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">${escapeHtml(String(claimUrl || qrSrc || Date.now()).slice(-24))}</div>
  <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" style="padding:24px 12px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:500px;background-color:#FFFFFF !important;">

          <!-- 1. HERO + BRAND -->
          <tr>
            <td style="padding:0 0 28px;">
              <img src="${hero}" width="500" alt="Hotel Canal Venice" style="display:block;width:100%;max-width:500px;height:auto;border:0;border-radius:12px;">
              <div style="text-align:center;padding:22px 0 0;border-bottom:1px solid #1D1D1F;padding-bottom:20px;margin-top:4px;">
                <div class="brand-title" style="font-family:${SERIF};font-size:26px;font-weight:700;letter-spacing:0.14em;color:${C} !important;text-transform:uppercase;line-height:1;">HOTEL CANAL</div>
                <div style="font-family:${SANS};font-size:9px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:${BRASS} !important;margin-top:8px;">SANTA CROCE 553 · VENICE</div>
              </div>
            </td>
          </tr>

          <!-- 2. INTRO + ROOM KPI -->
          <tr>
            <td class="email-content" style="padding:0 4px 28px;">
              <p style="font-family:${BODY};font-style:italic;font-size:17px;font-weight:500;color:${C} !important;margin:0 0 8px;">${lp.greeting(name)}</p>
              <p style="${bodyStyle};color:#4A5560 !important;margin:0 0 20px;">${lp.welcome}</p>
              <table role="presentation" class="room-badge" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BOX} !important;border-radius:12px;">
                <tr>
                  <td align="center" style="padding:20px 14px;">
                    <div style="${labelStyle};margin:0 0 8px;">${lp.roomLabel}</div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:32px;font-weight:700;color:${C} !important;letter-spacing:0.08em;line-height:1;text-transform:uppercase;">${lp.roomPrefix} ${room}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 3. ACCESS BLOCK (wifi + doors + hours) -->
          <tr>
            <td style="padding:0 4px 8px;">
              ${sectionHead(lp.essentialsTitle || 'Your access')}
              <div style="${labelStyle};margin:0 0 8px;">${lp.wifiTitle}</div>
              <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:12px;">
                <tr>
                  <td width="50%" align="center" style="padding:16px 10px;border-right:1px solid #E8E4DC;">
                    <div style="${labelStyle};margin:0 0 6px;">${lp.networkLabel}</div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:17px;font-weight:700;color:${C} !important;letter-spacing:0.03em;">${wifiSsidSafe}</div>
                  </td>
                  <td width="50%" align="center" style="padding:16px 10px;">
                    <div style="${labelStyle};margin:0 0 6px;">${lp.passwordLabel}</div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:17px;font-weight:700;color:${C} !important;letter-spacing:0.08em;">${wifiPasswordSafe}</div>
                  </td>
                </tr>
              </table>
              <div style="${labelStyle};margin:0 0 8px;">${lp.doorsTitle}</div>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 14px;">
                <tr>
                  <td width="50%" valign="top" style="padding:0 5px 0 0;">
                    <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;border:1px solid #E2E6E8;border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:14px 8px;">
                          <div style="${labelStyle};margin:0 0 6px;">Walter</div>
                          <div class="brand-title" style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C} !important;letter-spacing:0.08em;">${doorWalterSafe}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding:0 0 0 5px;">
                    <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;border:1px solid #E2E6E8;border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:14px 8px;">
                          <div style="${labelStyle};margin:0 0 6px;">Airone</div>
                          <div class="brand-title" style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C} !important;letter-spacing:0.08em;">${doorAironeSafe}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="font-family:${SANS};font-size:12px;color:#8A949C !important;margin:0 0 36px;line-height:1.5;">
                <strong style="color:${C} !important;font-weight:600;">${lp.hoursTitle}</strong>
                &nbsp;·&nbsp; ${lp.checkInLabel} ${lp.checkInValue}
                &nbsp;·&nbsp; ${lp.checkOutLabel} ${lp.checkOutValue}
              </p>
            </td>
          </tr>

          <!-- 4. DISCOUNT -->
          <tr>
            <td style="padding:0 4px;">
              ${voucherBlock}
            </td>
          </tr>

          <!-- 5. WALK -->
          <tr>
            <td style="padding:0 4px 8px;">
              ${sectionHead(lp.routeTitle)}
              <p style="${bodyStyle};color:#5C6670 !important;margin:0 0 12px;">${lp.routeDesc}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;">
                ${stepRows}
              </table>
              <a href="${maps}" target="_blank" style="display:block;text-align:center;background-color:${C};color:#FFFFFF !important;text-decoration:none;padding:14px;border-radius:10px;font-family:${SANS};font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 36px;">
                ${lp.mapsBtn}
              </a>
            </td>
          </tr>

          <!-- 6. FOOTER -->
          <tr>
            <td align="center" style="padding:8px 4px 8px;border-top:1px solid #E5E5EA;">
              <p style="font-family:${BODY};font-style:italic;font-size:15px;color:${C} !important;margin:16px 0 8px;">${lp.wishes}</p>
              <div style="font-family:${SANS};font-size:10px;font-weight:600;color:${BRASS} !important;text-transform:uppercase;letter-spacing:0.16em;line-height:1.6;">
                ${lp.signatureLine1}<br>${lp.signatureLine2}
              </div>
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
  const room = roomNumber ? escapeHtml(roomNumber) : '-';
  const guest = guestName ? escapeHtml(guestName) : '';
  const guests = guestsCount != null ? escapeHtml(String(guestsCount)) : '-';

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sconto 10% - Trattoria alla Terrazza</title>
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

async function sendMail({
  to,
  subject,
  text,
  html,
  attachments = [],
  headers = {},
}) {
  assertInlineImages(html, attachments);

  const approxKb = attachments.reduce((sum, a) => {
    const raw = Buffer.isBuffer(a.content)
      ? a.content.length
      : Math.floor(String(a.content || '').length * 0.75);
    return sum + raw;
  }, 0);
  const htmlKb = Math.round(Buffer.byteLength(String(html || ''), 'utf8') / 1024);
  console.log(
    `[mail] → ${to} · html ~${htmlKb}KB · allegati ${attachments.length} · ~${Math.round(approxKb / 1024)}KB inline · subject "${String(subject).slice(0, 60)}"`,
  );
  if (htmlKb >= 100) {
    console.warn(
      `[mail] ATTENZIONE: HTML ~${htmlKb}KB vicino/oltre soglia Gmail 102KB`,
    );
  }

  if (resendConfigured()) {
    const resend = new Resend(env('RESEND_API_KEY').trim());
    const payload = {
      from: getFrom(),
      to: [to],
      subject,
      text,
      html,
      ...(Object.keys(headers).length ? { headers } : {}),
    };
    if (attachments.length) {
      payload.attachments = attachments.map((a) => {
        const content = Buffer.isBuffer(a.content)
          ? a.content.toString('base64')
          : a.content;
        return {
          filename: a.filename,
          content,
          contentType: a.contentType || 'image/png',
          ...(a.contentId ? { contentId: a.contentId } : {}),
        };
      });
    }
    const { data, error } = await resend.emails.send(payload);
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
  lang,
  language,
  includeCoupon = true,
}) {
  const resolvedLang = resolveWelcomeLang(lang || language);
  const lp = welcomeCopy(resolvedLang);
  const redeemUrl = couponRedeemUrl(token);
  const claimUrl = couponClaimUrl(token);
  const mapsUrl = mapsDirectionsUrl();
  const withCoupon = Boolean(includeCoupon);
  // QR via URL pubblico (zero allegati → niente troncamento Gmail)
  const qrSrc = withCoupon
    ? `${publicBaseUrl()}/coupon/${encodeURIComponent(token)}/qr.png`
    : '';

  // Solo hero + 1 foto ristorante via PUBLIC_URL (HTML leggero, gerarchia pulita).
  const requiredRemote = [
    ['email', 'hero-venice.jpg'],
    ['email', 'postcard-tavolo.jpg'],
  ];
  for (const parts of requiredRemote) {
    if (!readEmailAsset(...parts)) {
      throw new Error(`Asset email mancante: ${parts.join('/')}`);
    }
  }

  const heroSrc = publicAssetUrl('email', 'hero-venice.jpg');
  const restaurantSrc = publicAssetUrl('email', 'postcard-tavolo.jpg');

  const wifiSsid = env('WIFI_SSID', 'hotel canal');
  const wifiPassword = env('WIFI_PASSWORD', '');
  // Walter richiede il cancelletto (#). In .env va tra virgolette: DOOR_CODE_WALTER="5358#"
  // altrimenti dotenv tratta # come commento e resta solo "5358".
  let doorWalter = env('DOOR_CODE_WALTER', '5358#').trim() || '5358#';
  if (!doorWalter.endsWith('#')) doorWalter = `${doorWalter}#`;
  const doorAirone = env('DOOR_CODE_AIRONE', '532E').trim() || '532E';

  const html = buildWelcomeHtml({
    guestName,
    roomNumber,
    receptionist,
    guestsCount,
    qrSrc,
    mapsUrl,
    heroSrc,
    restaurantSrc,
    wifiSsid,
    wifiPassword,
    doorWalter,
    doorAirone,
    lang: resolvedLang,
    includeCoupon: withCoupon,
    claimUrl,
  });

  const room = roomNumber || lp.roomFallback;
  const staff = receptionist || 'RECEPTION';
  const guests = guestsCount ?? 2;
  const plainName = guestName || lp.guestFallback;
  const firstName = String(guestName || '')
    .trim()
    .split(/\s+/)[0];
  // Subject univoco → Gmail non nasconde il corpo dietro i tre puntini della conversazione
  const subject = roomNumber
    ? `${lp.subject} · ${roomNumber}`
    : firstName
      ? `${lp.subject} · ${firstName}`
      : `${lp.subject} · ${String(token).slice(0, 6)}`;

  console.log(
    `[welcome] assets remoti da ${publicBaseUrl()} · coupon ${withCoupon ? 'sì' : 'no (claim link)'} · html ~${Math.round(Buffer.byteLength(html, 'utf8') / 1024)}KB · 0 allegati`,
  );

  const textTail = withCoupon
    ? [
        lp.textVoucher,
        `Link: ${redeemUrl}`,
        `${lp.metaCheckin}: ${staff} · ${lp.metaPax}: ${guests}`,
      ]
    : [lp.textClaim, claimUrl];

  await sendMail({
    to,
    subject,
    text: [
      lp.greeting(plainName).replace(/,$/, ''),
      '',
      lp.textIntro,
      lp.textHours,
      `${lp.roomPrefix}: ${room}`,
      '',
      `Wi-Fi: ${lp.networkLabel} "${wifiSsid}" · ${lp.passwordLabel}: ${wifiPassword || '-'}`,
      `Walter: ${doorWalter}`,
      `Airone: ${doorAirone}`,
      '',
      lp.textRouteHeader,
      `1) ${lp.step1Title} - ${lp.step1Line.replace(/&rsquo;/g, "'")}`,
      `2) ${lp.step2Title} - ${lp.step2Line.replace(/&rsquo;/g, "'")}`,
      `3) ${lp.step3Title} - ${lp.step3Line.replace(/&rsquo;/g, "'")}`,
      `4) ${lp.step4Title} - ${lp.step4Line.replace(/&rsquo;/g, "'")}`,
      `Maps: ${mapsUrl}`,
      '',
      ...textTail,
      '',
      lp.textSignature,
    ].join('\n'),
    html,
    attachments: [],
    headers: {
      'X-Entity-Ref-ID': String(token),
    },
  });
}

/** Pagina claim coupon (receptionist default TOMMASO) */
export function buildCouponClaimPage({ token, guestName, error = '' }) {
  const guest = guestName ? escapeHtml(guestName) : '';
  const err = error ? escapeHtml(error) : '';
  // Action relativa: evita POST rotti se PUBLIC_URL in env non coincide
  const action = escapeHtml(`/coupon/claim/${encodeURIComponent(token)}`);

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Coupon 10% - Trattoria alla Terrazza</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root { --canal: #124453; }
    body {
      margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center;
      font-family: Montserrat, -apple-system, sans-serif; padding: 24px;
      background: linear-gradient(160deg, #0A2D37 0%, #124453 55%, #1a5a6b 100%);
      color: #1D1D1F;
    }
    .card {
      width: 100%; max-width: 400px; background: rgba(255,255,255,0.94);
      border-radius: 24px; padding: 32px 26px; border: 1px solid rgba(255,255,255,0.7);
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    }
    .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #5C7A82; margin-bottom: 10px; text-align: center; }
    h1 { font-family: Cinzel, Georgia, serif; font-size: 22px; color: var(--canal); margin: 0 0 8px; text-align: center; }
    .sub { font-size: 13px; color: #515154; line-height: 1.5; text-align: center; margin: 0 0 22px; }
    label { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5C7A82; margin: 0 0 6px; }
    input {
      width: 100%; box-sizing: border-box; border: 1px solid #D8DEE3; border-radius: 14px;
      padding: 14px 14px; font-size: 16px; font-family: inherit; margin-bottom: 14px; background: #F8FAFC;
    }
    input:focus { outline: none; border-color: var(--canal); box-shadow: 0 0 0 3px rgba(18,68,83,0.12); }
    button {
      width: 100%; border: 0; border-radius: 14px; padding: 15px; margin-top: 6px;
      background: var(--canal); color: #fff; font-weight: 700; font-size: 13px;
      letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
    }
    .err { color: #C62828; font-size: 13px; text-align: center; margin: 0 0 14px; font-weight: 600; }
    .guest { font-size: 12px; color: #8A949C; text-align: center; margin-bottom: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="eyebrow">Hotel Canal · Partner</div>
    <h1>Coupon sconto 10%</h1>
    <p class="sub">Trattoria alla Terrazza - inserisci stanza e conferma il receptionist.</p>
    ${guest ? `<p class="guest">Ospite: <strong>${guest}</strong></p>` : ''}
    ${err ? `<p class="err">${err}</p>` : ''}
    <form method="POST" action="${action}">
      <label for="room">Numero stanza</label>
      <input id="room" name="roomNumber" type="text" required maxlength="20" placeholder="104" autocomplete="off">
      <label for="staff">Receptionist</label>
      <input id="staff" name="receptionist" type="text" required maxlength="40" value="TOMMASO" autocomplete="off">
      <button type="submit">Attiva coupon</button>
    </form>
  </div>
</body>
</html>`;
}

/** @deprecated use sendWelcomeEmail - kept for compatibility */
export async function sendRestaurantCoupon(opts) {
  return sendWelcomeEmail(opts);
}
