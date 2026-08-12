import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import { emailLightModeHead, emailLightBodyAttrs, EMAIL_FORCE_WHITE } from './email-light.js';
import {
  EMAIL_SANS as SANS,
  emailFontsHead,
  emailBodyStyle,
  emailDisplayStyle,
  emailEyebrowStyle,
} from './email-type.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function publicBaseUrl() {
  return (env('PUBLIC_URL', 'http://localhost:3000') || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

export function checkinPublicUrl() {
  return `${publicBaseUrl()}/`;
}

/* Step 1 brand */
const CANAL = '#164E5B';
const TEXT_DARK = '#122226';
const MUTED = '#5C7A82';
const FOOT = '#6E868F';
const RULE = '#C9D8DF';
const CREAM_TOP = '#EEF5F9';
const CREAM_BOTTOM = '#D7E6EF';

function veniceBackdropPath() {
  const poster = path.join(rootDir, 'public', 'venice-bg-poster.jpg');
  if (fs.existsSync(poster)) return poster;
  return path.join(rootDir, 'public', 'venice-bg.jpg');
}

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 900,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: CANAL, light: '#FFFFFF' },
  });
}

function drawCenteredText(doc, text, y, { font, size, color, width, x = 0 } = {}) {
  const w = width ?? doc.page.width;
  doc
    .font(font)
    .fontSize(size)
    .fillColor(color)
    .text(text, x, y, { width: w, align: 'center' });
}

/**
 * A4 poster mirroring the check-in form: Venice backdrop + floating cream glass card.
 */
