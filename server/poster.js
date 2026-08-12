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

const CANAL = '#164E5B';
const TEXT = '#1A2B32';
const MUTED = '#5C7A82';
const RULE = '#D5E0E5';
const PAPER = '#F7FAFC';
const RADIUS_IOS = 20;

function drawCentered(doc, text, y, { font, size, color, width, x = 0 } = {}) {
  const w = width ?? doc.page.width;
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, {
    width: w,
    align: 'center',
  });
}

/** Line-icon: gondola (brand mark) */
function drawGondolaMark(doc, cx, cy, scale = 1) {
  doc.save();
  doc.lineWidth(1.4 * scale).strokeColor(CANAL).lineCap('round').lineJoin('round');
  // hull
  doc
    .moveTo(cx - 22 * scale, cy + 4 * scale)
    .bezierCurveTo(
      cx - 10 * scale,
      cy + 14 * scale,
      cx + 10 * scale,
      cy + 14 * scale,
      cx + 22 * scale,
      cy + 4 * scale,
    )
    .stroke();
  // ferro
  doc
    .moveTo(cx - 20 * scale, cy + 3 * scale)
    .lineTo(cx - 24 * scale, cy - 10 * scale)
    .lineTo(cx - 18 * scale, cy - 4 * scale)
    .stroke();
  // water ripples
  doc.lineWidth(1 * scale).strokeColor(MUTED);
  doc
    .moveTo(cx - 14 * scale, cy + 18 * scale)
    .bezierCurveTo(
      cx - 4 * scale,
      cy + 22 * scale,
      cx + 4 * scale,
      cy + 14 * scale,
      cx + 14 * scale,
      cy + 18 * scale,
    )
    .stroke();
  doc.restore();
}

/** Line-icon: door / key */
function drawDoorIcon(doc, x, y, s = 1) {
  doc.save();
  doc.lineWidth(1.35 * s).strokeColor(CANAL).lineCap('round').lineJoin('round');
  doc.roundedRect(x, y, 14 * s, 18 * s, 2 * s).stroke();
  doc
    .moveTo(x + 14 * s, y + 9 * s)
    .lineTo(x + 18 * s, y + 9 * s)
    .stroke();
  doc
    .circle(x + 11 * s, y + 9 * s, 1.2 * s)
    .fillColor(CANAL)
    .fill();
  doc.restore();
}

/** Line-icon: wifi arcs */
function drawWifiIcon(doc, x, y, s = 1) {
  doc.save();
  doc.lineWidth(1.35 * s).strokeColor(CANAL).lineCap('round');
  const cx = x + 10 * s;
  const cy = y + 16 * s;
  for (const r of [5, 9, 13]) {
    doc
      .moveTo(cx - r * s * 0.7, cy - r * s * 0.35)
      .bezierCurveTo(
        cx - r * s * 0.35,
        cy - r * s,
        cx + r * s * 0.35,
        cy - r * s,
        cx + r * s * 0.7,
        cy - r * s * 0.35,
      )
      .stroke();
  }
  doc.circle(cx, cy, 1.4 * s).fillColor(CANAL).fill();
  doc.restore();
}

/** Line-icon: dining cloche */
function drawDiningIcon(doc, x, y, s = 1) {
  doc.save();
  doc.lineWidth(1.35 * s).strokeColor(CANAL).lineCap('round').lineJoin('round');
  doc
    .moveTo(x, y + 14 * s)
    .lineTo(x + 20 * s, y + 14 * s)
    .stroke();
  doc
    .moveTo(x + 2 * s, y + 14 * s)
    .bezierCurveTo(
      x + 2 * s,
      y + 2 * s,
      x + 18 * s,
      y + 2 * s,
      x + 18 * s,
      y + 14 * s,
    )
    .stroke();
  doc
    .circle(x + 10 * s, y + 2 * s, 1.5 * s)
    .fillColor(CANAL)
    .fill();
  doc.restore();
}

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 900,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: { dark: CANAL, light: '#FFFFFF' },
  });
}

/**
 * Clean reception A4 — no photo backdrop, no floating card.
 * Elegant paper, rounded QR in petroleum frame, line icons.
 */
