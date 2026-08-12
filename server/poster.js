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

/** Stessi token colore dell’email welcome */
const C = '#164E5B';
const BOX = '#E9EEF0';
const BRASS = '#6E868F';
const RULE = '#E8E4DC';
const BORDER = '#E2E6E8';
const MUTED = '#4A5560';
const SOFT = '#5C6670';
const PAPER = '#FFFFFF';
const LABEL = '#8A949C';

function drawCentered(doc, text, y, { font, size, color, width, x = 0 } = {}) {
  const w = width ?? doc.page.width;
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, {
    width: w,
    align: 'center',
  });
}

/** Cover-crop in a rounded frame (no stretch / letterbox). */
function roundedCoverImage(doc, imgPath, x, y, w, h, radius = 14) {
  if (!fs.existsSync(imgPath)) return;
  const img = doc.openImage(imgPath);
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  doc.save();
  doc.roundedRect(x, y, w, h, radius).clip();
  doc.image(img, dx, dy, { width: dw, height: dh });
  doc.restore();
  doc.roundedRect(x, y, w, h, radius).lineWidth(0.8).strokeColor(BORDER).stroke();
}

function drawIcon(doc, iconPath, cx, cy, size = 22) {
  if (!fs.existsSync(iconPath)) return;
  doc.image(iconPath, cx - size / 2, cy - size / 2, {
    width: size,
    height: size,
  });
}

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 900,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: C, light: PAPER },
  });
}

/**
 * Cartello A4 — stesso linguaggio visuale dell’email welcome
 * (petroleum, card bordate, brand, icone email, QR tipo access-card).
 */
