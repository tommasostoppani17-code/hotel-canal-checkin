import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Resend } from 'resend';

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
const GOLD = '#C5A059';
const MUTED = '#515154';
const FOOT = '#8E8E93';
const RULE = '#1D1D1F';

export async function buildCheckinQrPng() {
  return QRCode.toBuffer(checkinPublicUrl(), {
    type: 'png',
    width: 640,
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
 * True A4 PDF poster (210×297mm) — English, Welcome Discount, vector layout.
 */
export async function buildPosterPdfBuffer({
  hotelName = 'Hotel Canal',
  address = 'Santa Croce 553 · Venice',
} = {}) {
  const qrPng = await buildCheckinQrPng();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${hotelName} — Reception Poster A4`,
        Author: hotelName,
        Subject: 'Fast Check-in & Welcome Discount',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width; // 595.28
    const pageH = doc.page.height; // 841.89
    const side = 72; // ~25mm margins

    // Top canal band
    doc.rect(0, 0, pageW, 14).fill(CANAL);

    // Brand
    drawCenteredText(doc, String(hotelName).toUpperCase(), 88, {
      font: 'Times-Bold',
      size: 34,
      color: CANAL,
    });
    drawCenteredText(doc, String(address).toUpperCase(), 132, {
      font: 'Times-Bold',
      size: 9,
      color: GOLD,
    });

    // Hairline rule
    const ruleY = 168;
    doc
      .moveTo(side, ruleY)
      .lineTo(pageW - side, ruleY)
      .lineWidth(0.8)
      .strokeColor(RULE)
      .stroke();

    // Claim
    drawCenteredText(doc, 'FAST CHECK-IN &', 210, {
      font: 'Times-Bold',
      size: 22,
      color: CANAL,
    });
    drawCenteredText(doc, 'WELCOME DISCOUNT', 238, {
      font: 'Times-Bold',
      size: 22,
      color: CANAL,
    });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(MUTED)
      .text(
        "Scan the code to activate your room's digital services instantly and unlock a 10% welcome discount for Trattoria alla Terrazza.",
        side + 24,
        280,
        { width: pageW - side * 2 - 48, align: 'center', lineGap: 4 },
      );

    // QR plate
    const qrSize = 196;
    const platePad = 16;
    const plate = qrSize + platePad * 2;
    const plateX = (pageW - plate) / 2;
    const plateY = 360;

    doc
      .roundedRect(plateX, plateY, plate, plate, 4)
      .lineWidth(1)
      .strokeColor(CANAL)
      .stroke();

    doc.image(qrPng, plateX + platePad, plateY + platePad, {
      width: qrSize,
      height: qrSize,
    });

    drawCenteredText(doc, 'SCAN WITH YOUR SMARTPHONE', plateY + plate + 22, {
      font: 'Helvetica-Bold',
      size: 9.5,
      color: CANAL,
    });

    // Language chips
    const langs = ['IT', 'EN', 'FR', 'DE', 'ES'];
    const chipW = 36;
    const chipH = 18;
    const gap = 8;
    const rowW = langs.length * chipW + (langs.length - 1) * gap;
    let chipX = (pageW - rowW) / 2;
    const chipY = plateY + plate + 52;

    for (const lang of langs) {
      doc
        .roundedRect(chipX, chipY, chipW, chipH, 2)
        .fillColor('#EEF3F4')
        .fill();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(CANAL)
        .text(lang, chipX, chipY + 5, { width: chipW, align: 'center' });
      chipX += chipW + gap;
    }

    // Footer
    const footY = pageH - 78;
    doc
      .moveTo(side, footY)
      .lineTo(pageW - side, footY)
      .lineWidth(0.6)
      .strokeColor('#E5E5EA')
      .stroke();

    drawCenteredText(doc, 'EXCLUSIVE PARTNER · TRATTORIA ALLA TERRAZZA, VENICE', footY + 16, {
      font: 'Helvetica',
      size: 8.5,
      color: FOOT,
    });
    drawCenteredText(doc, '10% WELCOME DISCOUNT FOR REGISTERED GUESTS', footY + 34, {
      font: 'Helvetica-Bold',
      size: 9,
      color: CANAL,
    });

    doc.end();
  });
}

function buildPosterEmailHtml({ hotelName, pdfKb }) {
  const brand = String(hotelName || 'Hotel Canal');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light">
<style>body{font-family:-apple-system,BlinkMacSystemFont,Helvetica,Arial,sans-serif;background:#fff;color:#1D1D1F;margin:0;padding:32px 20px;}
.card{max-width:480px;margin:0 auto;border:1px solid #E5E5EA;border-top:5px solid #124453;padding:28px 24px;}
h1{font-family:Georgia,serif;font-size:22px;color:#124453;letter-spacing:0.06em;text-transform:uppercase;margin:0 0 10px;}
p{font-size:14px;line-height:1.55;color:#515154;margin:0 0 12px;}
.meta{font-size:12px;color:#8E8E93;}</style></head>
<body><div class="card">
<h1>${brand}</h1>
<p>Your A4 reception poster is attached as a PDF (Welcome Discount · English).</p>
<p>Open the attachment and print at <strong>100% / actual size</strong> on A4. No browser scaling.</p>
<p class="meta">File size ~${pdfKb} KB · QR points to ${publicBaseUrl()}/</p>
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
        filename: 'hotel-canal-reception-poster-a4.pdf',
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
