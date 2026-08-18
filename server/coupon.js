import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { resolveWelcomeLang, welcomeCopy } from './welcome-i18n.js';
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
  emailCtaStyle,
  emailDisplayStyle,
  emailEyebrowStyle,
} from './email-type.js';
import { assertSendableRecipient, sendableRecipientOrEmpty } from './recipient-guard.js';

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

function getFrom() {
  return env(
    'SMTP_FROM',
    'Welcome to Hotel Canal <onboarding@resend.dev>',
  );
}

/** Copia staff (tu): BCC welcome → REPORT_EMAIL / STAFF_NOTIFY_EMAIL. Off di default (quota). */
function staffNotifyBcc(to) {
  if (env('STAFF_BCC', 'false').toLowerCase() !== 'true') return '';
  const staff = sendableRecipientOrEmpty(
    env('STAFF_NOTIFY_EMAIL') || env('REPORT_EMAIL') || '',
  );
  const guest = String(to || '')
    .trim()
    .toLowerCase();
  if (!staff || !guest || staff === guest) return '';
  return staff;
}

/** Resend onboarding@resend.dev = solo email del proprietario account (test). */
function isResendTestFrom(from = getFrom()) {
  return /@resend\.dev\b/i.test(String(from || ''));
}

/**
 * In produzione con from di test: preferisci SMTP reale se configurato,
 * altrimenti Resend (limita i destinatari all'owner).
 */
