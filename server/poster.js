import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { assertSendableRecipient, sendableRecipientOrEmpty } from './recipient-guard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

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

const CANAL = '#124453';
const TEXT = '#1A2B31';
const MUTED = '#6E868F';
const RULE = '#D7E2E6';
const PAPER = '#FFFFFF';
const SOFT = '#F3F6F7';

function drawCentered(doc, text, y, { font, size, color, width, x = 0 } = {}) {
  const w = width ?? doc.page.width;
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, {
    width: w,
    align: 'center',
  });
}

function drawHairline(doc, y, pageW, inset = 48) {
  doc
    .moveTo(inset, y)
    .lineTo(pageW - inset, y)
    .lineWidth(0.7)
    .strokeColor(RULE)
    .stroke();
}

function roundedImage(doc, imgPath, x, y, w, h, radius = 12) {
  if (!fs.existsSync(imgPath)) return;
  doc.save();
  doc.roundedRect(x, y, w, h, radius).clip();
  doc.image(imgPath, x, y, { width: w, height: h, cover: [w, h], align: 'center', valign: 'center' });
  doc.restore();
  doc
    .roundedRect(x, y, w, h, radius)
    .lineWidth(0.8)
    .strokeColor(RULE)
    .stroke();
}

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 900,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: CANAL, light: PAPER },
  });
}

/**
 * A4 reception check-in poster — calm desk sign.
 * Hotel + restaurant photos, clear QR, no promo flash.
 */
