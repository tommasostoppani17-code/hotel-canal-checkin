import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import { emailLightModeHead, emailLightBodyAttrs, EMAIL_FORCE_WHITE } from './email-light.js';
import {
  EMAIL_BODY as BODY,
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

/* Step 1 brand: ottanio istituzionale + testo lavagna */
const CANAL = '#164E5B';
const TEXT_DARK = '#122226';
const MUTED = '#5C7A82';
const FOOT = '#6E868F';
const RULE = '#D8E2E6';

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 900,
    margin: 1,
    errorCorrectionLevel: 'H',
    color: { dark: CANAL, light: '#FFFFFF' },
  });
}

function drawCenteredText(doc, text, y, { font, size, color } = {}) {
  doc
    .font(font)
    .fontSize(size)
    .fillColor(color)
    .text(text, 0, y, { width: doc.page.width, align: 'center' });
}

/**
 * True A4 PDF poster (210×297mm) — Premium reception sign.
 * Print on white matte 200g; place in frosted/satin plexiglass for the glass-card look.
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
        Title: `${hotelName} — Premium Reception Poster A4`,
        Author: hotelName,
        Subject: 'Fast Digital Check-in · Door codes · Wi-Fi · Dining privilege',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width; // 595.28
    const pageH = doc.page.height; // 841.89
    const side = 71; // ~25mm
    const radiusIos = 20; // mirrors --radius-ios on Step 1 inputs

    // Total-white — backdrop sync: frosted plexiglass supplies the lagoon glass look
    doc.rect(0, 0, pageW, pageH).fill('#FFFFFF');

    // Monumental brand (Cinzel → Times-Bold print fallback)
    drawCenteredText(doc, String(hotelName).toUpperCase(), 72, {
      font: 'Times-Bold',
      size: 34,
      color: CANAL,
    });
    drawCenteredText(doc, 'V E N I C E   E X P E R I E N C E', 116, {
      font: 'Times-Bold',
      size: 10,
      color: MUTED,
    });
    drawCenteredText(doc, address, 136, {
      font: 'Helvetica',
      size: 9,
      color: MUTED,
    });

    doc
      .moveTo(side + 48, 162)
      .lineTo(pageW - side - 48, 162)
      .lineWidth(0.7)
      .strokeColor(RULE)
      .stroke();

    drawCenteredText(doc, 'Fast Digital Check-in', 186, {
      font: 'Helvetica-Bold',
      size: 18,
      color: TEXT_DARK,
    });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(TEXT_DARK)
      .text(
        'Scan the QR code with your smartphone to complete room registration and unlock front-desk services instantly.',
        side + 22,
        218,
        { width: pageW - side * 2 - 44, align: 'center', lineGap: 4 },
      );

    // QR plate — roundedRect radius = --radius-ios (20)
    const qrSize = 216;
    const platePad = 20;
    const plate = qrSize + platePad * 2;
    const plateX = (pageW - plate) / 2;
    const plateY = 278;

    doc
      .roundedRect(plateX, plateY, plate, plate, radiusIos)
      .lineWidth(1.25)
      .strokeColor(CANAL)
      .stroke();

    doc.image(qrPng, plateX + platePad, plateY + platePad, {
      width: qrSize,
      height: qrSize,
    });

    drawCenteredText(doc, 'SCAN WITH YOUR SMARTPHONE', plateY + plate + 18, {
      font: 'Helvetica-Bold',
      size: 9,
      color: CANAL,
    });

    // Three front-desk benefits
    const benefits = [
      { title: 'DOOR CODES', line: 'Instant access codes for your stay' },
      { title: 'HIGH-SPEED WI-FI', line: 'Network credentials right after check-in' },
      { title: '10% DINING PRIVILEGE', line: 'Exclusive voucher at Trattoria alla Terrazza' },
    ];
    const colW = (pageW - side * 2) / 3;
    const benY = plateY + plate + 48;

    benefits.forEach((b, i) => {
      const x = side + i * colW;
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(CANAL)
        .text(b.title, x + 4, benY, { width: colW - 8, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(TEXT_DARK)
        .text(b.line, x + 6, benY + 16, {
          width: colW - 12,
          align: 'center',
          lineGap: 2,
        });
    });

    // GDPR seal
    const footY = pageH - 88;
    doc
      .moveTo(side, footY)
      .lineTo(pageW - side, footY)
      .lineWidth(0.6)
      .strokeColor(RULE)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(FOOT)
      .text(
        'GDPR compliant & secure. Encrypted data pipeline with automatic 24h retention purge.',
        side,
        footY + 14,
        { width: pageW - side * 2, align: 'center' },
      );
    drawCenteredText(doc, `CANAL S.r.l. — ${address}`, footY + 32, {
      font: 'Helvetica',
      size: 8,
      color: FOOT,
    });
    drawCenteredText(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 50, {
      font: 'Helvetica',
      size: 7.5,
      color: MUTED,
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
<p>Your A4 reception poster is attached as a PDF (Fast Digital Check-in · Welcome Discount · English).</p>
<p>Open the attachment and print at <strong style="font-style:italic;color:${C} !important;">100% / actual size</strong> on A4 matte paper (160–200 g). Place in a glass frame or plexiglass stand at the desk.</p>
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
