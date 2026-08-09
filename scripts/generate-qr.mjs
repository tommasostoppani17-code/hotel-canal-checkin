import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

dotenv.config({ path: path.join(rootDir, '.env') });

const publicUrl = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const wifiSsid = process.env.WIFI_SSID || '';
const wifiPassword = process.env.WIFI_PASSWORD || '';
const wifiType = (process.env.WIFI_TYPE || 'WPA').toUpperCase();

const CANAL = '#124453';
const LIGHT = '#FFFFFF';

const qrOpts = {
  margin: 2,
  color: { dark: CANAL, light: LIGHT },
  errorCorrectionLevel: 'H',
};

function escapeWifiField(value) {
  return String(value).replace(/([\\;,:"])/g, '\\$1');
}

function buildWifiPayload(ssid, password, type) {
  return `WIFI:S:${escapeWifiField(ssid)};T:${type};P:${escapeWifiField(password)};;`;
}

async function makeDataUrl(text, width = 700) {
  return QRCode.toDataURL(text, { ...qrOpts, type: 'image/png', width });
}

const outAppPng = path.join(publicDir, 'qr.png');
const outAppSvg = path.join(publicDir, 'qr.svg');
const outWifiPng = path.join(publicDir, 'qr-wifi.png');
const outPoster = path.join(publicDir, 'cartello-reception.html');

await QRCode.toFile(outAppPng, publicUrl, { ...qrOpts, type: 'png', width: 1200 });
fs.writeFileSync(
  outAppSvg,
  await QRCode.toString(publicUrl, { ...qrOpts, type: 'svg', width: 1200 }),
);

const appQrDataUrl = await makeDataUrl(publicUrl, 800);

let wifiQrDataUrl = null;
let wifiPayload = null;

if (wifiSsid && wifiPassword) {
  wifiPayload = buildWifiPayload(wifiSsid, wifiPassword, wifiType);
  await QRCode.toFile(outWifiPng, wifiPayload, {
    ...qrOpts,
    type: 'png',
    width: 1200,
  });
  wifiQrDataUrl = await makeDataUrl(wifiPayload, 800);
  console.log(`Wi-Fi QR: SSID="${wifiSsid}" T=${wifiType}`);
} else {
  console.warn(
    'WIFI_SSID / WIFI_PASSWORD non impostati in .env - cartello solo con QR app.',
  );
}

const dual = Boolean(wifiQrDataUrl);

const poster = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotel Canal - Cartello Reception QR</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --canal: #124453;
      --muted: #5C7A82;
      --ink: #1D1D1F;
    }
    * { box-sizing: border-box; }
    @page { size: A5 portrait; margin: 0; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #E8EEF0;
      font-family: Montserrat, -apple-system, sans-serif;
      color: var(--ink);
      -webkit-font-smoothing: antialiased;
    }
    .sheet {
      width: 148mm;
      min-height: 210mm;
      background: #FFFFFF;
      padding: 14mm 12mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 12px 40px rgba(18, 68, 83, 0.12);
    }
    .hotel-title {
      font-family: Cinzel, Georgia, serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--canal);
      margin: 0;
    }
    .hotel-sub {
      font-family: Cinzel, Georgia, serif;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 6px 0 0;
    }
    .rule {
      width: 100%;
      height: 1px;
      background: rgba(18, 68, 83, 0.18);
      margin: 16px 0;
      border: 0;
    }
    .welcome-en {
      font-family: Cinzel, Georgia, serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--canal);
      margin: 0;
    }
    .welcome-it {
      font-size: 13px;
      font-weight: 600;
      color: var(--muted);
      margin: 4px 0 0;
    }
    .instructions {
      font-size: 11.5px;
      line-height: 1.45;
      color: #515154;
      margin: 14px 0 0;
      max-width: 120mm;
      font-weight: 500;
    }
    .qr-row {
      display: flex;
      gap: 14px;
      width: 100%;
      justify-content: center;
      margin: 18px 0 8px;
    }
    .qr-col {
      flex: 1;
      max-width: 58mm;
      padding: 10px 8px 12px;
      border: 1px solid rgba(18, 68, 83, 0.15);
      border-radius: 16px;
      background: #FAFCFC;
    }
    .qr-col.single {
      max-width: 70mm;
    }
    .qr-col img {
      width: 100%;
      aspect-ratio: 1;
      display: block;
      border-radius: 8px;
    }
    .qr-label {
      margin-top: 8px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--canal);
    }
    .qr-hint {
      margin-top: 3px;
      font-size: 8.5px;
      color: #64748B;
      line-height: 1.35;
      font-weight: 500;
    }
    .gift {
      width: 100%;
      background: rgba(18, 68, 83, 0.05);
      border: 1px dashed var(--canal);
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: auto;
    }
    .gift strong {
      display: block;
      font-size: 9.5px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--canal);
      margin-bottom: 4px;
    }
    .gift p {
      margin: 0;
      font-size: 10px;
      line-height: 1.4;
      color: #515154;
      font-weight: 500;
    }
    .url {
      margin-top: 12px;
      font-size: 8px;
      color: #94A3B8;
      word-break: break-all;
      font-family: ui-monospace, Menlo, monospace;
    }
    .print-hint {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 12px;
      color: #64748B;
      background: #fff;
      padding: 8px 14px;
      border-radius: 999px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    @media print {
      body { background: #fff; }
      .sheet { box-shadow: none; }
      .print-hint { display: none !important; }
    }
  </style>
</head>
<body>
  <article class="sheet">
    <h1 class="hotel-title">Hotel Canal</h1>
    <p class="hotel-sub">Venice Experience</p>
    <hr class="rule">
    <p class="welcome-en">Welcome to Venice</p>
    <p class="welcome-it">Benvenuto a Venezia</p>
    <p class="instructions">
      ${
        dual
          ? '1) Connettiti al Wi-Fi dell’hotel &nbsp;·&nbsp; 2) Registrati per i servizi digitali della stanza'
          : 'Inquadra il QR Code con il tuo smartphone per registrare la stanza e attivare i servizi digitali.'
      }
    </p>
    <div class="qr-row">
      ${
        dual
          ? `<div class="qr-col">
        <img src="${wifiQrDataUrl}" alt="QR Wi-Fi Hotel Canal" width="800" height="800">
        <div class="qr-label">1 · Wi-Fi</div>
        <div class="qr-hint">Rete: ${wifiSsid.replace(/</g, '')}<br>Connessione automatica</div>
      </div>
      <div class="qr-col">
        <img src="${appQrDataUrl}" alt="QR Check-in Hotel Canal" width="800" height="800">
        <div class="qr-label">2 · Check-in</div>
        <div class="qr-hint">Fast Registration<br>Servizi digitali</div>
      </div>`
          : `<div class="qr-col single">
        <img src="${appQrDataUrl}" alt="QR Check-in Hotel Canal" width="800" height="800">
        <div class="qr-label">Check-in digitale</div>
      </div>`
      }
    </div>
    <div class="gift">
      <strong>Regalo di benvenuto</strong>
      <p>
        Nel form, inserisci il nome del receptionist e ricevi via email
        lo sconto 5% per la Trattoria alla Terrazza.
      </p>
    </div>
    <p class="url">${publicUrl}</p>
  </article>
  <p class="print-hint">Stampa → PDF / A5 · Cmd+P</p>
</body>
</html>
`;

fs.writeFileSync(outPoster, poster);

console.log(`App QR: ${publicUrl}`);
console.log(`- ${outAppPng}`);
console.log(`- ${outAppSvg}`);
if (wifiPayload) console.log(`- ${outWifiPng}`);
console.log(`- ${outPoster}`);
console.log('Apri cartello-reception.html e stampa (A5 / PDF).');
