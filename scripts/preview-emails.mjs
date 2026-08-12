#!/usr/bin/env node
/**
 * Genera HTML di tutte le email del sistema in data/email-previews/
 * Uso: node scripts/preview-emails.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import {
  buildWelcomeHtml,
  buildCouponRedeemPage,
  publicBaseUrl,
  couponRedeemUrl,
  couponClaimUrl,
} from '../server/coupon.js';
import {
  buildReportEmail,
  buildMonthlyStaffEmail,
  buildTableBookingEmail,
} from '../server/report.js';
import {
  buildPosterEmailHtml,
  buildPosterPdfBuffer,
  buildCheckinQrPng,
} from '../server/poster.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });

const outDir = path.join(root, 'data', 'email-previews');
fs.mkdirSync(outDir, { recursive: true });

function publicAssetUrl(...parts) {
  const base = (
    process.env.PUBLIC_URL || 'https://checkin-hotelcanal.it'
  ).replace(/\/$/, '');
  return `${base}/${parts.map(encodeURIComponent).join('/')}`;
}

function asset(file) {
  return publicAssetUrl('email', file);
}

function write(name, html) {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, html, 'utf8');
  console.log(`✓ ${name} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`);
  return name;
}

const files = [];
const base = publicBaseUrl();
const token = 'preview-token-demo';
const wifiSsid = String(process.env.WIFI_SSID || 'hotel canal').trim();
const wifiPassword = String(process.env.WIFI_PASSWORD || 'preview').trim();
let doorWalter = String(process.env.DOOR_CODE_WALTER || '1234#').trim();
if (doorWalter && !doorWalter.endsWith('#')) doorWalter = `${doorWalter}#`;
const doorAirone = String(process.env.DOOR_CODE_AIRONE || '5678').trim();

const welcomeArgs = {
  guestName: 'Tommaso Stoppani',
  roomNumber: '17',
  receptionist: 'TOMMASO',
  guestsCount: 2,
  qrSrc: `${base}/coupon/${encodeURIComponent(token)}/qr.png`,
  mapsUrl: 'https://maps.google.com/?q=Trattoria+alla+Terrazza+Venezia',
  heroSrc: asset('hero-01.jpg'),
  restaurantSrc: asset('voucher-24.jpg'),
  gallerySrc: publicAssetUrl('restaurant', '01-terrazza-canale.jpg'),
  dishSrc: asset('band-27.jpg'),
  terraceSrc: asset('band-26.jpg'),
  thumbs: [
    { src: asset('grid-30.jpg'), alt: 'Astice' },
    { src: asset('grid-05.jpg'), alt: 'Risotto' },
    { src: asset('grid-12.jpg'), alt: 'Guazzetto' },
    { src: asset('grid-23.jpg'), alt: 'Linguine' },
  ],
  icons: {
    gondola: publicAssetUrl('email', 'icons', 'gondola.png'),
    path: publicAssetUrl('email', 'icons', 'map.png'),
    walk: publicAssetUrl('email', 'icons', 'path.png'),
    bridge: publicAssetUrl('email', 'icons', 'bridge.png'),
    wine: publicAssetUrl('email', 'icons', 'wine.png'),
    door: publicAssetUrl('email', 'icons', 'door.png'),
    calendar: publicAssetUrl('email', 'icons', 'calendar.png'),
    key: publicAssetUrl('email', 'icons', 'key-discount.png'),
    cloche: publicAssetUrl('email', 'icons', 'cloche.png'),
    bricola: publicAssetUrl('email', 'icons', 'bricola.png'),
  },
  stickers: {
    mask: publicAssetUrl('email', 'stickers', 'mask.png'),
    basilica: publicAssetUrl('email', 'stickers', 'basilica.png'),
    campanile: publicAssetUrl('email', 'stickers', 'campanile.png'),
    palazzo: publicAssetUrl('email', 'stickers', 'palazzo.png'),
    mooring: publicAssetUrl('email', 'stickers', 'mooring.png'),
    lion: publicAssetUrl('email', 'stickers', 'lion.png'),
  },
  wifiSsid,
  wifiPassword,
  doorWalter,
  doorAirone,
  claimUrl: couponClaimUrl(token),
  guidePdfUrl: '',
};

files.push(
  write(
    '01-welcome-ospite-IT.html',
    buildWelcomeHtml({ ...welcomeArgs, lang: 'it', includeCoupon: true }),
  ),
);
files.push(
  write(
    '02-welcome-ospite-EN.html',
    buildWelcomeHtml({ ...welcomeArgs, lang: 'en', includeCoupon: true }),
  ),
);
files.push(
  write(
    '03-welcome-senza-coupon.html',
    buildWelcomeHtml({
      ...welcomeArgs,
      lang: 'it',
      includeCoupon: false,
      qrSrc: '',
      claimUrl: couponClaimUrl(token),
    }),
  ),
);

const dailyRows = [
  {
    guest_name: 'Mario Rossi',
    room_number: '12',
    phone: '+39 333 111 2222',
    email: 'mario@example.com',
    receptionist: 'TOMMASO',
    guests_count: 2,
    coupon_token: 'abc',
    coupon_sent_at: new Date().toISOString(),
    table_booking: '20:00',
  },
  {
    guest_name: 'Anna Bianchi',
    room_number: '5',
    phone: '+39 340 000 1111',
    email: 'anna@example.com',
    receptionist: 'PAYEL',
    guests_count: 1,
    coupon_token: null,
    coupon_sent_at: null,
    table_booking: null,
  },
];

const daily = buildReportEmail({
  hotelName: 'Hotel Canal',
  count: dailyRows.length,
  dateLabel: '12 agosto 2026',
  rows: dailyRows,
});
files.push(write('04-report-giornaliero-Payel.html', daily.html));

const monthly = buildMonthlyStaffEmail({
  hotelName: 'Hotel Canal',
  monthLabel: 'LUGLIO',
  year: '2026',
  totals: { totale_mese: 48, totale_coupon: 31 },
  ranking: [
    { receptionist: 'TOMMASO', totale_registrati: 22, coupon_emessi: 18 },
    { receptionist: 'PAYEL', totale_registrati: 16, coupon_emessi: 9 },
    { receptionist: 'MIZAN', totale_registrati: 10, coupon_emessi: 4 },
  ],
});
files.push(write('05-report-mensile-staff.html', monthly.html));

const booking = buildTableBookingEmail({
  hotelName: 'Hotel Canal',
  row: {
    guest_name: 'Ismary Lopez',
    room_number: '17',
    phone: '+34 600 000 000',
    guests_count: 2,
    receptionist: 'TOMMASO',
    table_booking: '20:15',
    coupon_token: 'preview',
    coupon_sent_at: new Date().toISOString(),
  },
});
files.push(write('06-alert-tavolo-Payel.html', booking.html));

files.push(
  write(
    '07-pagina-qr-voucher.html',
    buildCouponRedeemPage({
      receptionist: 'TOMMASO',
      roomNumber: '17',
      guestName: 'Tommaso Stoppani',
      guestsCount: 2,
    }),
  ),
);

// Print poster preview (A4 visual) + regenerate PDF on disk
const qrPng = await buildCheckinQrPng();
const qrDataUrl = `data:image/png;base64,${qrPng.toString('base64')}`;
const bgRel = '../../public/venice-bg-poster.jpg';
const posterHtml = fs
  .readFileSync(path.join(root, 'public', 'qr-poster.html'), 'utf8')
  .replace('src="/qr-checkin.png"', `src="${qrDataUrl}"`)
  .replace('src="/email/hero-01.jpg"', `src="../../public/email/hero-01.jpg"`)
  .replace('src="/email/band-26.jpg"', `src="../../public/email/band-26.jpg"`)
  .replace('__PUBLIC_URL__', base.replace(/\/$/, ''));
files.push(write('07-poster-reception.html', posterHtml));

const posterPdf = await buildPosterPdfBuffer({ hotelName: 'Hotel Canal' });
fs.writeFileSync(path.join(root, 'Hotel_Canal_Cartello_Checkin.pdf'), posterPdf);
console.log(
  `✓ Hotel_Canal_Cartello_Checkin.pdf (${Math.round(posterPdf.length / 1024)} KB)`,
);

files.push(
  write(
    '08-poster-email.html',
    buildPosterEmailHtml({
      hotelName: 'Hotel Canal',
      pdfKb: Math.max(1, Math.round(posterPdf.length / 1024)),
    }),
  ),
);

const index = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Hotel Canal — Anteprima email</title>
  <style>
    :root { --c:#124453; --bg:#EEF4F6; }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: var(--bg); color: #1D1D1F;
    }
    header {
      padding: 28px 24px 18px; background: #fff; border-bottom: 1px solid #D7E2E6;
      position: sticky; top: 0; z-index: 2;
    }
    h1 { margin: 0 0 6px; font-size: 20px; color: var(--c); letter-spacing: 0.04em; }
    p { margin: 0; color: #5C6670; font-size: 14px; }
    .grid {
      display: grid; gap: 14px; padding: 20px;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      max-width: 1100px; margin: 0 auto;
    }
    a.card {
      display: block; background: #fff; border: 1px solid #D7E2E6; border-radius: 16px;
      padding: 18px 16px; text-decoration: none; color: inherit;
      box-shadow: 0 4px 16px rgba(18,68,83,0.06);
    }
    a.card:hover { border-color: var(--c); }
    .num { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #8A949C; }
    .title { margin: 8px 0 4px; font-size: 16px; font-weight: 700; color: var(--c); }
    .who { font-size: 13px; color: #5C6670; }
  </style>
</head>
<body>
  <header>
    <h1>Hotel Canal — anteprime</h1>
    <p>Email, pagina QR voucher e poster reception. Clicca per aprire.</p>
  </header>
  <div class="grid">
    <a class="card" href="01-welcome-ospite-IT.html" target="_blank">
      <div class="num">01 · Ospite</div>
      <div class="title">Welcome + coupon (−10%)</div>
      <div class="who">Italiano · Wi‑Fi, porte, Trattoria</div>
    </a>
    <a class="card" href="02-welcome-ospite-EN.html" target="_blank">
      <div class="num">02 · Ospite</div>
      <div class="title">Welcome + coupon (EN)</div>
      <div class="who">English version</div>
    </a>
    <a class="card" href="03-welcome-senza-coupon.html" target="_blank">
      <div class="num">03 · Ospite</div>
      <div class="title">Welcome senza coupon</div>
      <div class="who">Claim link · no QR voucher</div>
    </a>
    <a class="card" href="04-report-giornaliero-Payel.html" target="_blank">
      <div class="num">04 · Payel</div>
      <div class="title">Report giornaliero</div>
      <div class="who">Contatti + numeri WhatsApp + CSV</div>
    </a>
    <a class="card" href="05-report-mensile-staff.html" target="_blank">
      <div class="num">05 · Payel</div>
      <div class="title">Report mensile staff</div>
      <div class="who">Classifica receptionist / referral</div>
    </a>
    <a class="card" href="06-alert-tavolo-Payel.html" target="_blank">
      <div class="num">06 · Payel</div>
      <div class="title">Alert richiesta tavolo</div>
      <div class="who">Trattoria · chiama ospite</div>
    </a>
    <a class="card" href="07-pagina-qr-voucher.html" target="_blank">
      <div class="num">07 · QR scan</div>
      <div class="title">Pagina coupon dopo scan QR</div>
      <div class="who">Schermata che apre il QR nell’email</div>
    </a>
    <a class="card" href="07-poster-reception.html" target="_blank">
      <div class="num">07B · Reception</div>
      <div class="title">Cartello check-in A4</div>
      <div class="who">Hotel + ristorante · QR · tono normale</div>
    </a>
    <a class="card" href="08-poster-email.html" target="_blank">
      <div class="num">08 · Staff</div>
      <div class="title">Email cartello check-in</div>
      <div class="who">Mail con PDF allegato</div>
    </a>
  </div>
</body>
</html>`;

write('index.html', index);
console.log(`\nApri: ${path.join(outDir, 'index.html')}`);
console.log(`Redeem URL ref: ${couponRedeemUrl(token)}`);
