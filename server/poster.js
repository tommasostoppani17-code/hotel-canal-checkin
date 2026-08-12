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
const CANAL_DEEP = '#071F26';
const GOLD = '#D4AF6A';
const CREAM = '#F4F1EA';
const WHITE = '#FFFFFF';
const MUTED = '#8FA8B2';

function drawCentered(doc, text, y, { font, size, color, width, x = 0, opacity = 1 } = {}) {
  const w = width ?? doc.page.width;
  doc.save();
  if (opacity < 1) doc.fillOpacity(opacity);
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, {
    width: w,
    align: 'center',
  });
  doc.restore();
}

function drawGoldDiamond(doc, cx, cy, size = 3.2) {
  doc.save();
  doc
    .moveTo(cx, cy - size)
    .lineTo(cx + size, cy)
    .lineTo(cx, cy + size)
    .lineTo(cx - size, cy)
    .closePath()
    .fillColor(GOLD)
    .fill();
  doc.restore();
}

function drawOrnament(doc, y, pageW, inset = 56) {
  const mid = pageW / 2;
  doc.save();
  doc.lineWidth(0.8).strokeColor(GOLD).strokeOpacity(0.7);
  doc.moveTo(inset, y).lineTo(mid - 14, y).stroke();
  doc.moveTo(mid + 14, y).lineTo(pageW - inset, y).stroke();
  doc.restore();
  drawGoldDiamond(doc, mid, y, 3.4);
}

function drawWifiMark(doc, cx, cy, s = 1) {
  doc.save();
  doc.lineWidth(1.5 * s).strokeColor(CANAL).lineCap('round');
  const baseY = cy + 6 * s;
  for (const r of [5, 9, 13]) {
    doc
      .moveTo(cx - r * s * 0.72, baseY - r * s * 0.35)
      .bezierCurveTo(
        cx - r * s * 0.35,
        baseY - r * s,
        cx + r * s * 0.35,
        baseY - r * s,
        cx + r * s * 0.72,
        baseY - r * s * 0.35,
      )
      .stroke();
  }
  doc.circle(cx, baseY + 1.2 * s, 1.4 * s).fillColor(CANAL).fill();
  doc.restore();
}

function drawKeyMark(doc, cx, cy, s = 1) {
  doc.save();
  doc.lineWidth(1.5 * s).strokeColor(CANAL).lineCap('round').lineJoin('round');
  doc.circle(cx - 2 * s, cy - 3 * s, 4.2 * s).stroke();
  doc
    .moveTo(cx + 1.5 * s, cy)
    .lineTo(cx + 11 * s, cy + 4 * s)
    .lineTo(cx + 11 * s, cy + 8 * s)
    .lineTo(cx + 7 * s, cy + 8 * s)
    .stroke();
  doc.restore();
}

function drawForkMark(doc, cx, cy, s = 1) {
  doc.save();
  doc.lineWidth(1.5 * s).strokeColor(CANAL).lineCap('round').lineJoin('round');
  doc
    .moveTo(cx - 8 * s, cy + 8 * s)
    .lineTo(cx + 8 * s, cy + 8 * s)
    .stroke();
  doc
    .moveTo(cx - 6 * s, cy + 8 * s)
    .bezierCurveTo(cx - 6 * s, cy - 4 * s, cx + 6 * s, cy - 4 * s, cx + 6 * s, cy + 8 * s)
    .stroke();
  doc.circle(cx, cy - 5 * s, 1.5 * s).fillColor(GOLD).fill();
  doc.restore();
}

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 1000,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: CANAL, light: WHITE },
  });
}

/**
 * Hotel Canal — A4 reception poster (print).
 * Full-bleed Venice photo · dark canal veil · floating QR ticket · −10% dining cue.
 */