export async function buildPosterPdfBuffer({
  hotelName = 'Hotel Canal',
  address = 'Santa Croce 553 · Venezia',
} = {}) {
  const qrPng = await buildCheckinQrPng();
  const hotelPhoto = path.join(rootDir, 'public', 'email', 'hero-01.jpg');
  const hotelDetail = path.join(rootDir, 'public', 'email', 'postcard-ingresso.jpg');
  const restoPhoto = path.join(rootDir, 'public', 'email', 'band-26.jpg');
  const iconDir = path.join(rootDir, 'public', 'email', 'icons');
  const ico = {
    gondola: path.join(iconDir, 'gondola.png'),
    bricola: path.join(iconDir, 'bricola.png'),
    door: path.join(iconDir, 'door.png'),
    cloche: path.join(iconDir, 'cloche.png'),
    qr: path.join(iconDir, 'qr.png'),
  };

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${hotelName} — Cartello check-in`,
        Author: hotelName,
        Subject: 'Digital check-in · reception',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const side = 42;
    const contentW = pageW - side * 2;

    doc.rect(0, 0, pageW, pageH).fill(PAPER);

    // Hero postcard — cover crop
    let y = 26;
    const heroH = 142;
    roundedCoverImage(doc, hotelPhoto, side, y, contentW, heroH, 16);
    y += heroH + 16;

    // Brand + gondola icon
    drawIcon(doc, ico.gondola, pageW / 2, y + 12, 26);
    y += 28;
    drawCentered(doc, String(hotelName).toUpperCase(), y, {
      font: 'Times-Bold',
      size: 26,
      color: C,
    });
    y += 30;
    drawCentered(doc, String(address).toUpperCase(), y, {
      font: 'Helvetica',
      size: 9,
      color: BRASS,
    });
    y += 16;
    doc
      .moveTo(side + 24, y)
      .lineTo(pageW - side - 24, y)
      .lineWidth(0.8)
      .strokeColor(RULE)
      .stroke();
    y += 14;

    doc
      .font('Times-Italic')
      .fontSize(12.5)
      .fillColor(MUTED)
      .text(
        'Welcome. Scan the code below to complete a quick digital check-in for your room.',
        side + 18,
        y,
        { width: contentW - 36, align: 'center', lineGap: 2 },
      );
    y += 34;

    // Duo hotel + restaurant — cover crop
    const gap = 10;
    const duoH = 108;
    const duoW = (contentW - gap) / 2;
    roundedCoverImage(doc, hotelDetail, side, y, duoW, duoH, 14);
    roundedCoverImage(doc, restoPhoto, side + duoW + gap, y, duoW, duoH, 14);
    y += duoH + 18;

    // Section with icon
    drawIcon(doc, ico.qr, side + 10, y + 6, 18);
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C)
      .text('DIGITAL CHECK-IN', side + 34, y, {
        width: contentW - 44,
        align: 'left',
      });
    doc
      .moveTo(side, y + 18)
      .lineTo(pageW - side, y + 18)
      .lineWidth(0.7)
      .strokeColor(RULE)
      .stroke();
    y += 26;
    doc
      .font('Times-Italic')
      .fontSize(11)
      .fillColor(SOFT)
      .text(
        'Wi‑Fi, door codes and a welcome note for Trattoria alla Terrazza — all after you scan.',
        side + 16,
        y,
        { width: contentW - 32, align: 'center', lineGap: 2 },
      );
    y += 30;

    // QR access-card
    const qrSize = 158;
    const pad = 14;
    const cardW = qrSize + pad * 2;
    const cardH = qrSize + pad * 2 + 34;
    const cardX = (pageW - cardW) / 2;
    doc.roundedRect(cardX, y, cardW, cardH, 18).fill(PAPER);
    doc
      .roundedRect(cardX, y, cardW, cardH, 18)
      .lineWidth(1.5)
      .strokeColor(C)
      .stroke();

    drawCentered(doc, 'SCAN WITH YOUR PHONE', y + 11, {
      font: 'Helvetica-Bold',
      size: 8,
      color: LABEL,
      width: cardW,
      x: cardX,
    });

    const qrX = cardX + pad;
    const qrY = y + 24;
    doc.save();
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 8).clip();
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
    doc.restore();

    drawCentered(doc, 'CHECK-IN HOTEL CANAL', qrY + qrSize + 7, {
      font: 'Times-Bold',
      size: 11,
      color: C,
      width: cardW,
      x: cardX,
    });

    y += cardH + 16;

    // Benefit chips + email icons
    const chips = [
      { k: 'WI-FI', v: 'Network &\npassword', icon: ico.bricola },
      { k: 'DOORS', v: 'Access\ncodes', icon: ico.door },
      { k: 'DINING', v: 'Trattoria\nwelcome', icon: ico.cloche },
    ];
    const chipGap = 8;
    const chipW = (contentW - chipGap * 2) / 3;
    const chipH = 72;
    chips.forEach((chip, i) => {
      const x = side + i * (chipW + chipGap);
      doc.roundedRect(x, y, chipW, chipH, 12).fill(BOX);
      doc.roundedRect(x, y, chipW, chipH, 12).lineWidth(0.8).strokeColor(BORDER).stroke();
      drawIcon(doc, chip.icon, x + chipW / 2, y + 18, 22);
      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(LABEL)
        .text(chip.k, x + 4, y + 32, { width: chipW - 8, align: 'center' });
      doc
        .font('Times-Bold')
        .fontSize(10.5)
        .fillColor(C)
        .text(chip.v, x + 6, y + 44, {
          width: chipW - 12,
          align: 'center',
          lineGap: 0.5,
        });
    });

    const footY = pageH - 48;
    doc
      .moveTo(side, footY)
      .lineTo(pageW - side, footY)
      .lineWidth(0.8)
      .strokeColor(RULE)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(BRASS)
      .text(
        'Private & secure · GDPR · data deleted after 24 hours',
        side,
        footY + 10,
        { width: contentW, align: 'center' },
      );
    drawCentered(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 24, {
      font: 'Times-Bold',
      size: 10,
      color: C,
    });

    doc.end();
  });
}

export function buildPosterEmailHtml({ hotelName, pdfKb }) {
  const brand = String(hotelName || 'Hotel Canal');
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
${emailFontsHead()}
${emailLightModeHead({
  canal: C,
  box: BOX,
  extraCss: `
    body{font-family:${SANS};margin:0;padding:32px 20px;background:#FFFFFF !important;}
    .card{max-width:480px;margin:0 auto;border:1px solid #E2E6E8;border-radius:24px;padding:28px 24px;background:#FFFFFF !important;}
    h1{${emailDisplayStyle({ size: '22px', color: C, tracking: '0.1em' })};margin:0 0 8px;text-align:center;}
    .eyebrow{${emailEyebrowStyle({ color: BRASS })};margin:0 0 18px;text-align:center;}
    p{${emailBodyStyle()};color:#4A5560 !important;margin:0 0 14px;}
    .meta{font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#6E868F !important;margin:18px 0 0;}
  `,
})}
</head>
<body ${emailLightBodyAttrs()}>
<div class="card force-white" bgcolor="${EMAIL_FORCE_WHITE}" style="background-color:${EMAIL_FORCE_WHITE} !important;">
<div class="eyebrow">Reception</div>
<h1>${brand}</h1>
<p>In allegato il <strong style="color:${C} !important;">cartello check-in A4</strong> (stesso stile delle email ospiti).</p>
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
