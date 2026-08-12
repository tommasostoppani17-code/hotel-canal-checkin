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

/* Apple Store × Hotel Canal — Supremo print palette */
const CANAL = '#164E5B';
const GOLD = '#C5A059';
const TEXT = '#164E5B';
const MUTED = '#6E868F';
const RULE = '#DCE6EA';
const PAPER = '#FFFFFF';
const CREAM = '#F7FAFB';
const RADIUS_IOS = 20;

function drawCentered(doc, text, y, { font, size, color, width, x = 0 } = {}) {
  const w = width ?? doc.page.width;
  doc.font(font).fontSize(size).fillColor(color).text(text, x, y, {
    width: w,
    align: 'center',
  });
}

/** Abstract gondola mark — pure vector */
function drawGondolaMark(doc, cx, cy, scale = 1) {
  doc.save();
  doc.lineWidth(1.55 * scale).strokeColor(CANAL).lineCap('round').lineJoin('round');
  doc
    .moveTo(cx - 24 * scale, cy + 5 * scale)
    .bezierCurveTo(
      cx - 8 * scale,
      cy + 16 * scale,
      cx + 8 * scale,
      cy + 16 * scale,
      cx + 24 * scale,
      cy + 5 * scale,
    )
    .stroke();
  doc
    .moveTo(cx - 22 * scale, cy + 4 * scale)
    .lineTo(cx - 27 * scale, cy - 12 * scale)
    .lineTo(cx - 19 * scale, cy - 5 * scale)
    .stroke();
  doc.lineWidth(1.1 * scale).strokeColor(GOLD);
  doc
    .moveTo(cx - 16 * scale, cy + 20 * scale)
    .bezierCurveTo(
      cx - 4 * scale,
      cy + 24 * scale,
      cx + 4 * scale,
      cy + 16 * scale,
      cx + 16 * scale,
      cy + 20 * scale,
    )
    .stroke();
  doc.restore();
}

function drawDoorIcon(doc, cx, cy, s = 1) {
  const x = cx - 9 * s;
  const y = cy - 10 * s;
  doc.save();
  doc.lineWidth(1.4 * s).strokeColor(CANAL).lineCap('round').lineJoin('round');
  doc.roundedRect(x, y, 14 * s, 18 * s, 2 * s).stroke();
  doc
    .circle(x + 10.5 * s, y + 9 * s, 1.15 * s)
    .fillColor(CANAL)
    .fill();
  doc.restore();
}

function drawWifiIcon(doc, cx, cy, s = 1) {
  doc.save();
  doc.lineWidth(1.4 * s).strokeColor(CANAL).lineCap('round');
  const baseY = cy + 7 * s;
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
  doc.circle(cx, baseY + 1 * s, 1.35 * s).fillColor(CANAL).fill();
  doc.restore();
}

function drawDiningIcon(doc, cx, cy, s = 1) {
  const x = cx - 10 * s;
  const y = cy - 8 * s;
  doc.save();
  doc.lineWidth(1.4 * s).strokeColor(CANAL).lineCap('round').lineJoin('round');
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
  doc.circle(x + 10 * s, y + 2 * s, 1.45 * s).fillColor(GOLD).fill();
  doc.restore();
}