export async function buildPosterPdfBuffer({
  hotelName = 'Hotel Canal',
  address = 'Santa Croce 553, 30135 Venezia',
} = {}) {
  const qrPng = await buildCheckinQrPng();
  const bgPath = path.join(rootDir, 'public', 'venice-bg-poster.jpg');
  const hasBg = fs.existsSync(bgPath);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${hotelName} — Reception Check-in Poster`,
        Author: hotelName,
        Subject: 'Scan to check in · Wi-Fi · Door codes · −10% dining',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const side = 42;

    // --- Atmosphere ---
    if (hasBg) {
      doc.image(bgPath, 0, 0, { width: pageW, height: pageH });
    } else {
      doc.rect(0, 0, pageW, pageH).fill(CANAL_DEEP);
    }

    // Top mist
    doc.save();
    doc
      .rect(0, 0, pageW, pageH * 0.42)
      .fillOpacity(0.42)
      .fill(CANAL_DEEP);
    doc.restore();

    // Bottom stage (readable content plane)
    doc.save();
    const stageY = pageH * 0.28;
    doc
      .rect(0, stageY, pageW, pageH - stageY)
      .fillOpacity(0.88)
      .fill(CANAL_DEEP);
    doc.restore();

    // Soft top edge of stage
    doc.save();
    doc
      .rect(0, stageY - 28, pageW, 56)
      .fillOpacity(0.55)
      .fill(CANAL_DEEP);
    doc.restore();

    // Gold crown line
    doc.rect(0, 0, pageW, 4).fill(GOLD);
    doc.rect(0, 4, pageW, 1.5).fill(CANAL);

    // --- Brand ---
    let y = 48;
    drawCentered(doc, String(hotelName).toUpperCase(), y, {
      font: 'Times-Bold',
      size: 36,
      color: WHITE,
    });
    y += 42;
    drawCentered(doc, 'V E N I C E', y, {
      font: 'Helvetica-Bold',
      size: 11,
      color: GOLD,
    });
    y += 16;
    drawCentered(doc, address, y, {
      font: 'Helvetica',
      size: 9,
      color: MUTED,
    });
    y += 22;
    drawOrnament(doc, y, pageW, 70);

    // Giant ghost type behind QR
    doc.save();
    doc.fillOpacity(0.07);
    doc
      .font('Times-Bold')
      .fontSize(78)
      .fillColor(WHITE)
      .text('SCAN', 0, stageY + 18, { width: pageW, align: 'center' });
    doc.restore();

    // --- Headline ---
    y = stageY + 36;
    drawCentered(doc, 'Fast Digital Check-in', y, {
      font: 'Helvetica-Bold',
      size: 20,
      color: WHITE,
    });
    y += 26;
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#D7E4E8')
      .text(
        'Scan · register your room · get Wi‑Fi, door codes & a −10% dining gift.',
        side + 18,
        y,
        { width: pageW - side * 2 - 36, align: 'center', lineGap: 3 },
      );

    // --- QR ticket ---
    const qrSize = 210;
    const pad = 18;
    const ticketW = qrSize + pad * 2;
    const ticketH = qrSize + pad * 2 + 34;
    const ticketX = (pageW - ticketW) / 2;
    const ticketY = y + 34;

    // Shadow
    doc.save();
    doc
      .roundedRect(ticketX + 4, ticketY + 6, ticketW, ticketH, 22)
      .fillOpacity(0.35)
      .fill('#000000');
    doc.restore();

    // Cream ticket
    doc.roundedRect(ticketX, ticketY, ticketW, ticketH, 22).fill(CREAM);

    // Gold rim
    doc
      .roundedRect(ticketX, ticketY, ticketW, ticketH, 22)
      .lineWidth(2.2)
      .strokeColor(GOLD)
      .stroke();

    // Inner hairline
    doc
      .roundedRect(ticketX + 8, ticketY + 8, ticketW - 16, ticketH - 16, 16)
      .lineWidth(0.7)
      .strokeColor('#C9B896')
      .stroke();

    const qrX = ticketX + pad;
    const qrY = ticketY + pad;
    doc.save();
    doc.roundedRect(qrX, qrY, qrSize, qrSize, 14).clip();
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
    doc.restore();

    drawGoldDiamond(doc, ticketX + ticketW / 2, ticketY, 3.2);
    drawGoldDiamond(doc, ticketX + ticketW / 2, ticketY + ticketH, 3.2);

    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(CANAL)
      .text('SCAN WITH YOUR PHONE CAMERA', ticketX, qrY + qrSize + 10, {
        width: ticketW,
        align: 'center',
      });

    // −10% floating chip
    const chipW = 78;
    const chipH = 34;
    const chipX = ticketX + ticketW - chipW / 2 - 8;
    const chipY = ticketY - chipH / 2 + 6;
    doc.save();
    doc.roundedRect(chipX, chipY, chipW, chipH, 17).fill(GOLD);
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(CANAL_DEEP)
      .text('−10%', chipX, chipY + 9, { width: chipW, align: 'center' });
    doc.restore();

    // --- Benefits ---
    const benefitsY = ticketY + ticketH + 28;
    const cols = [
      { draw: drawKeyMark, title: 'Door codes', line: 'Night access\nfor your stay' },
      { draw: drawWifiMark, title: 'Wi‑Fi', line: 'Network &\npassword instantly' },
      { draw: drawForkMark, title: 'Dining −10%', line: 'Trattoria\nalla Terrazza' },
    ];
    const gridW = pageW - side * 2;
    const colW = gridW / 3;

    cols.forEach((col, i) => {
      const left = side + i * colW;
      const cx = left + colW / 2;
      // soft pill
      doc.save();
      doc
        .roundedRect(left + 8, benefitsY - 4, colW - 16, 78, 14)
        .fillOpacity(0.18)
        .fill(WHITE);
      doc.restore();
      col.draw(doc, cx, benefitsY + 14, 1.2);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(WHITE)
        .text(col.title, left + 8, benefitsY + 30, {
          width: colW - 16,
          align: 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(MUTED)
        .text(col.line, left + 10, benefitsY + 46, {
          width: colW - 20,
          align: 'center',
          lineGap: 1.2,
        });
    });

    // --- Footer ---
    const footY = pageH - 54;
    drawOrnament(doc, footY, pageW, 64);
    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        'Private & secure · GDPR · guest data deleted automatically after 24 hours',
        side,
        footY + 12,
        { width: pageW - side * 2, align: 'center' },
      );
    drawCentered(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 28, {
      font: 'Helvetica-Bold',
      size: 8,
      color: GOLD,
    });

    doc.end();
  });
}

export function buildPosterEmailHtml({ hotelName, pdfKb }) {
  const brand = String(hotelName || 'Hotel Canal');
  const C = '#124453';
  const BRASS = '#D4AF6A';
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
    .meta{font-family:${SANS};font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#6E868F !important;margin:18px 0 0;}
  `,
})}
</head>
<body ${emailLightBodyAttrs()}>
<div class="card force-white" bgcolor="${EMAIL_FORCE_WHITE}" style="background-color:${EMAIL_FORCE_WHITE} !important;">
<div class="eyebrow">Reception · Print poster</div>
<h1>${brand}</h1>
<p>Your new A4 <strong style="color:${C} !important;">reception poster</strong> is attached — Venice photo, floating QR ticket, dining −10% cue.</p>
<p>Print at <strong style="font-style:italic;color:${C} !important;">100% / actual size</strong> on matte 200–240 g. Ideal in frosted plexiglass at the desk.</p>
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
    subject: `${hotelName} — Reception Check-in Poster A4`,
    text: [
      `${hotelName} — Reception Check-in Poster A4`,
      ``,
      `PDF attached. Print at 100% / actual size on A4 matte.`,
      `Check-in URL: ${checkinPublicUrl()}`,
    ].join('\n'),
    html: buildPosterEmailHtml({ hotelName, pdfKb }),
    attachments: [
      {
        filename: 'Hotel_Canal_Poster_Supremo.pdf',
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
