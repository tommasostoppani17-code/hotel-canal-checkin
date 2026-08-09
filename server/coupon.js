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
  gallerySrc,
  dishSrc,
  thumbs = [],
  icons = {},
  stickers = {},
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
  const SANS = "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
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
  const gallery = escapeHtml(gallerySrc || restaurantSrc);
  const dish = escapeHtml(dishSrc || restaurantSrc);
  const wifiSsidSafe = escapeHtml(wifiSsid || 'hotel canal');
  const wifiPasswordSafe = escapeHtml(wifiPassword || '-');
  const doorWalterSafe = escapeHtml(doorWalter || '5358#');
  const doorAironeSafe = escapeHtml(doorAirone || '532E');
  const preheader = escapeHtml(
    includeCoupon ? lp.preheader(roomNumber) : lp.preheaderNoCoupon,
  );

  const iconCell = (src, alt, size = 28) =>
    src
      ? `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="${escapeHtml(alt)}" style="display:block;width:${size}px;height:${size}px;border:0;">`
      : '';

  const stickerImg = (src, size = 48) => {
    if (!src) return '';
    return `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="" style="display:inline-block;width:${size}px;height:${size}px;border:0;">`;
  };

  const sectionTitle = (label, iconSrc, iconAlt) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 12px;border-bottom:1px solid rgba(22,78,91,0.14);">
                <tr>
                  <td width="28" valign="middle" style="padding:0 8px 8px 0;line-height:0;font-size:0;">
                    ${iconCell(iconSrc, iconAlt || label, 22)}
                  </td>
                  <td valign="middle" style="padding:0 0 8px 0;">
                    <div class="brand-title" style="font-family:${SERIF};font-size:14px;font-weight:700;color:${C} !important;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2;">${label}</div>
                  </td>
                </tr>
              </table>`;

  const postcard = (src, alt, bottom = 20) => `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${bottom}px;border-radius:20px;overflow:hidden;border:1px solid #E2E6E8;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${BOX};">
                    <img src="${src}" width="436" alt="${alt}" style="display:block;width:100%;max-width:436px;height:auto;border:0;">
                  </td>
                </tr>
              </table>`;

  const photoCell = (src, alt, pad) => `
                    <td width="50%" valign="top" style="${pad}">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-radius:14px;overflow:hidden;border:1px solid #E2E6E8;">
                        <tr>
                          <td style="padding:0;line-height:0;font-size:0;background-color:${BOX};">
                            <img src="${src}" width="210" alt="${alt}" style="display:block;width:100%;max-width:210px;height:auto;border:0;">
                          </td>
                        </tr>
                      </table>
                    </td>`;

  const photoGrid = (items, bottom = 28) => {
    const list = (items || [])
      .filter((p) => p && p.src)
      .slice(0, 4)
      .map((p) => ({ src: escapeHtml(p.src), alt: escapeHtml(p.alt || '') }));
    if (!list.length) return '';
    const rows = [];
    for (let i = 0; i < list.length; i += 2) {
      const a = list[i];
      const b = list[i + 1];
      rows.push(`
                <tr>
                  ${photoCell(a.src, a.alt, 'padding:0 5px 10px 0;')}
                  ${
                    b
                      ? photoCell(b.src, b.alt, 'padding:0 0 10px 5px;')
                      : '<td width="50%" style="padding:0 0 10px 5px;">&nbsp;</td>'
                  }
                </tr>`);
    }
    return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${bottom}px;">
                ${rows.join('')}
              </table>`;
  };

  // Percorso: icone brand + frasi brevi (copy da i18n)
  const routeSteps = [
    { icon: icons.gondola, alt: '1', title: lp.step1Title, line: lp.step1Line },
    { icon: icons.path, alt: '2', title: lp.step2Title, line: lp.step2Line },
    { icon: icons.bridge, alt: '3', title: lp.step3Title, line: lp.step3Line },
    { icon: icons.wine, alt: '4', title: lp.step4Title, line: lp.step4Line },
  ];
  const stepRows = routeSteps
    .map(
      (step, i) => `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;border-bottom:${i === routeSteps.length - 1 ? '0' : '1px solid #E8E4DC'};">
          <tr>
            <td width="34" valign="top" style="padding:10px 8px 10px 0;line-height:0;font-size:0;">
              ${iconCell(step.icon, step.alt, 28)}
            </td>
            <td valign="middle" style="padding:10px 0;">
              <div class="brand-title" style="font-family:${SERIF};font-size:14px;font-weight:700;color:${C} !important;letter-spacing:0.02em;line-height:1.25;margin:0 0 2px;">${step.title}</div>
              <div style="font-family:${BODY};font-style:italic;font-size:13.5px;line-height:1.4;color:#5C6670 !important;font-weight:400;">${step.line}</div>
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
  <title>${escapeHtml(lp.htmlTitle)}</title>
  <style type="text/css">
    :root { color-scheme: light only; supported-color-schemes: light only; }
    img { display: block; max-width: 100%; height: auto; border: 0; outline: none; }
    .meta-row { width: 100% !important; max-width: 100% !important; }
    .meta-chip { width: 33.33% !important; }
    .meta-chip-inner {
      font-size: clamp(9px, 2.6vw, 11.5px) !important;
      letter-spacing: 0.04em !important;
      white-space: nowrap !important;
    }
    @media only screen and (max-width: 420px) {
      .meta-chip {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 3px 0 !important;
      }
      .meta-chip-inner {
        font-size: 11px !important;
        white-space: nowrap !important;
      }
    }
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: ${WHITE} !important; }
      .email-card, .email-content, .room-badge, .route-card, .voucher-body, .access-card {
        background-color: #FFFFFF !important;
      }
      .text-main, .text-muted, .email-content, .email-content p, .email-content td, .email-content div, .email-content strong {
        color: #1D1D1F !important;
      }
      .brand-title { color: ${C} !important; }
      .route-card, .room-badge, .access-card { background-color: ${BOX} !important; }
      .brass { color: ${BRASS} !important; }
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background-color:${WHITE} !important;color:#1D1D1F !important;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${preheader}
  </div>
  <!-- ref univoco: evita "contenuto nascosto" Gmail nelle conversazioni -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">${escapeHtml(String(claimUrl || qrSrc || Date.now()).slice(-24))}</div>
  <table role="presentation" class="email-bg" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td class="email-content" style="padding:20px 22px 36px;background-color:#FFFFFF !important;">
              <!-- TOP: foto + brand + saluto + stanza -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;border-radius:16px;overflow:hidden;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${BOX};border-radius:16px;">
                    <img src="${hero}" width="452" alt="Hotel Canal - Venezia" style="display:block;width:100%;max-width:452px;height:auto;border:0;border-radius:16px;">
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 22px;">
                <tr>
                  <td align="center" style="padding:2px 0 16px 0;border-bottom:1px solid #E8E4DC;">
                    ${stickers.mask ? `<div style="margin:0 0 8px;line-height:0;font-size:0;">${stickerImg(stickers.mask, 40)}</div>` : ''}
                    <div style="font-family:${SERIF};font-size:24px;font-weight:700;letter-spacing:0.12em;color:${C} !important;text-transform:uppercase;line-height:1.15;mso-line-height-rule:exactly;">HOTEL CANAL</div>
                    <div class="brass" style="font-family:${SANS};font-size:9.5px;font-weight:600;letter-spacing:0.24em;text-transform:uppercase;color:${BRASS} !important;margin-top:8px;">SANTA CROCE 553 · VENEZIA</div>
                  </td>
                </tr>
              </table>

              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;margin:0 0 8px;letter-spacing:0.01em;text-align:left;">${lp.greeting(name)}</p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 22px;text-align:left;">
                ${lp.welcome}
              </p>

              <table role="presentation" class="room-badge" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background-color:${BOX} !important;border-radius:16px;">
                <tr>
                  <td align="center" style="padding:18px 14px;">
                    ${iconCell(icons.door, 'Camera', 28)}
                    <div style="height:6px;line-height:6px;font-size:1px;">&nbsp;</div>
                    <span style="font-family:${SANS};font-size:10px;font-weight:600;text-transform:uppercase;color:#7A8690 !important;letter-spacing:0.14em;display:block;margin-bottom:6px;">${lp.roomLabel}</span>
                    <strong class="brand-title" style="font-family:${SERIF};font-size:26px;color:${C} !important;font-weight:700;letter-spacing:0.06em;line-height:1;text-transform:uppercase;">${lp.roomPrefix} ${room}</strong>
                  </td>
                </tr>
              </table>

              ${sectionTitle(lp.hoursTitle, icons.calendar, 'Orari')}
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 36px;">
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.checkInLabel}</strong> ${lp.checkInValue}<br>
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.checkOutLabel}</strong> ${lp.checkOutValue}
              </p>

              ${sectionTitle(lp.wifiTitle, icons.bricola, 'Wi-Fi')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;text-align:center;">
                ${lp.wifiDesc}
              </p>
              <!-- Credenziali Wi-Fi: card pass -->
              <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:18px;">
                <tr>
                  <td align="center" style="padding:20px 18px;">
                    <div style="${labelStyle};margin:0 0 6px;">${lp.networkLabel}</div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:20px;font-weight:700;color:${C} !important;letter-spacing:0.04em;line-height:1.2;margin:0 0 14px;">${wifiSsidSafe}</div>
                    <div style="height:1px;line-height:1px;font-size:1px;background-color:#E8E4DC;margin:0 auto 14px;max-width:200px;">&nbsp;</div>
                    <div style="${labelStyle};margin:0 0 6px;">${lp.passwordLabel}</div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:20px;font-weight:700;color:${C} !important;letter-spacing:0.1em;line-height:1.2;">${wifiPasswordSafe}</div>
                  </td>
                </tr>
              </table>

              ${sectionTitle(lp.doorsTitle, icons.door, 'Porte')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;text-align:center;">
                ${lp.doorsDesc}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 36px;">
                <tr>
                  <td width="50%" valign="top" style="padding:0 6px 0 0;">
                    <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;border:1px solid #E2E6E8;border-radius:16px;">
                      <tr>
                        <td align="center" style="padding:16px 10px;">
                          <div style="${labelStyle};margin:0 0 8px;">Walter</div>
                          <div class="brand-title" style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C} !important;letter-spacing:0.08em;line-height:1;">${doorWalterSafe}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding:0 0 0 6px;">
                    <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FFFFFF !important;border:1px solid #E2E6E8;border-radius:16px;">
                      <tr>
                        <td align="center" style="padding:16px 10px;">
                          <div style="${labelStyle};margin:0 0 8px;">Airone</div>
                          <div class="brand-title" style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C} !important;letter-spacing:0.08em;line-height:1;">${doorAironeSafe}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${sectionTitle(lp.routeTitle, icons.path, 'Percorso')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;text-align:center;">
                ${lp.routeDesc}
              </p>

              ${postcard(gallery, 'Trattoria alla Terrazza', 16)}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px;border-top:1px solid #E8E4DC;">
                <tr>
                  <td style="padding:0;">
                    ${stepRows}
                  </td>
                </tr>
              </table>
              <a href="${maps}" target="_blank" style="display:block;text-align:center;background-color:${C};color:#FFFFFF !important;text-decoration:none;padding:15px;border-radius:14px;font-family:${SANS};font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 44px;">
                ${lp.mapsBtn}
              </a>

              ${
                includeCoupon
                  ? `
              ${sectionTitle(lp.discountTitle, icons.key, 'Sconto')}
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 22px;">
                ${lp.discountBefore}<strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.discountBold1}</strong>${lp.discountMid}
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.discountBold2}</strong>${lp.discountAfter}
              </p>

              <!-- VOUCHER SCONTO -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1.5px solid ${C};border-radius:28px;overflow:hidden;margin:0 0 28px;background-color:#FFFFFF;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${C};">
                    <img src="${resto}" width="452" alt="Trattoria alla Terrazza" style="display:block;width:100%;max-width:452px;height:auto;border:0;">
                  </td>
                </tr>
                <tr>
                  <td class="voucher-body" align="center" style="padding:22px 20px 24px;background-color:#FFFFFF !important;">
                    <div class="brand-title" style="font-family:${SERIF};font-size:18px;font-weight:700;color:${C} !important;letter-spacing:0.04em;line-height:1.2;text-transform:uppercase;">${lp.voucherTitle}</div>
                    <div style="font-family:${SANS};font-size:10px;color:#8E8E93 !important;font-weight:600;margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;">${lp.voucherSub}</div>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:18px auto 16px;">
                      <tr>
                        <td align="center" style="background:#FFFFFF;padding:0;line-height:0;font-size:0;">
                          <img src="${escapeHtml(qrSrc)}" width="140" height="140" alt="Voucher QR Code" style="display:block;width:140px;height:140px;margin:0 auto;border:0;">
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" class="meta-row" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="width:100%;max-width:100%;margin:0 auto;">
                      <tr>
                        <td class="meta-chip" width="33.33%" align="center" valign="middle" style="width:33.33%;padding:3px;">
                          <div class="meta-chip-inner" style="font-family:${SANS};font-size:11px;font-weight:600;color:${C} !important;text-transform:uppercase;letter-spacing:0.04em;background:${BOX};padding:10px 6px;border-radius:999px;line-height:1.3;white-space:nowrap;">
                            ${lp.metaCamera}: ${room}
                          </div>
                        </td>
                        <td class="meta-chip" width="33.33%" align="center" valign="middle" style="width:33.33%;padding:3px;">
                          <div class="meta-chip-inner" style="font-family:${SANS};font-size:11px;font-weight:600;color:${C} !important;text-transform:uppercase;letter-spacing:0.04em;background:${BOX};padding:10px 6px;border-radius:999px;line-height:1.3;white-space:nowrap;">
                            ${lp.metaCheckin}: ${staff}
                          </div>
                        </td>
                        <td class="meta-chip" width="33.33%" align="center" valign="middle" style="width:33.33%;padding:3px;">
                          <div class="meta-chip-inner" style="font-family:${SANS};font-size:11px;font-weight:600;color:${C} !important;text-transform:uppercase;letter-spacing:0.04em;background:${BOX};padding:10px 6px;border-radius:999px;line-height:1.3;white-space:nowrap;">
                            ${lp.metaPax}: ${guests}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              `
                  : `
              ${sectionTitle(lp.claimTitle, icons.key, 'Sconto')}
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 18px;text-align:center;">
                ${lp.claimDesc}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1.5px solid ${C};border-radius:22px;overflow:hidden;margin:0 0 28px;background-color:#FFFFFF;">
                <tr>
                  <td style="padding:0;line-height:0;font-size:0;background-color:${C};">
                    <img src="${resto}" width="452" alt="Trattoria alla Terrazza" style="display:block;width:100%;max-width:452px;height:auto;border:0;">
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:26px 22px 28px;background-color:#FFFFFF !important;">
                    <a href="${claim}" target="_blank" style="display:block;text-align:center;background-color:${C};color:#FFFFFF !important;text-decoration:none;padding:15px 18px;border-radius:14px;font-family:${SANS};font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">
                      ${lp.claimBtn}
                    </a>
                  </td>
                </tr>
              </table>
              `
              }

              ${sectionTitle(lp.tastesTitle, icons.cloche, 'Cucina')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 16px;text-align:center;">
                ${lp.tastesDesc}
              </p>
              ${photoGrid(thumbs.slice(0, 4), 8)}
              ${postcard(dish, 'Cucina della Trattoria alla Terrazza', 8)}

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto 0;">
                <tr>
                  ${['palazzo', 'mooring', 'basilica', 'campanile']
                    .map((k) =>
                      stickers[k]
                        ? `<td align="center" style="padding:0 4px;">${stickerImg(stickers[k], 40)}</td>`
                        : '',
                    )
                    .join('')}
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0 0;">
                <tr>
                  <td align="center" style="text-align:center;padding:0;">
                    ${stickers.lion ? `<div style="margin:0 0 14px;line-height:0;font-size:0;">${stickerImg(stickers.lion, 52)}</div>` : ''}
                    <div class="brand-title" style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;letter-spacing:0.01em;line-height:1.55;text-align:center;">
                      ${lp.wishes}
                    </div>
                    <div class="brass" style="font-family:${SANS};font-size:11.5px;font-weight:600;color:${BRASS} !important;text-transform:uppercase;letter-spacing:0.14em;margin-top:12px;text-align:center;">
                      ${lp.signatureLine1}<br>${lp.signatureLine2}
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

  // Foto/icone/sticker/QR via URL pubblico su PUBLIC_URL (HTML ~35KB, 0 allegati → niente "Testo troncato" Gmail).
  // Mai base64/CID pesanti: Gmail taglia sopra ~102KB di payload.
  const requiredRemote = [
    ['email', 'hero-venice.jpg'],
    ['email', 'postcard-tavolo.jpg'],
    ['email', 'postcard-ingresso.jpg'],
    ['email', 'postcard-dish.jpg'],
    ['email', 'thumb-ingresso.jpg'],
    ['email', 'thumb-pesce.jpg'],
    ['email', 'thumb-risotto.jpg'],
    ['email', 'thumb-linguine.jpg'],
  ];
  for (const parts of requiredRemote) {
    if (!readEmailAsset(...parts)) {
      throw new Error(`Asset email mancante: ${parts.join('/')}`);
    }
  }

  const heroSrc = publicAssetUrl('email', 'hero-venice.jpg');
  const restaurantSrc = publicAssetUrl('email', 'postcard-tavolo.jpg');
  const gallerySrc = publicAssetUrl('email', 'postcard-ingresso.jpg');
  const dishSrc = publicAssetUrl('email', 'postcard-dish.jpg');
  const thumbs = [
    {
      src: publicAssetUrl('email', 'thumb-ingresso.jpg'),
      alt: 'Ingresso sulla fondamenta',
    },
    {
      src: publicAssetUrl('email', 'thumb-pesce.jpg'),
      alt: 'Pesce al forno',
    },
    {
      src: publicAssetUrl('email', 'thumb-risotto.jpg'),
      alt: 'Risotto',
    },
    {
      src: publicAssetUrl('email', 'thumb-linguine.jpg'),
      alt: 'Linguine',
    },
  ];

  const iconDefs = [
    { key: 'gondola', file: 'gondola.png' },
    { key: 'path', file: 'map.png' },
    { key: 'bridge', file: 'bridge.png' },
    { key: 'wine', file: 'wine.png' },
    { key: 'door', file: 'door.png' },
    { key: 'calendar', file: 'calendar.png' },
    { key: 'key', file: 'key-discount.png' },
    { key: 'cloche', file: 'cloche.png' },
    { key: 'bricola', file: 'bricola.png' },
  ];
  const icons = {};
  for (const def of iconDefs) {
    if (!readEmailAsset('email', 'icons', def.file)) continue;
    icons[def.key] = publicAssetUrl('email', 'icons', def.file);
  }

  const stickerDefs = [
    { key: 'mask', file: 'mask.png' },
    { key: 'basilica', file: 'basilica.png' },
    { key: 'campanile', file: 'campanile.png' },
    { key: 'palazzo', file: 'palazzo.png' },
    { key: 'mooring', file: 'mooring.png' },
    { key: 'lion', file: 'lion.png' },
  ];
  const stickers = {};
  for (const def of stickerDefs) {
    if (!readEmailAsset('email', 'stickers', def.file)) continue;
    stickers[def.key] = publicAssetUrl('email', 'stickers', def.file);
  }

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
    gallerySrc,
    dishSrc,
    thumbs,
    icons,
    stickers,
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