function preferSmtpOverResend() {
  return isResendTestFrom() && smtpConfigured();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Title Case: "mArIo rOsSi" → "Mario Rossi" */
function toTitleCase(str) {
  const raw = String(str ?? '').trim();
  if (!raw) return '';
  return raw
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function publicBaseUrl() {
  return (env('PUBLIC_URL', 'http://localhost:3000') || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

/**
 * Base URL per foto/icone email (remote, zero allegati).
 * Pin al commit Render → URL nuove a ogni deploy (Gmail mobile non riusa cache @main).
 * Override: EMAIL_ASSET_BASE=https://...  oppure EMAIL_ASSETS_CDN=render|jsdelivr
 */
function emailAssetCommit() {
  const pinned = env('EMAIL_ASSET_COMMIT', '').trim();
  if (pinned) return pinned.replace(/^@/, '');
  const renderSha = env('RENDER_GIT_COMMIT', '').trim();
  if (renderSha && /^[0-9a-f]{7,40}$/i.test(renderSha)) return renderSha.slice(0, 40);
  return 'main';
}

function emailAssetBaseUrl() {
  const custom = env('EMAIL_ASSET_BASE', '').trim().replace(/\/$/, '');
  if (custom) return custom;

  const mode = env('EMAIL_ASSETS_CDN', 'jsdelivr').trim().toLowerCase();
  if (mode === 'render' || mode === 'public' || mode === 'off') {
    return publicBaseUrl();
  }

  const rev = emailAssetCommit();
  return `https://cdn.jsdelivr.net/gh/tommasostoppani17-code/hotel-canal-checkin@${rev}/public`;
}

/** Absolute URL for a file under /public (remote assets → email sotto 102KB Gmail). */
function publicAssetUrl(...parts) {
  const rel = parts
    .map((p) => String(p).replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
  return `${emailAssetBaseUrl()}/${rel}`;
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

export function buildWelcomeHtml({
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
  terraceSrc,
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
  guidePdfUrl = '',
}) {
  const lp = welcomeCopy(lang);
  const C = '#164E5B';
  const BOX = '#E9EEF0';
  const WHITE = '#FFFFFF';
  /* Accento freddo canal (niente oro/giallino) */
  const BRASS = '#6E868F';
  /* Scala tipografica = mail tavolo (Cormorant / EB Garamond / Cinzel / DM Sans) */
  const FS = {
    section: '14px',
    body: '16px',
    bodySm: '14px',
    itemTitle: '16px',
    stepTitle: '16px',
    stepLine: '14px',
    label: '11px',
    button: '13.5px',
    legal: '10.5px',
  };
  const bodyStyle = emailBodyStyle({ size: FS.body, line: '1.55' });
  const bodySmStyle = emailBodyStyle({ size: FS.bodySm, line: '1.4' });
  const labelStyle = emailLabelStyle({ size: FS.label });

  const name = escapeHtml(guestName || lp.guestFallback);
  const firstNamePlain = String(guestName || lp.guestFallback)
    .trim()
    .split(/\s+/)[0] || lp.guestFallback;
  const room = escapeHtml(roomNumber || lp.roomFallback);
  const staff = escapeHtml(receptionist || 'RECEPTION');
  const guests = escapeHtml(String(guestsCount ?? 2));
  const maps = escapeHtml(mapsUrl);
  const claim = escapeHtml(claimUrl);
  const guidePdf = escapeHtml(guidePdfUrl);
  const hero = escapeHtml(heroSrc);
  const resto = escapeHtml(restaurantSrc);
  const gallery = escapeHtml(gallerySrc || restaurantSrc);
  const dish = escapeHtml(dishSrc || restaurantSrc);
  const terrace = escapeHtml(
    terraceSrc || gallerySrc || restaurantSrc,
  );
  const wifiCards = `
              <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 36px;background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:18px;">
                <tr>
                  <td align="center" style="padding:20px 18px;">
                    <div style="${labelStyle};margin:0 0 6px;">${lp.networkLabel}</div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:20px;font-weight:700;color:${C} !important;letter-spacing:0.04em;line-height:1.2;margin:0 0 14px;">${escapeHtml(wifiSsid || '—')}</div>
                    <div style="height:1px;line-height:1px;font-size:1px;background-color:#E8E4DC;margin:0 auto 14px;max-width:200px;">&nbsp;</div>
                    <div style="${labelStyle};margin:0 0 6px;">${lp.passwordLabel}</div>
                    <div class="brand-title" style="font-family:${SERIF};font-size:20px;font-weight:700;color:${C} !important;letter-spacing:0.1em;line-height:1.2;">${escapeHtml(wifiPassword || '—')}</div>
                  </td>
                </tr>
              </table>`;
  const doorWalterSafe = escapeHtml(doorWalter || '—');
  const doorAironeSafe = escapeHtml(doorAirone || '—');
  /** Larghezza utile card (500 − padding 22×2). Pixel fissi → niente fascia grigia su Gmail desktop. */
  const CW = 456;
  const BAND_H = 254; // 1400×780 @ CW
  const GRID = 224;
  const GRID_GAP = 8;
  const preheader = escapeHtml(
    includeCoupon
      ? lp.preheader(firstNamePlain, roomNumber)
      : lp.preheaderNoCoupon,
  );
  const preheaderHash = escapeHtml(
    String(claimUrl || qrSrc || 'hc')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(-8) || 'hotelcanal',
  );

  const iconCell = (src, alt, size = 28) =>
    src
      ? `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="${escapeHtml(alt)}" style="display:block;width:${size}px;height:${size}px;border:0;">`
      : '';

  const stickerImg = (src, size = 48) => {
    if (!src) return '';
    return `<img src="${escapeHtml(src)}" width="${size}" height="${size}" alt="" style="display:inline-block;width:${size}px;height:${size}px;border:0;">`;
  };

  /** Immagine block-level a larghezza fissa (no % → evita gap grigio a destra su desktop). */
  const emailImg = (src, alt, w, h = null) => {
    const hAttr = h ? ` height="${h}"` : '';
    const hStyle = h ? `height:${h}px;` : 'height:auto;';
    return `<img src="${src}" width="${w}"${hAttr} alt="${alt}" style="display:block;width:${w}px;max-width:${w}px;${hStyle}border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;">`;
  };

  const sectionTitle = (label, iconSrc, iconAlt) => `
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

  const postcard = (src, alt, bottom = 28, h = BAND_H) => `
              <table role="presentation" class="email-postcard" width="${CW}" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${bottom}px;width:${CW}px;max-width:${CW}px;border-radius:20px;overflow:hidden;border:1px solid #E2E6E8;">
                <tr>
                  <td width="${CW}" bgcolor="#FFFFFF" style="padding:0;line-height:0;font-size:0;width:${CW}px;background-color:#FFFFFF !important;mso-line-height-rule:exactly;">
                    ${emailImg(src, alt, CW, h)}
                  </td>
                </tr>
              </table>`;

  /** Due bande ristorante: stesso frame (CW × BAND_H). */
  const postcardBand = (src, alt, bottom = 8) => postcard(src, alt, bottom, BAND_H);

  const veniceGuideBlock = (() => {
    const items = [
      {
        icon: icons.gondola,
        title: lp.veniceActvTitle,
        body: lp.veniceActvBody,
      },
      {
        icon: icons.bridge || icons.path,
        title: lp.veniceRialtoTitle || 'Rialto',
        body: lp.veniceRialtoBody || lp.veniceWalkBody,
      },
      {
        icon: stickers.basilica || stickers.campanile || icons.path,
        title: lp.veniceSanMarcoTitle || 'San Marco',
        body: lp.veniceSanMarcoBody || lp.veniceWalkBody,
      },
      {
        icon: stickers.mooring || icons.gondola || icons.bridge,
        title: lp.veniceIslandsTitle,
        body: lp.veniceIslandsBody,
      },
    ];
    const rows = items
      .map(
        (item, i) => `
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;border-bottom:${i === items.length - 1 ? '0' : '1px solid #E8E4DC'};">
                      <tr>
                        <td width="34" valign="top" style="padding:10px 10px 10px 0;line-height:0;font-size:0;">
                          ${iconCell(item.icon, item.title, 26)}
                        </td>
                        <td valign="middle" style="padding:10px 0;">
                          <div class="brand-title" style="font-family:${SERIF};font-size:${FS.itemTitle};font-weight:700;color:${C} !important;letter-spacing:0.02em;line-height:1.2;margin:0 0 3px;">${item.title}</div>
                          <div style="${bodySmStyle};color:#5C6670 !important;">${item.body}</div>
                        </td>
                      </tr>
                    </table>`,
      )
      .join('');
    return `
              ${sectionTitle(lp.veniceTitle, icons.gondola || icons.path, 'Venezia')}
              <p class="text-muted" style="${bodySmStyle};color:#5C6670 !important;margin:0 0 6px;text-align:center;">
                ${lp.veniceIntro}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:0;">
                    ${rows}
                  </td>
                </tr>
              </table>`;
  })();

  const venicePdfFooter = ''; // Guida PDF completa: ripristinare quando il file è pronto

  const accessTicketBlock = `
              ${sectionTitle(lp.ticketTitle, icons.key || icons.door, 'Esenzione')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 22px;text-align:center;">
                ${lp.ticketDesc}
              </p>
              <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#FFFFFF !important;border:1.5px solid ${C};border-radius:18px;">
                <tr>
                  <td style="padding:20px 18px;font-family:${BODY};font-style:italic;font-size:${FS.body};line-height:1.65;color:#4A5560 !important;font-weight:400;">
                    ${lp.ticketBox}<strong style="color:${C} !important;font-weight:600;font-style:italic;">${room}</strong>
                  </td>
                </tr>
              </table>
              <a href="https://cda.ve.it" target="_blank" style="display:block;text-align:center;background-color:${C};color:#FFFFFF !important;text-decoration:none;padding:15px;border-radius:14px;${emailCtaStyle({ size: FS.button })};margin:0 0 36px;">
                ${lp.ticketBtn}
              </a>`;

  const legalFooterBlock = `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 0;">
                <tr>
                  <td align="center" style="border-top:1px solid #E5E5EA;padding-top:24px;text-align:center;">
                    <p style="font-family:${SANS};font-size:${FS.label};color:#8E8E93 !important;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px 0;line-height:1.4;">
                      Hotel Canal<br>
                      Santa Croce 553, 30135 Venezia (VE) — Italy<br>
                      P.IVA / C.F.: 04711930273
                    </p>
                    <p style="font-family:${SANS};font-size:${FS.legal};color:#AEAEB2 !important;font-weight:400;margin:0;line-height:1.5;padding:0 16px;">
                      ${lp.legalText}
                    </p>
                  </td>
                </tr>
              </table>`;

  const photoCell = (src, alt) => `
                    <td width="${GRID}" valign="top" style="width:${GRID}px;max-width:${GRID}px;padding:0;margin:0;">
                      <table role="presentation" width="${GRID}" cellspacing="0" cellpadding="0" border="0" style="width:${GRID}px;max-width:${GRID}px;border-radius:14px;overflow:hidden;border:1px solid #E2E6E8;">
                        <tr>
                          <td width="${GRID}" height="${GRID}" bgcolor="#FFFFFF" style="width:${GRID}px;height:${GRID}px;max-width:${GRID}px;padding:0;line-height:0;font-size:0;background-color:#FFFFFF !important;mso-line-height-rule:exactly;">
                            ${emailImg(src, alt, GRID, GRID)}
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
                  ${photoCell(a.src, a.alt)}
                  <td width="${GRID_GAP}" style="width:${GRID_GAP}px;max-width:${GRID_GAP}px;padding:0;font-size:0;line-height:0;">&nbsp;</td>
                  ${
                    b
                      ? photoCell(b.src, b.alt)
                      : `<td width="${GRID}" style="width:${GRID}px;">&nbsp;</td>`
                  }
                </tr>`);
      if (i + 2 < list.length) {
        rows.push(`
                <tr>
                  <td colspan="3" height="${GRID_GAP}" style="height:${GRID_GAP}px;line-height:${GRID_GAP}px;font-size:1px;padding:0;">&nbsp;</td>
                </tr>`);
      }
    }
    return `
              <table role="presentation" class="taste-grid" width="${CW}" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 ${bottom}px;width:${CW}px;max-width:${CW}px;table-layout:fixed;">
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
            <td width="32" valign="top" style="padding:10px 8px 10px 0;line-height:0;font-size:0;">
              ${iconCell(step.icon, step.alt, 24)}
            </td>
            <td valign="middle" style="padding:10px 0;">
              <div class="brand-title" style="font-family:${SERIF};font-size:${FS.stepTitle};font-weight:700;color:${C} !important;letter-spacing:0.02em;line-height:1.2;margin:0 0 2px;">${step.title}</div>
              <div style="font-family:${BODY};font-style:italic;font-size:${FS.stepLine};line-height:1.35;color:#5C6670 !important;font-weight:400;">${step.line}</div>
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
  <title>${escapeHtml(lp.htmlTitle)}</title>
  ${emailFontsHead()}
  ${emailLightModeHead({
    canal: C,
    box: BOX,
    extraCss: `
    img { display: block; border: 0; outline: none; }
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
    `,
  })}
</head>
<body ${emailLightBodyAttrs()}>
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">
    ${preheader}
  </div>
  <!-- anti-collapse + anti-thread preview filler -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${WHITE};">${preheaderHash}${'&nbsp;'.repeat(48)}</div>
  <table role="presentation" class="email-bg force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${WHITE}" style="background-color:${WHITE} !important;margin:0;padding:0;font-family:${SANS};">
    <tr>
      <td align="center" class="force-white" bgcolor="${WHITE}" style="padding:20px 10px;background-color:${WHITE} !important;">
        <table role="presentation" class="email-card force-white" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#FFFFFF" style="max-width:500px;background-color:#FFFFFF !important;border-radius:24px;overflow:hidden;border:1px solid #E2E6E8;">
          <tr>
            <td class="email-content force-white" bgcolor="#FFFFFF" style="padding:20px 22px 36px;background-color:#FFFFFF !important;">
              <!-- TOP: foto + brand + saluto + stanza -->
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
                    ${stickers.mask ? `<div style="margin:0 0 8px;line-height:0;font-size:0;">${stickerImg(stickers.mask, 40)}</div>` : ''}
                    <div style="${emailDisplayStyle({ color: C })}">HOTEL CANAL</div>
                    <div class="brass" style="${emailEyebrowStyle({ color: BRASS })};margin-top:8px;">SANTA CROCE 553 · VENEZIA</div>
                  </td>
                </tr>
              </table>

              <p class="brand-title text-main" style="font-family:${BODY};font-style:italic;font-size:19px;font-weight:500;color:${C} !important;margin:0 0 10px;letter-spacing:0.01em;text-align:left;">${lp.greeting(name)}</p>
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 28px;text-align:left;">
                ${lp.welcome}
              </p>

              <table role="presentation" class="room-badge" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 36px;background-color:${BOX} !important;border-radius:16px;">
                <tr>
                  <td align="center" style="padding:18px 14px;">
                    ${iconCell(icons.door, 'Camera', 28)}
                    <div style="height:6px;line-height:6px;font-size:1px;">&nbsp;</div>
                    <span style="font-family:${SANS};font-size:${FS.label};font-weight:600;text-transform:uppercase;color:#7A8690 !important;letter-spacing:0.14em;display:block;margin-bottom:6px;">${lp.roomLabel}</span>
                    <strong class="brand-title" style="font-family:${SERIF};font-size:26px;color:${C} !important;font-weight:700;letter-spacing:0.06em;line-height:1;text-transform:uppercase;">${lp.roomPrefix} ${room}</strong>
                  </td>
                </tr>
              </table>

              ${sectionTitle(lp.hoursTitle, icons.calendar, 'Orari')}
              <p class="text-muted" style="${bodyStyle};color:#4A5560 !important;margin:0 0 40px;">
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.checkInLabel}</strong> ${lp.checkInValue}<br>
                <strong style="color:${C} !important;font-weight:600;font-style:italic;">${lp.checkOutLabel}</strong> ${lp.checkOutValue}
              </p>

              ${sectionTitle(lp.wifiTitle, icons.bricola, 'Wi-Fi')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 20px;text-align:center;">
                ${lp.wifiDesc}
              </p>
              <!-- Credenziali Wi-Fi -->
              ${wifiCards}

              ${sectionTitle(lp.doorsTitle, icons.door, 'Porte')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 20px;text-align:center;">
                ${lp.doorsDesc}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 40px;">
                <tr>
                  <td width="50%" valign="top" style="padding:0 6px 0 0;">
                    <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BOX} !important;border:1px solid #E2E6E8;border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:16px 10px;">
                          <div style="${labelStyle};margin:0 0 8px;">${lp.doorMainLabel || 'Walter'}</div>
                          <div class="brand-title" style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C} !important;letter-spacing:0.08em;line-height:1;">${doorWalterSafe}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" style="padding:0 0 0 6px;">
                    <table role="presentation" class="access-card" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BOX} !important;border:1px solid #E2E6E8;border-radius:12px;">
                      <tr>
                        <td align="center" style="padding:16px 10px;">
                          <div style="${labelStyle};margin:0 0 8px;">${lp.doorInnerLabel || 'Airone'}</div>
                          <div class="brand-title" style="font-family:${SERIF};font-size:22px;font-weight:700;color:${C} !important;letter-spacing:0.08em;line-height:1;">${doorAironeSafe}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${sectionTitle(lp.routeTitle, icons.path, 'Percorso')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 20px;text-align:center;">
                ${lp.routeDesc}
              </p>

              ${postcard(gallery, 'Trattoria alla Terrazza', 16, Math.round((CW * 682) / 1020))}

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-top:1px solid #E8E4DC;">
                <tr>
                  <td style="padding:0;">
                    ${stepRows}
                  </td>
                </tr>
              </table>
              <a href="${maps}" target="_blank" style="display:block;text-align:center;background-color:${C};color:#FFFFFF !important;text-decoration:none;padding:15px;border-radius:14px;${emailCtaStyle({ size: FS.button })};margin:0 0 48px;">
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1.5px dashed ${C};border-radius:28px;overflow:hidden;margin:0 0 28px;background-color:#FFFFFF;">
                <tr>
                  <td width="${CW}" bgcolor="${C}" style="padding:0;line-height:0;font-size:0;width:${CW}px;background-color:${C};mso-line-height-rule:exactly;">
                    ${emailImg(resto, 'Trattoria alla Terrazza', CW, BAND_H)}
                  </td>
                </tr>
                <tr>
                  <td class="voucher-body" align="center" style="padding:22px 20px 24px;background-color:#FFFFFF !important;">
                    <div class="brand-title" style="font-family:${SERIF};font-size:18px;font-weight:700;color:${C} !important;letter-spacing:0.04em;line-height:1.2;text-transform:uppercase;">${lp.voucherTitle}</div>
                    <div style="font-family:${SANS};font-size:${FS.label};color:#8E8E93 !important;font-weight:600;margin-top:6px;text-transform:uppercase;letter-spacing:0.08em;">${lp.voucherSub}</div>
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
                          <div class="meta-chip-inner" style="font-family:${SANS};font-size:12px;font-weight:600;color:${C} !important;text-transform:uppercase;letter-spacing:0.04em;background:${BOX};padding:10px 6px;border-radius:999px;line-height:1.3;white-space:nowrap;">
                            ${lp.metaCamera}: ${room}
                          </div>
                        </td>
                        <td class="meta-chip" width="33.33%" align="center" valign="middle" style="width:33.33%;padding:3px;">
                          <div class="meta-chip-inner" style="font-family:${SANS};font-size:12px;font-weight:600;color:${C} !important;text-transform:uppercase;letter-spacing:0.04em;background:${BOX};padding:10px 6px;border-radius:999px;line-height:1.3;white-space:nowrap;">
                            ${lp.metaCheckin}: ${staff}
                          </div>
                        </td>
                        <td class="meta-chip" width="33.33%" align="center" valign="middle" style="width:33.33%;padding:3px;">
                          <div class="meta-chip-inner" style="font-family:${SANS};font-size:12px;font-weight:600;color:${C} !important;text-transform:uppercase;letter-spacing:0.04em;background:${BOX};padding:10px 6px;border-radius:999px;line-height:1.3;white-space:nowrap;">
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1.5px dashed ${C};border-radius:28px;overflow:hidden;margin:0 0 28px;background-color:#FFFFFF;">
                <tr>
                  <td width="${CW}" bgcolor="${C}" style="padding:0;line-height:0;font-size:0;width:${CW}px;background-color:${C};mso-line-height-rule:exactly;">
                    ${emailImg(resto, 'Trattoria alla Terrazza', CW, BAND_H)}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:26px 22px 28px;background-color:#FFFFFF !important;">
                    <a href="${claim}" target="_blank" style="display:block;text-align:center;background-color:#FFFFFF !important;color:${C} !important;text-decoration:none;padding:15px 18px;border-radius:14px;border:1.5px solid ${C};${emailCtaStyle({ size: FS.button })};letter-spacing:0.06em;">
                      ${lp.claimBtn}
                    </a>
                  </td>
                </tr>
              </table>
              `
              }

              ${sectionTitle(lp.tastesTitle, icons.cloche, 'Cucina')}
              <p class="text-muted" style="${bodyStyle};color:#5C6670 !important;margin:0 0 20px;text-align:center;">
                ${lp.tastesDesc}
              </p>
              ${photoGrid(thumbs.slice(0, 4), 8)}
              ${postcardBand(terrace, 'Piatti della Terrazza', 8)}
              ${postcardBand(dish, 'Cucina della Trattoria alla Terrazza', 36)}

              ${veniceGuideBlock}
              ${venicePdfFooter}
              ${accessTicketBlock}

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
                    <div class="brand-title" style="font-family:${BODY};font-style:italic;font-size:19px;font-weight:500;color:${C} !important;letter-spacing:0.01em;line-height:1.55;text-align:center;">
                      ${lp.wishes}
                    </div>
                    <div style="width:36px;height:1px;line-height:1px;font-size:1px;background-color:${BRASS};margin:22px auto 16px;">&nbsp;</div>
                    <div class="brand-title" style="font-family:${BODY};font-style:italic;font-size:18px;font-weight:500;color:${C} !important;letter-spacing:0.02em;line-height:1.45;text-align:center;">
                      ${lp.signatureLine1}
                    </div>
                    <div class="brass" style="font-family:${SERIF};font-style:italic;font-size:14px;font-weight:600;color:${BRASS} !important;letter-spacing:0.06em;margin-top:8px;text-align:center;line-height:1.4;">
                      ${lp.signatureLine2}
                    </div>
                  </td>
                </tr>
              </table>

              ${legalFooterBlock}
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
  const guest = guestName ? escapeHtml(guestName) : 'Ospite';
  const guests = guestsCount != null ? escapeHtml(String(guestsCount)) : '-';
  const hero = escapeHtml(
    `${publicBaseUrl()}/email/${encodeURIComponent('voucher-24.jpg')}`,
  );
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#0A2D37">
  <meta name="color-scheme" content="light only">
  <title>−10% · Trattoria alla Terrazza</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Cinzel:wght@600;700&family=DM+Sans:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --canal: #124453;
      --canal-deep: #0A2D37;
      --canal-soft: #E8F0F2;
      --ink: #1A2B31;
      --muted: #6B7C83;
      --line: rgba(18, 68, 83, 0.14);
      --cream: #F7F5F1;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      min-height: 100dvh;
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(120% 80% at 50% -10%, rgba(255,255,255,0.14), transparent 55%),
        linear-gradient(165deg, #071F26 0%, var(--canal-deep) 42%, #124453 100%);
      -webkit-font-smoothing: antialiased;
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: max(12px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom));
    }
    .shell {
      width: 100%;
      max-width: 420px;
      margin: auto;
      display: flex;
      flex-direction: column;
      min-height: min(760px, calc(100dvh - 28px));
      animation: rise 520ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(18px) scale(0.985); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes pulseSoft {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.03); }
    }
    .ticket {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      background: var(--cream);
      border-radius: 28px;
      overflow: hidden;
      box-shadow:
        0 1px 0 rgba(255,255,255,0.35) inset,
        0 28px 60px rgba(0,0,0,0.35);
    }
    .hero {
      position: relative;
      height: clamp(168px, 28vh, 220px);
      flex: 0 0 auto;
      background: #0E3844 center/cover no-repeat;
      background-image: linear-gradient(180deg, rgba(7,31,38,0.15) 0%, rgba(7,31,38,0.72) 100%), url("${hero}");
    }
    .hero-brand {
      position: absolute;
      left: 20px;
      right: 20px;
      bottom: 18px;
      color: #fff;
    }
    .hero-brand .hotel {
      margin: 0 0 4px;
      font-family: Cinzel, Georgia, serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      opacity: 0.92;
    }
    .hero-brand h1 {
      margin: 0;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: clamp(26px, 7vw, 32px);
      font-weight: 700;
      line-height: 1.05;
      letter-spacing: 0.01em;
    }
    .body {
      flex: 1 1 auto;
      display: flex;
      flex-direction: column;
      padding: 22px 22px 20px;
    }
    .badge {
      align-self: center;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      border-radius: 999px;
      background: rgba(18,68,83,0.08);
      color: var(--canal);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .badge-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #1F8A5B;
      box-shadow: 0 0 0 3px rgba(31,138,91,0.18);
      animation: pulseSoft 2.4s ease-in-out infinite;
    }
    .discount-wrap {
      margin: 18px 0 6px;
      text-align: center;
    }
    .discount {
      margin: 0;
      font-family: Cinzel, Georgia, serif;
      font-size: clamp(56px, 16vw, 72px);
      font-weight: 700;
      line-height: 0.9;
      letter-spacing: -0.03em;
      color: var(--canal);
    }
    .discount-sub {
      margin: 10px 0 0;
      font-family: "Cormorant Garamond", Georgia, serif;
      font-size: 18px;
      font-style: italic;
      font-weight: 500;
      color: var(--muted);
    }
    .divider {
      height: 1px;
      margin: 18px 0;
      background:
        linear-gradient(90deg, transparent, var(--line) 12%, var(--line) 88%, transparent);
    }
    .meta {
      display: grid;
      gap: 10px;
    }
    .row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 14px;
      background: #fff;
      border: 1px solid var(--line);
    }
    .row span {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .row strong {
      font-size: 15px;
      font-weight: 700;
      color: var(--canal);
      text-align: right;
      letter-spacing: 0.01em;
      word-break: break-word;
    }
    .staff {
      margin-top: auto;
      padding-top: 16px;
    }
    .staff-box {
      text-align: center;
      padding: 16px 14px;
      border-radius: 16px;
      border: 1.5px dashed rgba(18,68,83,0.35);
      background: rgba(18,68,83,0.04);
    }
    .staff-box span {
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted);
    }
    .staff-box strong {
      display: block;
      margin-top: 6px;
      font-family: Cinzel, Georgia, serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--canal);
    }
    .foot {
      margin: 14px 0 0;
      text-align: center;
      font-size: 12px;
      line-height: 1.45;
      color: rgba(255,255,255,0.72);
    }
    .foot strong { color: #fff; font-weight: 600; }
    @media (prefers-reduced-motion: reduce) {
      .shell, .badge-dot { animation: none !important; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <article class="ticket" aria-label="Coupon sconto Trattoria alla Terrazza">
      <div class="hero" role="img" aria-label="Trattoria alla Terrazza">
        <div class="hero-brand">
          <p class="hotel">Hotel Canal</p>
          <h1>Trattoria alla Terrazza</h1>
        </div>
      </div>
      <div class="body">
        <div class="badge"><span class="badge-dot" aria-hidden="true"></span> Coupon attivo</div>
        <div class="discount-wrap">
          <p class="discount">−10%</p>
          <p class="discount-sub">Sconto ospite Hotel Canal</p>
        </div>
        <div class="divider" aria-hidden="true"></div>
        <div class="meta">
          <div class="row"><span>Ospite</span><strong>${guest}</strong></div>
          <div class="row"><span>Stanza</span><strong>${room}</strong></div>
          <div class="row"><span>Ospiti</span><strong>${guests}</strong></div>
        </div>
        <div class="staff">
          <div class="staff-box">
            <span>Presentato da</span>
            <strong>${staff}</strong>
          </div>
        </div>
      </div>
    </article>
    <p class="foot">Mostra questa schermata al personale del ristorante · ${year}</p>
  </main>
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
  /** Welcome ospite: l'indirizzo lo digita il guest — non applicare il blocco hotelcanal/info@. */
  allowGuestRecipient = false,
}) {
  if (!allowGuestRecipient) {
    assertSendableRecipient(to, 'ospite');
  } else if (!String(to || '').trim()) {
    throw new Error('Destinatario ospite mancante');
  }
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

  if (resendConfigured() && !preferSmtpOverResend()) {
    const resend = new Resend(env('RESEND_API_KEY').trim());
    const bcc = staffNotifyBcc(to);
    const payload = {
      from: getFrom(),
      to: [to],
      ...(bcc ? { bcc: [bcc] } : {}),
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
      const msg = error.message || JSON.stringify(error);
      if (isResendTestFrom() && /only send testing emails|own email/i.test(msg)) {
        throw new Error(
          'Resend in modalità test (onboarding@resend.dev): può mandare solo alla tua mail. Verifica un dominio su resend.com/domains e imposta SMTP_FROM tipo Welcome <checkin@checkin-hotelcanal.it>',
        );
      }
      throw new Error(msg);
    }
    if (bcc) console.log(`[mail] BCC staff → ${bcc}`);
    return data;
  }

  if (!smtpConfigured()) {
    if (isResendTestFrom()) {
      throw new Error(
        'Email ospiti bloccata: SMTP_FROM usa onboarding@resend.dev (solo test). Verifica checkin-hotelcanal.it su Resend oppure configura SMTP_USER/SMTP_PASS Gmail.',
      );
    }
    throw new Error('Email non configurata');
  }

  const transporter = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT', '587')),
    secure: env('SMTP_SECURE', 'false') === 'true',
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
  });

  const bcc = staffNotifyBcc(to);
  await transporter.sendMail({
    from: getFrom(),
    to,
    ...(bcc ? { bcc } : {}),
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
  if (bcc) console.log(`[mail] BCC staff → ${bcc}`);
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
  if (!String(to || '').trim()) {
    console.warn('[welcome] destinatario mancante, skip');
    return { sent: false, skipped: true, reason: 'missing_recipient' };
  }
  // Non bloccare info@ / @hotelcanal.com qui: è l'email digitata dall'ospite (o dalla reception).
  // Il blocco hotel resta su report/poster/BCC di sistema.
  const resolvedLang = resolveWelcomeLang(lang || language);
  const lp = welcomeCopy(resolvedLang);
  const displayName = toTitleCase(guestName) || lp.guestFallback;
  const firstName = displayName.split(/\s+/)[0] || lp.guestFallback;
  const redeemUrl = couponRedeemUrl(token);
  const claimUrl = couponClaimUrl(token);
  const mapsUrl = mapsDirectionsUrl();
  const withCoupon = Boolean(includeCoupon);
  // QR via URL pubblico (zero allegati → niente troncamento Gmail)
  const qrSrc = withCoupon
    ? `${publicBaseUrl()}/coupon/${encodeURIComponent(token)}/qr.png`
    : '';

  // Griglia 2×2: #30 (basso) · #5 · #12 · #23
  const requiredRemote = [
    ['email', 'hero-01.jpg'],
    ['restaurant', '01-terrazza-canale.jpg'],
    ['email', 'voucher-24.jpg'],
    ['email', 'band-26.jpg'],
    ['email', 'band-27.jpg'],
    ['email', 'grid-30.jpg'],
    ['email', 'grid-05.jpg'],
    ['email', 'grid-12.jpg'],
    ['email', 'grid-23.jpg'],
  ];
  for (const parts of requiredRemote) {
    if (!readEmailAsset(...parts)) {
      throw new Error(`Asset email mancante: ${parts.join('/')}`);
    }
  }

  const heroSrc = publicAssetUrl('email', 'hero-01.jpg'); // #1
  const restaurantSrc = publicAssetUrl('email', 'voucher-24.jpg'); // #24
  const gallerySrc = publicAssetUrl('restaurant', '01-terrazza-canale.jpg'); // #14
  const terraceSrc = publicAssetUrl('email', 'band-26.jpg'); // #26
  const dishSrc = publicAssetUrl('email', 'band-27.jpg'); // #27
  const thumbs = [
    { src: publicAssetUrl('email', 'grid-30.jpg'), alt: 'Astice alla Terrazza' }, // #30 basso
    { src: publicAssetUrl('email', 'grid-05.jpg'), alt: 'Risotto di mare' }, // #5
    { src: publicAssetUrl('email', 'grid-12.jpg'), alt: 'Guazzetto di mare' }, // #12
    { src: publicAssetUrl('email', 'grid-23.jpg'), alt: 'Linguine di mare' }, // #23
  ];

  const iconDefs = [
    { key: 'gondola', file: 'gondola.png' },
    { key: 'path', file: 'map.png' },
    { key: 'walk', file: 'path.png' },
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

  const wifiSsid = env('WIFI_SSID', '').trim();
  const wifiPassword = env('WIFI_PASSWORD', '').trim();
  // Walter: cancelletto (#) obbligatorio — in .env usare virgolette: DOOR_CODE_WALTER="…#"
  let doorWalter = env('DOOR_CODE_WALTER', '').trim();
  if (doorWalter && !doorWalter.endsWith('#')) doorWalter = `${doorWalter}#`;
  const doorAirone = env('DOOR_CODE_AIRONE', '').trim();

  const guidePdfUrl = ''; // Guida completa non ancora pronta — niente CTA in mail
  // const guidePdfUrl = `${publicBaseUrl()}/venice-guide.pdf?lang=${encodeURIComponent(resolvedLang)}`;

  const html = buildWelcomeHtml({
    guestName: displayName,
    roomNumber,
    receptionist,
    guestsCount,
    qrSrc,
    mapsUrl,
    heroSrc,
    restaurantSrc,
    gallerySrc,
    dishSrc,
    terraceSrc,
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
    guidePdfUrl,
  });

  const room = roomNumber || lp.roomFallback;
  const staff = receptionist || 'RECEPTION';
  const guests = guestsCount ?? 2;
  const plainName = displayName;
  const roomInSubject =
    typeof lp.subjectRoom === 'function' && roomNumber
      ? lp.subjectRoom(roomNumber)
      : '';
  // Caldo + univoco (anti-thread Gmail) + gondola
  const subject = roomInSubject
    ? `🛶 ${lp.subject}, ${firstName} · Hotel Canal (${roomInSubject})`
    : `🛶 ${lp.subject}, ${firstName} · Hotel Canal · ${String(token).slice(0, 6)}`;

  console.log(
    `[welcome] assets da ${emailAssetBaseUrl()} · QR/claim su ${publicBaseUrl()} · coupon ${withCoupon ? 'sì' : 'no (claim link)'} · html ~${Math.round(Buffer.byteLength(html, 'utf8') / 1024)}KB · 0 allegati`,
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
      lp.textTicket,
      '',
      lp.textSignature,
    ].join('\n'),
    html,
    attachments: [],
    headers: {
      'X-Entity-Ref-ID': String(token),
    },
    allowGuestRecipient: true,
  });
  return { sent: true, skipped: false };
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
      <input id="staff" name="receptionist" type="text" maxlength="40" placeholder="" autocomplete="off">
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
