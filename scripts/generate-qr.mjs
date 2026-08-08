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

const CANAL = '#124453';
const LIGHT = '#FFFFFF';

const outPng = path.join(publicDir, 'qr.png');
const outSvg = path.join(publicDir, 'qr.svg');
const outPoster = path.join(publicDir, 'cartello-reception.html');

await QRCode.toFile(outPng, publicUrl, {
  type: 'png',
  width: 1200,
  margin: 2,
  color: {
    dark: CANAL,
    light: LIGHT,
  },
  errorCorrectionLevel: 'H',
});

const svg = await QRCode.toString(publicUrl, {
  type: 'svg',
  margin: 2,
  color: {
    dark: CANAL,
    light: LIGHT,
  },
  errorCorrectionLevel: 'H',
  width: 1200,
});
fs.writeFileSync(outSvg, svg);

const qrDataUrl = await QRCode.toDataURL(publicUrl, {
  type: 'image/png',
  width: 900,
  margin: 2,
  color: { dark: CANAL, light: LIGHT },
  errorCorrectionLevel: 'H',
});

const poster = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hotel Canal — Cartello Reception QR</title>
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
    @page {
      size: A6 portrait;
      margin: 0;
    }
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
      width: 105mm;
      min-height: 148mm;
      background: #FFFFFF;
      padding: 12mm 10mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      box-shadow: 0 12px 40px rgba(18, 68, 83, 0.12);
    }
    .hotel-title {
      font-family: Cinzel, Georgia, serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--canal);
      margin: 0;
    }
    .hotel-sub {
      font-family: Cinzel, Georgia, serif;
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 4px 0 0;
    }
    .rule {
      width: 100%;
      height: 1px;
      background: rgba(18, 68, 83, 0.18);
      margin: 14px 0;
      border: 0;
    }
    .welcome-en {
      font-family: Cinzel, Georgia, serif;
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--canal);
      margin: 0;
    }
    .welcome-it {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      margin: 4px 0 0;
    }
    .instructions {
      font-size: 10.5px;
      line-height: 1.45;
      color: #515154;
      margin: 12px 0 0;
      max-width: 78mm;
      font-weight: 500;
    }
    .qr-wrap {
      margin: 14px 0;
      padding: 10px;
      border: 1px solid rgba(18, 68, 83, 0.15);
      border-radius: 18px;
      background: #FAFCFC;
    }
    .qr-wrap img {
      width: 52mm;
      height: 52mm;
      display: block;
    }
    .gift {
      width: 100%;
      background: rgba(18, 68, 83, 0.05);
      border: 1px dashed var(--canal);
      border-radius: 10px;
      padding: 10px 12px;
      margin-top: auto;
    }
    .gift strong {
      display: block;
      font-size: 9px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--canal);
      margin-bottom: 4px;
    }
    .gift p {
      margin: 0;
      font-size: 9.5px;
      line-height: 1.4;
      color: #515154;
      font-weight: 500;
    }
    .url {
      margin-top: 10px;
      font-size: 7.5px;
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
      Inquadra il QR Code con il tuo smartphone per registrare la stanza
      e attivare i servizi digitali.
    </p>
    <div class="qr-wrap">
      <img src="${qrDataUrl}" alt="QR Code Hotel Canal check-in" width="900" height="900">
    </div>
    <div class="gift">
      <strong>Regalo di benvenuto</strong>
      <p>
        Inserisci il nome del receptionist e ricevi subito via email
        lo sconto 10% per la Trattoria alla Terrazza.
      </p>
    </div>
    <p class="url">${publicUrl}</p>
  </article>
  <p class="print-hint">Stampa → PDF / A6 · Cmd+P</p>
</body>
</html>
`;

fs.writeFileSync(outPoster, poster);

console.log(`QR generato per: ${publicUrl}`);
console.log(`- ${outPng}`);
console.log(`- ${outSvg}`);
console.log(`- ${outPoster}`);
console.log('Apri cartello-reception.html e stampa (A6 / PDF).');