export async function buildPosterPdfBuffer({
  hotelName = 'Hotel Canal',
  address = 'Santa Croce 553, 30135 Venezia',
} = {}) {
  const qrPng = await buildCheckinQrPng();
  const hotelPhoto = path.join(rootDir, 'public', 'email', 'hero-01.jpg');
  const restoPhoto = path.join(rootDir, 'public', 'email', 'band-26.jpg');

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${hotelName} — Reception check-in`,
        Author: hotelName,
        Subject: 'Digital check-in · reception sign',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const side = 48;

    // Clean paper
    doc.rect(0, 0, pageW, pageH).fill(PAPER);
    doc.rect(0, 0, pageW, 5).fill(CANAL);

    // Brand
    let y = 36;
    drawCentered(doc, String(hotelName).toUpperCase(), y, {
      font: 'Times-Bold',
      size: 28,
      color: CANAL,
    });
    y += 34;
    drawCentered(doc, address, y, {
      font: 'Helvetica',
      size: 9,
      color: MUTED,
    });
    y += 22;
    drawHairline(doc, y, pageW, side + 12);
    y += 18;

    // Hotel + restaurant — half and half
    const gap = 10;
    const photoH = 118;
    const photoW = (pageW - side * 2 - gap) / 2;
    roundedImage(doc, hotelPhoto, side, y, photoW, photoH, 14);
    roundedImage(doc, restoPhoto, side + photoW + gap, y, photoW, photoH, 14);

    // Tiny captions under photos
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text('Hotel', side, y + photoH + 6, { width: photoW, align: 'center' });
    doc.text('Trattoria alla Terrazza', side + photoW + gap, y + photoH + 6, {
      width: photoW,
      align: 'center',
    });

    y += photoH + 28;
    drawHairline(doc, y, pageW, side + 12);
    y += 22;

    drawCentered(doc, 'Digital check-in', y, {
      font: 'Helvetica-Bold',
      size: 18,
      color: TEXT,
    });
    y += 24;
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(TEXT)
      .text(
        'Scan the code to register your room. You will receive Wi‑Fi details, door codes, and a welcome note for the restaurant.',
        side + 20,
        y,
        { width: pageW - side * 2 - 40, align: 'center', lineGap: 3 },
      );
    y += 44;

    // Quiet QR plate
    const qrSize = 196;
    const pad = 16;
    const frame = qrSize + pad * 2;
    const frameX = (pageW - frame) / 2;
    const frameY = y;

    doc.roundedRect(frameX, frameY, frame, frame, 16).fill(SOFT);
    doc
      .roundedRect(frameX, frameY, frame, frame, 16)
      .lineWidth(1.2)
      .strokeColor(CANAL)
      .stroke();

    const qrX = frameX + pad;
    const qrY = frameY + pad;
    doc.save();
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 10).clip();
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
    doc.restore();

    y = frameY + frame + 14;
    drawCentered(doc, 'SCAN WITH YOUR PHONE CAMERA', y, {
      font: 'Helvetica-Bold',
      size: 8,
      color: CANAL,
    });
    y += 28;

    // Simple three lines — no promo chips
    const items = [
      { title: 'Wi‑Fi', line: 'Network and password after check-in' },
      { title: 'Door codes', line: 'Access codes for your stay' },
      { title: 'Restaurant', line: 'Welcome offer at Trattoria alla Terrazza' },
    ];
    const colW = (pageW - side * 2) / 3;
    items.forEach((item, i) => {
      const left = side + i * colW;
      doc
        .font('Helvetica-Bold')
        .fontSize(9.5)
        .fillColor(CANAL)
        .text(item.title, left + 6, y, { width: colW - 12, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(item.line, left + 8, y + 14, {
          width: colW - 16,
          align: 'center',
          lineGap: 1.5,
        });
      if (i < 2) {
        const vx = side + (i + 1) * colW;
        doc
          .moveTo(vx, y)
          .lineTo(vx, y + 36)
          .lineWidth(0.6)
          .strokeColor(RULE)
          .stroke();
      }
    });

    // Footer
    const footY = pageH - 58;
    drawHairline(doc, footY, pageW, side);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        'Private and secure · GDPR · guest data deleted automatically after 24 hours',
        side,
        footY + 12,
        { width: pageW - side * 2, align: 'center' },
      );
    drawCentered(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 28, {
      font: 'Helvetica',
      size: 8,
      color: CANAL,
    });

    doc.end();
  });
}

export function buildPosterEmailHtml({ hotelName, pdfKb }) {
  const brand = String(hotelName || 'Hotel Canal');
  const C = '#124453';
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
${emailFontsHead()}
${emailLightModeHead({
  canal: C,
  box: '#E9EEF0',
  extraCss: `
    body{font-family:${SANS};margin:0;padding:32px 20px;background:#FFFFFF !important;}
    .card{max-width:480px;margin:0 auto;border:1px solid #E2E6E8;border-radius:20px;padding:28px 24px;background:#FFFFFF !important;}
    h1{${emailDisplayStyle({ size: '20px', color: C, tracking: '0.06em' })};margin:0 0 8px;text-align:center;}
    .eyebrow{${emailEyebrowStyle({ color: '#6E868F' })};margin:0 0 16px;text-align:center;}
    p{${emailBodyStyle()};color:#4A5560 !important;margin:0 0 12px;}
    .meta{font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#6E868F !important;margin:16px 0 0;}
  `,
})}
</head>
<body ${emailLightBodyAttrs()}>
<div class="card force-white" bgcolor="${EMAIL_FORCE_WHITE}" style="background-color:${EMAIL_FORCE_WHITE} !important;">
<div class="eyebrow">Reception</div>
<h1>${brand}</h1>
<p>In allegato il <strong style="color:${C} !important;">cartello check-in A4</strong> per la reception (hotel + ristorante, QR centrale).</p>
<p>Stampa a <strong style="font-style:italic;color:${C} !important;">100% / actual size</strong> su carta opaca.</p>
<p class="meta">File ~${pdfKb} KB · QR → ${publicBaseUrl()}/</p>
</div></body></html>`;
}

export async function sendPosterEmail({ to } = {}) {
  const apiKey = env('RESEND_API_KEY').trim();
  if (!apiKey) throw new Error('RESEND_API_KEY non configurata');

  const recipientRaw = String(
    to || env('REPORT_EMAIL') || 'tommasostoppani17@gmail.com',
  ).trim();
  const recipient = sendableRecipientOrEmpty(recipientRaw);
  if (!recipient) {
    throw new Error(
      `Destinatario poster bloccato (info@ / hotelcanal): ${recipientRaw}`,
    );
  }
  assertSendableRecipient(recipient, 'poster');

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
    subject: `${hotelName} — Cartello check-in A4`,
    text: [
      `${hotelName} — Cartello check-in A4`,
      ``,
      `PDF in allegato. Stampa a 100% / actual size su A4.`,
      `Check-in URL: ${checkinPublicUrl()}`,
    ].join('\n'),
    html: buildPosterEmailHtml({ hotelName, pdfKb }),
    attachments: [
      {
        filename: 'Hotel_Canal_Cartello_Checkin.pdf',
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