export async function buildPosterPdfBuffer({
  hotelName = 'Hotel Canal',
  address = 'Santa Croce 553, 30135 Venezia',
} = {}) {
  const qrPng = await buildCheckinQrPng();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${hotelName} — Reception Check-in Sign`,
        Author: hotelName,
        Subject: 'Fast Digital Check-in',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const side = 64;

    // Quiet paper — reception print (no floating card, no photo backdrop)
    doc.rect(0, 0, pageW, pageH).fill(PAPER);

    // Brand mark
    drawGondolaMark(doc, pageW / 2, 70, 1.2);

    let y = 102;
    drawCentered(doc, String(hotelName).toUpperCase(), y, {
      font: 'Times-Bold',
      size: 34,
      color: CANAL,
    });
    y += 42;
    drawCentered(doc, 'V E N I C E   E X P E R I E N C E', y, {
      font: 'Times-Bold',
      size: 10,
      color: MUTED,
    });
    y += 22;
    drawCentered(doc, address, y, {
      font: 'Helvetica',
      size: 9,
      color: MUTED,
    });
    y += 28;

    doc
      .moveTo(side + 48, y)
      .lineTo(pageW - side - 48, y)
      .lineWidth(0.7)
      .strokeColor(RULE)
      .stroke();
    y += 28;

    drawCentered(doc, 'Fast Digital Check-in', y, {
      font: 'Helvetica-Bold',
      size: 18,
      color: TEXT,
    });
    y += 28;

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(TEXT)
      .text(
        'Scan the code to register your room safely and receive Wi‑Fi, door access, and your dining privilege.',
        side + 20,
        y,
        { width: pageW - side * 2 - 40, align: 'center', lineGap: 4 },
      );
    y += 44;

    // QR — rounded square frame (--radius-ios) + clipped rounded QR
    const qrSize = 228;
    const framePad = 20;
    const frame = qrSize + framePad * 2;
    const frameX = (pageW - frame) / 2;
    const frameY = y;
    const qrX = frameX + framePad;
    const qrY = frameY + framePad;

    doc
      .roundedRect(frameX, frameY, frame, frame, RADIUS_IOS)
      .fillColor('#FFFFFF')
      .fill();

    doc
      .roundedRect(frameX, frameY, frame, frame, RADIUS_IOS)
      .lineWidth(1.7)
      .strokeColor(CANAL)
      .stroke();

    doc
      .roundedRect(
        frameX + 5,
        frameY + 5,
        frame - 10,
        frame - 10,
        RADIUS_IOS - 4,
      )
      .lineWidth(0.6)
      .strokeColor(RULE)
      .stroke();

    // Clip QR to rounded rect so corners match the frame
    doc.save();
    doc
      .roundedRect(qrX, qrY, qrSize, qrSize, RADIUS_IOS - 6)
      .clip();
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
    doc.restore();

    y = frameY + frame + 14;
    drawCentered(doc, 'SCAN WITH YOUR SMARTPHONE', y, {
      font: 'Helvetica-Bold',
      size: 8.5,
      color: CANAL,
    });
    y += 32;

    const rows = [
      {
        draw: drawDoorIcon,
        title: 'Door codes',
        line: 'Access codes for your stay, delivered instantly',
      },
      {
        draw: drawWifiIcon,
        title: 'Wi‑Fi',
        line: 'Network name and password right after check-in',
      },
      {
        draw: drawDiningIcon,
        title: '10% dining privilege',
        line: 'Welcome voucher for Trattoria alla Terrazza',
      },
    ];

    const rowW = pageW - side * 2;
    const rowX = side;
    rows.forEach((row, i) => {
      const ry = y + i * 40;
      if (i > 0) {
        doc
          .moveTo(rowX + 40, ry - 8)
          .lineTo(rowX + rowW - 40, ry - 8)
          .lineWidth(0.5)
          .strokeColor(RULE)
          .stroke();
      }
      row.draw(doc, rowX + 56, ry + 1, 1.05);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(CANAL)
        .text(row.title, rowX + 92, ry + 1, { width: rowW - 120 });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(row.line, rowX + 92, ry + 15, { width: rowW - 120 });
    });

    const footY = pageH - 70;
    doc
      .moveTo(side, footY)
      .lineTo(pageW - side, footY)
      .lineWidth(0.6)
      .strokeColor(RULE)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(7.5)
      .fillColor(MUTED)
      .text(
        'Private & secure · GDPR compliant · Data deleted automatically after 24 hours',
        side,
        footY + 12,
        { width: pageW - side * 2, align: 'center' },
      );
    drawCentered(doc, `CANAL S.r.l. — ${address}`, footY + 28, {
      font: 'Helvetica',
      size: 7.5,
      color: MUTED,
    });
    drawCentered(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 44, {
      font: 'Helvetica',
      size: 7,
      color: CANAL,
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
<p>Your clean A4 reception sign is attached (rounded QR frame · line icons · no photo backdrop).</p>
<p>Print at <strong style="font-style:italic;color:${C} !important;">100% / actual size</strong> on A4 matte 160–200 g.</p>
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