function drawGoldDiamond(doc, cx, cy, size = 3) {
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

function drawOrnamentRule(doc, y, pageW, side = 78) {
  const mid = pageW / 2;
  const gap = 12;
  doc.save();
  doc.lineWidth(0.7).strokeColor(RULE);
  doc.moveTo(side, y).lineTo(mid - gap, y).stroke();
  doc.moveTo(mid + gap, y).lineTo(pageW - side, y).stroke();
  drawGoldDiamond(doc, mid, y, 3);
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
 * Hotel_Canal_Poster_Supremo — A4 reception print.
 * Cream QR vault + Venetian gold rim + petroleum type + aligned privilege grid.
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
        Title: `${hotelName} — Poster Supremo A4`,
        Author: hotelName,
        Subject: 'Fast Digital Check-in · Reception sign',
      },
    });

    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const pageH = doc.page.height;
    const side = 72;

    // Total-white — frosted plexiglass supplies the lagoon glass look
    doc.rect(0, 0, pageW, pageH).fill(PAPER);

    // Fine gold top hairline (luxury accent, not a heavy band)
    doc.rect(0, 0, pageW, 3).fill(GOLD);
    doc.rect(0, 3, pageW, 1.2).fill(CANAL);

    // Brand mark
    drawGondolaMark(doc, pageW / 2, 56, 1.2);

    let y = 88;
    drawCentered(doc, String(hotelName).toUpperCase(), y, {
      font: 'Times-Bold',
      size: 33,
      color: CANAL,
    });
    y += 40;
    drawCentered(doc, 'V E N I C E   E X P E R I E N C E', y, {
      font: 'Times-Bold',
      size: 9.5,
      color: GOLD,
    });
    y += 18;
    drawCentered(doc, address, y, {
      font: 'Helvetica',
      size: 8.5,
      color: MUTED,
    });
    y += 26;
    drawOrnamentRule(doc, y, pageW, side);
    y += 26;

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
        side + 24,
        y,
        { width: pageW - side * 2 - 48, align: 'center', lineGap: 3 },
      );
    y += 40;

    // --- QR vault: cream plate + gold rim + iOS radius ---
    const qrSize = 204;
    const framePad = 20;
    const frame = qrSize + framePad * 2;
    const frameX = (pageW - frame) / 2;
    const frameY = y;
    const qrX = frameX + framePad;
    const qrY = frameY + framePad;

    // Soft shadow
    doc.save();
    doc
      .roundedRect(frameX + 2.5, frameY + 3.5, frame, frame, RADIUS_IOS)
      .fillColor('#164E5B')
      .fillOpacity(0.07)
      .fill();
    doc.restore();

    // Cream vault
    doc
      .roundedRect(frameX, frameY, frame, frame, RADIUS_IOS)
      .fillColor(CREAM)
      .fill();

    // Venetian gold rim
    doc
      .roundedRect(frameX, frameY, frame, frame, RADIUS_IOS)
      .lineWidth(1.8)
      .strokeColor(GOLD)
      .stroke();

    // Inner petroleum hairline
    doc
      .roundedRect(frameX + 6, frameY + 6, frame - 12, frame - 12, RADIUS_IOS - 5)
      .lineWidth(0.65)
      .strokeColor('#8FA8B2')
      .stroke();

    // Rounded QR clip
    doc.save();
    doc.roundedRect(qrX, qrY, qrSize, qrSize, RADIUS_IOS - 6).clip();
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });
    doc.restore();

    // Gold diamond jewelry on vault midpoints
    drawGoldDiamond(doc, frameX + frame / 2, frameY, 2.6);
    drawGoldDiamond(doc, frameX + frame / 2, frameY + frame, 2.6);
    drawGoldDiamond(doc, frameX, frameY + frame / 2, 2.6);
    drawGoldDiamond(doc, frameX + frame, frameY + frame / 2, 2.6);

    y = frameY + frame + 14;
    drawCentered(doc, 'SCAN WITH YOUR SMARTPHONE', y, {
      font: 'Helvetica-Bold',
      size: 8,
      color: CANAL,
    });
    const scanBottom = y + 16;

    // Footer first
    const footY = pageH - 72;
    drawOrnamentRule(doc, footY, pageW, side);
    doc
      .font('Helvetica')
      .fontSize(7.2)
      .fillColor(MUTED)
      .text(
        'Private & secure · GDPR compliant · Data deleted automatically after 24 hours',
        side,
        footY + 12,
        { width: pageW - side * 2, align: 'center' },
      );
    drawCentered(doc, `CANAL S.r.l. — ${address}`, footY + 28, {
      font: 'Helvetica',
      size: 7.2,
      color: MUTED,
    });
    drawCentered(doc, checkinPublicUrl().replace(/\/$/, ''), footY + 44, {
      font: 'Helvetica',
      size: 7,
      color: CANAL,
    });

    // Privilege grid — millimeter-aligned columns
    const blockH = 86;
    const maxY = footY - 20 - blockH;
    const servicesY = Math.min(scanBottom + 22, maxY);
    drawOrnamentRule(doc, servicesY - 14, pageW, side + 16);

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
    const gridLeft = side + 8;
    const gridRight = pageW - side - 8;
    const gridW = gridRight - gridLeft;
    const colW = gridW / 3;

    cols.forEach((col, i) => {
      const colLeft = gridLeft + i * colW;
      const cx = colLeft + colW / 2;
      col.draw(doc, cx, servicesY + 10, 1.15);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(CANAL)
        .text(col.title, colLeft + 8, servicesY + 30, {
          width: colW - 16,
          align: 'center',
        });
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(MUTED)
        .text(col.line, colLeft + 10, servicesY + 44, {
          width: colW - 20,
          align: 'center',
          lineGap: 1.5,
        });
      if (i < 2) {
        const vx = gridLeft + (i + 1) * colW;
        doc
          .moveTo(vx, servicesY + 2)
          .lineTo(vx, servicesY + 74)
          .lineWidth(0.55)
          .strokeColor(RULE)
          .stroke();
      }
    });

    doc.end();
  });
}

export function buildPosterEmailHtml({ hotelName, pdfKb }) {
  const brand = String(hotelName || 'Hotel Canal');
  const C = '#164E5B';
  const BRASS = '#C5A059';
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
<div class="eyebrow">Reception · Poster Supremo</div>
<h1>${brand}</h1>
<p>Your A4 <strong style="color:${C} !important;">Poster Supremo</strong> is attached (cream QR vault · Venetian gold · aligned privilege grid).</p>
<p>Print at <strong style="font-style:italic;color:${C} !important;">100% / actual size</strong> on matte 200–240 g. Best in frosted plexiglass.</p>
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
    subject: `${hotelName} — Poster Supremo A4 (PDF)`,
    text: [
      `${hotelName} — Poster Supremo A4`,
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
