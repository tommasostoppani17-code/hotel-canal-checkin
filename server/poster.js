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

/** Ornamental diamond (hotel stationery) */
function drawDiamond(doc, cx, cy, size = 3.5, color = CANAL) {
  doc.save();
  doc
    .moveTo(cx, cy - size)
    .lineTo(cx + size, cy)
    .lineTo(cx, cy + size)
    .lineTo(cx - size, cy)
    .closePath()
    .fillColor(color)
    .fill();
  doc.restore();
}

/** Elegant rule with centered diamond */
function drawOrnamentRule(doc, y, pageW, side = 72) {
  const mid = pageW / 2;
  const gap = 14;
  doc.save();
  doc
    .moveTo(side, y)
    .lineTo(mid - gap, y)
    .lineWidth(0.7)
    .strokeColor(RULE)
    .stroke();
  doc
    .moveTo(mid + gap, y)
    .lineTo(pageW - side, y)
    .stroke();
  drawDiamond(doc, mid, y, 3.2, CANAL);
  doc.restore();
}

/** Soft corner flourishes — page frame without a heavy “box” */
function drawCornerFlourishes(doc, pageW, pageH, inset = 36) {
  const len = 22;
  doc.save();
  doc.lineWidth(0.9).strokeColor('#A8BDC6').lineCap('square');
  const corners = [
    [inset, inset, 1, 1],
    [pageW - inset, inset, -1, 1],
    [inset, pageH - inset, 1, -1],
    [pageW - inset, pageH - inset, -1, -1],
  ];
  for (const [x, y, dx, dy] of corners) {
    doc
      .moveTo(x, y + dy * len)
      .lineTo(x, y)
      .lineTo(x + dx * len, y)
      .stroke();
  }
  doc.restore();
}

/** Thin petroleum top band */
function drawTopAccent(doc, pageW) {
  doc.rect(0, 0, pageW, 6).fill(CANAL);
}

/**
 * Clean reception A4 — elegant stationery, rounded QR, balanced layout.
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
    const side = 68;

    // Quiet paper
    doc.rect(0, 0, pageW, pageH).fill(PAPER);
    drawTopAccent(doc, pageW);
    drawCornerFlourishes(doc, pageW, pageH, 34);

    // --- Header ---
    drawGondolaMark(doc, pageW / 2, 58, 1.15);

    let y = 88;
    drawCentered(doc, String(hotelName).toUpperCase(), y, {
      font: 'Times-Bold',
      size: 32,
      color: CANAL,
    });
    y += 38;
    drawCentered(doc, 'V E N I C E   E X P E R I E N C E', y, {
      font: 'Times-Bold',
      size: 9.5,
      color: MUTED,
    });
    y += 18;
    drawCentered(doc, address, y, {
      font: 'Helvetica',
      size: 8.5,
      color: MUTED,
    });
    y += 26;
    drawOrnamentRule(doc, y, pageW, side + 8);
    y += 26;

    // --- Claim ---
    drawCentered(doc, 'Fast Digital Check-in', y, {
      font: 'Helvetica-Bold',
      size: 17,
      color: TEXT,
    });
    y += 24;
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(TEXT)
      .text(
        'Scan the code to register your room safely and receive Wi‑Fi, door access, and your dining privilege.',
        side + 28,
        y,
        { width: pageW - side * 2 - 56, align: 'center', lineGap: 3 },
      );
    y += 42;

    // --- QR framed ---
    const qrSize = 200;
    const framePad = 18;
    const frame = qrSize + framePad * 2;
    const frameX = (pageW - frame) / 2;
    const frameY = y;
    const qrX = frameX + framePad;
    const qrY = frameY + framePad;

    // Soft shadow under QR plate
    doc.save();
    doc
      .roundedRect(frameX + 2, frameY + 3, frame, frame, RADIUS_IOS)
      .fillColor('#000000')
      .fillOpacity(0.06)
      .fill();
    doc.restore();

    doc
      .roundedRect(frameX, frameY, frame, frame, RADIUS_IOS)
      .fillColor('#FFFFFF')
      .fill();
    doc
      .roundedRect(frameX, frameY, frame, frame, RADIUS_IOS)
      .lineWidth(1.55)
      .strokeColor(CANAL)
      .stroke();
    doc
      .roundedRect(frameX + 5, frameY + 5, frame - 10, frame - 10, RADIUS_IOS - 4)
      .lineWidth(0.55)
      .strokeColor(RULE)
      .stroke();

    doc.save();
    doc.roundedRect(qrX, qrY, qrSize, qrSize, RADIUS_IOS - 6).clip();
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
    doc.restore();

    // Tiny diamonds on QR frame mid-sides (jewelry detail)
    drawDiamond(doc, frameX + frame / 2, frameY, 2.4, CANAL);
    drawDiamond(doc, frameX + frame / 2, frameY + frame, 2.4, CANAL);
    drawDiamond(doc, frameX, frameY + frame / 2, 2.4, CANAL);
    drawDiamond(doc, frameX + frame, frameY + frame / 2, 2.4, CANAL);

    y = frameY + frame + 14;
    drawCentered(doc, 'SCAN WITH YOUR SMARTPHONE', y, {
      font: 'Helvetica-Bold',
      size: 8,
      color: CANAL,
    });
    const scanBottom = y + 18;

    // --- Footer anchor ---
    const footY = pageH - 78;
    drawOrnamentRule(doc, footY, pageW, side + 8);
    doc
      .font('Helvetica')
      .fontSize(7.3)
      .fillColor(MUTED)
      .text(
        'Private & secure · GDPR compliant · Data deleted automatically after 24 hours',
        side,
        footY + 14,
        { width: pageW - side * 2, align: 'center' },
      );
    drawCentered(doc, `CANAL S.r.l. — ${address}`, footY + 30, {
      font: 'Helvetica',
      size: 7.3,
      color: MUTED,
    });
    drawCentered(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 46, {
      font: 'Helvetica',
      size: 7,
      color: CANAL,
    });

    // --- Services: evenly between QR caption and footer (no dead air) ---
    const servicesBlockH = 78;
    const maxServicesY = footY - 24 - servicesBlockH;
    const idealServicesY = scanBottom + 28;
    const servicesY = Math.min(idealServicesY, maxServicesY);
    drawOrnamentRule(doc, servicesY - 16, pageW, side + 24);

    const cols = [
      {
        draw: drawDoorIcon,
        title: 'Door codes',
        line: 'Access codes\nfor your stay',
      },
      {
        draw: drawWifiIcon,
        title: 'Wi‑Fi',
        line: 'Network name &\npassword after check-in',
      },
      {
        draw: drawDiningIcon,
        title: '10% dining',
        line: 'Voucher at Trattoria\nalla Terrazza',
      },
    ];
    const colW = (pageW - side * 2) / 3;
    cols.forEach((col, i) => {
      const cx = side + i * colW + colW / 2;
      const iconX = cx - 10;
      col.draw(doc, iconX, servicesY, 1.1);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(CANAL)
        .text(col.title, side + i * colW + 6, servicesY + 26, {
          width: colW - 12,
          align: 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(8.2)
        .fillColor(MUTED)
        .text(col.line, side + i * colW + 8, servicesY + 40, {
          width: colW - 16,
          align: 'center',
          lineGap: 1.5,
        });
      if (i < 2) {
        const vx = side + (i + 1) * colW;
        doc
          .moveTo(vx, servicesY + 4)
          .lineTo(vx, servicesY + 68)
          .lineWidth(0.5)
          .strokeColor(RULE)
          .stroke();
      }
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