export async function buildPosterPdfBuffer({
  hotelName = 'Hotel Canal',
  address = 'Santa Croce 553, 30135 Venezia',
} = {}) {
  const qrPng = await buildCheckinQrPng();
  const bgPath = veniceBackdropPath();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${hotelName} — Premium Reception Poster A4`,
        Author: hotelName,
        Subject: 'Fast Digital Check-in · Venice glass card',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const radiusIos = 20;

    // --- Full-bleed Venice (same photo as the digital form) ---
    try {
      const bg = doc.openImage(bgPath);
      const scale = Math.max(pageW / bg.width, pageH / bg.height);
      const bw = bg.width * scale;
      const bh = bg.height * scale;
      doc.image(bg, (pageW - bw) / 2, (pageH - bh) / 2, { width: bw, height: bh });
    } catch (err) {
      doc.rect(0, 0, pageW, pageH).fill('#074a63');
      console.error('[poster] backdrop missing:', err.message || err);
    }

    // Soft lagoon wash — keep Venice readable around the glass card
    doc.save();
    doc.fillColor('#074a63').fillOpacity(0.12);
    doc.rect(0, 0, pageW, pageH).fill();
    doc.restore();

    // Soft top/bottom shade so the cream card pops (like the phone UI)
    doc.save();
    doc.fillColor('#053a4d').fillOpacity(0.28);
    doc.rect(0, 0, pageW, 70).fill();
    doc.rect(0, pageH - 80, pageW, 80).fill();
    doc.restore();

    // --- Floating glass card (apple-card cream gradient) ---
    const cardW = pageW - 100;
    const cardH = 620;
    const cardX = (pageW - cardW) / 2;
    const cardY = (pageH - cardH) / 2;
    const cardR = 26;

    // Soft drop shadow
    doc.save();
    doc.fillColor('#000000').fillOpacity(0.18);
    doc.roundedRect(cardX + 4, cardY + 8, cardW, cardH, cardR).fill();
    doc.restore();

    // Cream body
    doc.save();
    const grad = doc.linearGradient(cardX, cardY, cardX, cardY + cardH);
    grad.stop(0, CREAM_TOP).stop(1, CREAM_BOTTOM);
    doc.roundedRect(cardX, cardY, cardW, cardH, cardR).fill(grad);
    doc.restore();

    // Glass rim
    doc
      .roundedRect(cardX, cardY, cardW, cardH, cardR)
      .lineWidth(1.4)
      .strokeColor('#FFFFFF')
      .stroke();
    doc
      .roundedRect(cardX + 1.2, cardY + 1.2, cardW - 2.4, cardH - 2.4, cardR - 1)
      .lineWidth(0.6)
      .strokeColor('rgba(18, 68, 83, 0.12)')
      .strokeColor('#B7CBD4')
      .stroke();

    const innerX = cardX + 28;
    const innerW = cardW - 56;
    let y = cardY + 36;

    // Brand
    drawCenteredText(doc, String(hotelName).toUpperCase(), y, {
      font: 'Times-Bold',
      size: 30,
      color: CANAL,
      width: innerW,
      x: innerX,
    });
    y += 38;
    drawCenteredText(doc, 'V E N I C E   E X P E R I E N C E', y, {
      font: 'Times-Bold',
      size: 9.5,
      color: MUTED,
      width: innerW,
      x: innerX,
    });
    y += 20;
    drawCenteredText(doc, address, y, {
      font: 'Helvetica',
      size: 8.5,
      color: MUTED,
      width: innerW,
      x: innerX,
    });
    y += 26;

    doc
      .moveTo(innerX + 36, y)
      .lineTo(innerX + innerW - 36, y)
      .lineWidth(0.7)
      .strokeColor(RULE)
      .stroke();
    y += 22;

    drawCenteredText(doc, 'Fast Digital Check-in', y, {
      font: 'Helvetica-Bold',
      size: 16,
      color: TEXT_DARK,
      width: innerW,
      x: innerX,
    });
    y += 26;

    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(TEXT_DARK)
      .text(
        'Scan the QR code with your smartphone to complete room registration and unlock front-desk services instantly.',
        innerX + 8,
        y,
        { width: innerW - 16, align: 'center', lineGap: 3 },
      );
    y += 48;

    // QR plate — --radius-ios
    const qrSize = 188;
    const platePad = 16;
    const plate = qrSize + platePad * 2;
    const plateX = cardX + (cardW - plate) / 2;
    const plateY = y;

    // White QR nest
    doc.save();
    doc.roundedRect(plateX, plateY, plate, plate, radiusIos).fill('#FFFFFF');
    doc.restore();
    doc
      .roundedRect(plateX, plateY, plate, plate, radiusIos)
      .lineWidth(1.35)
      .strokeColor(CANAL)
      .stroke();

    doc.image(qrPng, plateX + platePad, plateY + platePad, {
      width: qrSize,
      height: qrSize,
    });

    y = plateY + plate + 14;
    drawCenteredText(doc, 'SCAN WITH YOUR SMARTPHONE', y, {
      font: 'Helvetica-Bold',
      size: 8.5,
      color: CANAL,
      width: innerW,
      x: innerX,
    });
    y += 28;

    // Three benefits
    const benefits = [
      { title: 'DOOR CODES', line: 'Instant access codes\nfor your stay' },
      { title: 'WI-FI', line: 'Network name & password\nright after check-in' },
      { title: '10% DINING', line: 'Voucher at Trattoria\nalla Terrazza' },
    ];
    const colW = innerW / 3;
    benefits.forEach((b, i) => {
      const x = innerX + i * colW;
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(CANAL)
        .text(b.title, x + 2, y, { width: colW - 4, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(TEXT_DARK)
        .text(b.line, x + 4, y + 14, {
          width: colW - 8,
          align: 'center',
          lineGap: 1.5,
        });
    });

    // Footer inside card
    const footY = cardY + cardH - 58;
    doc
      .moveTo(innerX, footY)
      .lineTo(innerX + innerW, footY)
      .lineWidth(0.6)
      .strokeColor(RULE)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(7.2)
      .fillColor(FOOT)
      .text(
        'GDPR compliant · Encrypted pipeline · Automatic 24h data purge',
        innerX,
        footY + 10,
        { width: innerW, align: 'center' },
      );
    drawCenteredText(doc, `CANAL S.r.l. — ${address}`, footY + 26, {
      font: 'Helvetica',
      size: 7.2,
      color: FOOT,
      width: innerW,
      x: innerX,
    });
    drawCenteredText(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 40, {
      font: 'Helvetica',
      size: 7,
      color: MUTED,
      width: innerW,
      x: innerX,
    });

    doc.end();
  });
}

function buildPosterEmailHtml({ hotelName, pdfKb }) {
  const brand = String(hotelName || 'Hotel Canal');
  const C = '#164E5B';
  const BRASS = '#6E868F';
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
${emailFontsHead()}
${emailLightModeHead({
  canal: C,
  box: '#E9EEF0',
  extraCss: `
    body{font-family:${SANS};margin:0;padding:32px 20px;background:#FFFFFF !important;}
    .card{max-width:480px;margin:0 auto;border:1px solid #E2E6E8;border-radius:24px;padding:28px 24px;background:#FFFFFF !important;}
    h1{${emailDisplayStyle({ size: '22px', color: C, tracking: '0.1em' })};margin:0 0 8px;text-align:center;}
    .eyebrow{${emailEyebrowStyle({ color: BRASS })};margin:0 0 18px;text-align:center;}
    p{${emailBodyStyle()};color:#4A5560 !important;margin:0 0 14px;}
    .meta{font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${BRASS} !important;margin:18px 0 0;}
  `,
})}
</head>
<body ${emailLightBodyAttrs()}>
<div class="card force-white" bgcolor="${EMAIL_FORCE_WHITE}" style="background-color:${EMAIL_FORCE_WHITE} !important;">
<div class="eyebrow">Reception · A4 poster</div>
<h1>${brand}</h1>
<p>Your A4 reception poster is attached as a PDF (Venice backdrop · glass card · Welcome Discount).</p>
<p>Print at <strong style="font-style:italic;color:${C} !important;">100% / actual size</strong> on A4 matte 160–200 g. Best in frosted plexiglass.</p>
<p class="meta">File size ~${pdfKb} KB · QR → ${publicBaseUrl()}/</p>
</div></body></html>`;
}

export async function sendPosterEmail({ to } = {}) {
  const apiKey = env('RESEND_API_KEY').trim();
  if (!apiKey) throw new Error('RESEND_API_KEY non configurata');

  const recipient = String(
    to || env('REPORT_EMAIL') || 'tommasostoppani17@gmail.com',
  ).trim();
  if (!recipient) throw new Error('Destinatario poster non configurato');

  const hotelName = env('HOTEL_NAME', 'Hotel Canal');
  const pdf = await buildPosterPdfBuffer({ hotelName });
  const pdfKb = Math.max(1, Math.round(pdf.length / 1024));
  const from = env(
    'SMTP_FROM',
    'Welcome to Hotel Canal <onboarding@resend.dev>',
  );

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: `${hotelName} — A4 Reception Poster (PDF)`,
    text: [
      `${hotelName} — A4 Reception Poster`,
      ``,
      `PDF attached. Print at 100% / actual size on A4.`,
      `Check-in URL: ${checkinPublicUrl()}`,
    ].join('\n'),
    html: buildPosterEmailHtml({ hotelName, pdfKb }),
    attachments: [
      {
        filename: 'Hotel_Canal_Poster_Premium.pdf',
        content: pdf,
      },
    ],
  });

  if (error) {
    throw new Error(
      `Resend API error: ${error.message || JSON.stringify(error)}`.slice(
        0,
        300,
      ),
    );
  }

  return { to: recipient, id: data?.id || null, bytes: pdf.length, pdfKb };
}
