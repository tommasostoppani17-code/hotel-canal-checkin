import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import {
  buildCsv,
  buildReportEmail,
  buildMonthlyStaffEmail,
  buildTableBookingEmail,
  formatRomeDate,
} from './report.js';
import {
  getUnreportedCheckins,
  markReported,
  getMonthlyStaffStats,
  purgeCheckinsOlderThanHours,
  exportAllCheckins,
} from './db.js';
import {
  sendDailyWhatsAppReport,
  whatsappConfigured,
} from './whatsapp.js';

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function resendConfigured() {
  return Boolean(env('RESEND_API_KEY').trim());
}

function smtpConfigured() {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'));
}

function getResendClient() {
  if (!resendConfigured()) return null;
  return new Resend(env('RESEND_API_KEY').trim());
}

export function createTransporter() {
  if (!smtpConfigured()) return null;

  return nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port: Number(env('SMTP_PORT', '587')),
    secure: env('SMTP_SECURE', 'false') === 'true',
    auth: {
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
    },
  });
}

async function sendViaResend({ to, subject, text, html, filename, csv, from }) {
  const resend = getResendClient();
  if (!resend) {
    throw new Error('RESEND_API_KEY non configurata');
  }

  const fromAddress =
    from ||
    env(
      'SMTP_FROM',
      'Welcome to Hotel Canal <onboarding@resend.dev>',
    );

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: [to],
    subject,
    text,
    html,
    attachments: [
      {
        filename,
        content: Buffer.from(csv, 'utf8'),
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

  return data;
}

async function sendViaSmtp({ to, subject, text, html, filename, csv, from }) {
  const transporter = createTransporter();
  if (!transporter) {
    throw new Error(
      'Email non configurata: imposta RESEND_API_KEY oppure SMTP_HOST/USER/PASS',
    );
  }

  await transporter.sendMail({
    from: from || env('SMTP_FROM', env('SMTP_USER')),
    to,
    subject,
    text,
    html,
    attachments: [
      {
        filename,
        content: csv,
        contentType: 'text/csv; charset=utf-8',
      },
    ],
  });
}

async function sendReportMail(payload) {
  const reportFrom =
    env('REPORT_FROM') ||
    env('SMTP_FROM', 'Hotel Canal Front Desk <onboarding@resend.dev>').replace(
      /Welcome to Hotel Canal/i,
      'Hotel Canal Front Desk',
    );
  const withFrom = { ...payload, from: reportFrom };
  if (resendConfigured()) {
    return sendViaResend(withFrom);
  }
  return sendViaSmtp(withFrom);
}

function assertEmailReady(reportEmail) {
  if (!reportEmail) {
    throw new Error('REPORT_EMAIL non configurata');
  }
  if (!resendConfigured() && !smtpConfigured()) {
    throw new Error(
      'Email non configurata: imposta RESEND_API_KEY oppure SMTP_HOST/USER/PASS',
    );
  }
}

export async function sendTableBookingAlert(row) {
  const to =
    env('TABLE_BOOKING_EMAIL') ||
    env('REPORT_EMAIL') ||
    'tommasostoppani17@gmail.com';
  if (!to) {
    throw new Error('REPORT_EMAIL / TABLE_BOOKING_EMAIL non configurata');
  }
  if (!resendConfigured() && !smtpConfigured()) {
    throw new Error('Email non configurata');
  }

  const hotelName = env('HOTEL_NAME', 'Hotel Canal');
  const { subject, text, html, timeLabel, room, phone } = buildTableBookingEmail({
    hotelName,
    row,
  });
  const rawTime = String(row.table_booking || '').trim();

  const from =
    env('REPORT_FROM') ||
    env('SMTP_FROM', 'Hotel Canal Front Desk <onboarding@resend.dev>').replace(
      /Welcome to Hotel Canal/i,
      'Hotel Canal Front Desk',
    );

  if (resendConfigured()) {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      text,
      html,
      headers: {
        'X-Entity-Ref-ID': `table-${row.id || Date.now()}-${rawTime}`,
      },
    });
    if (error) {
      throw new Error(
        `Resend API error: ${error.message || JSON.stringify(error)}`.slice(
          0,
          300,
        ),
      );
    }
    return {
      sent: true,
      channel: 'email',
      to,
      time: rawTime,
      timeLabel,
      room,
      phone,
      id: data?.id,
    };
  }

  const transporter = createTransporter();
  await transporter.sendMail({ from, to, subject, text, html });
  return { sent: true, channel: 'email', to, time: rawTime, timeLabel, room, phone };
}

export async function runDailyReport({ force = false } = {}) {
  const hotelName = env('HOTEL_NAME', 'Hotel Canal');
  const reportEmail =
    env('REPORT_EMAIL') || 'tommasostoppani17@gmail.com';
  const rows = getUnreportedCheckins();

  if (!rows.length) {
    let purged = 0;
    try {
      purged = purgeCheckinsOlderThanHours(24);
      if (purged > 0) {
        console.log(
          `[GDPR] Eliminati ${purged} check-in più vecchi di 24 ore (retention)`,
        );
        const { pushCheckinsBackup } = await import('./backup.js');
        if (
          process.env.CHECKIN_BACKUP_GIST_ID &&
          process.env.CHECKIN_BACKUP_GITHUB_TOKEN
        ) {
          await pushCheckinsBackup(exportAllCheckins());
        }
      }
    } catch (err) {
      console.error('[GDPR] purge failed:', err.message || err);
    }
    return {
      sent: false,
      reason: 'no_new_checkins',
      count: 0,
      purged,
    };
  }

  const emailOn =
    Boolean(reportEmail) && (resendConfigured() || smtpConfigured());
  const waOn = whatsappConfigured();

  if (!emailOn && !waOn) {
    throw new Error(
      'Nessun canale report: configura email (REPORT_EMAIL + Resend/SMTP) e/o WhatsApp (TWILIO_* + WHATSAPP_PAYEL + PUBLIC_URL)',
    );
  }

  const dateLabel = formatRomeDate();
  const csv = buildCsv(rows);
  const filename = `report_presenze_hotel_canal_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  const channels = { email: null, whatsapp: null };
  const errors = [];

  if (emailOn) {
    try {
      const { subject, text, html } = buildReportEmail({
        hotelName,
        count: rows.length,
        dateLabel,
        rows,
      });
      const provider = resendConfigured() ? 'resend' : 'smtp';
      await sendReportMail({
        to: reportEmail,
        subject,
        text,
        html,
        filename,
        csv,
      });
      channels.email = { sent: true, to: reportEmail, provider };
    } catch (err) {
      const message = err.message || String(err);
      errors.push(`email: ${message}`);
      channels.email = { sent: false, error: message };
      console.error('[report] Email fallita:', message);
    }
  }

  if (waOn) {
    try {
      channels.whatsapp = await sendDailyWhatsAppReport({
        hotelName,
        dateLabel,
        count: rows.length,
        rows,
        csv,
        filename,
      });
    } catch (err) {
      const message = err.message || String(err);
      errors.push(`whatsapp: ${message}`);
      channels.whatsapp = { sent: false, error: message };
      console.error('[report] WhatsApp fallito:', message);
    }
  }

  const anySent = Boolean(channels.email?.sent || channels.whatsapp?.sent);
  if (!anySent) {
    throw new Error(`Report non inviato. ${errors.join('; ')}`);
  }

  const ids = rows.map((row) => row.id);
  markReported(ids);

  let purged = 0;
  try {
    purged = purgeCheckinsOlderThanHours(24);
    if (purged > 0) {
      console.log(
        `[GDPR] Eliminati ${purged} check-in più vecchi di 24 ore (retention)`,
      );
    }
    const { pushCheckinsBackup } = await import('./backup.js');
    if (
      process.env.CHECKIN_BACKUP_GIST_ID &&
      process.env.CHECKIN_BACKUP_GITHUB_TOKEN
    ) {
      await pushCheckinsBackup(exportAllCheckins());
    }
  } catch (err) {
    console.error('[backup] post-report sync failed:', err.message || err);
  }

  return {
    sent: true,
    count: rows.length,
    to: channels.email?.to || channels.whatsapp?.to || reportEmail,
    email: channels.email,
    whatsapp: channels.whatsapp,
    partialErrors: errors.length ? errors : undefined,
    purged,
    force,
  };
}

/** True if `date` is the last calendar day of its month in Europe/Rome. */
export function isLastDayOfMonthRome(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const y = Number(map.year);
  const m = Number(map.month);
  const d = Number(map.day);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d === lastDay;
}

export async function runMonthlyStaffReport({ force = false } = {}) {
  if (!force && !isLastDayOfMonthRome()) {
    return { sent: false, reason: 'not_month_end' };
  }

  const hotelName = env('HOTEL_NAME', 'Hotel Canal');
  const reportEmail =
    env('REPORT_EMAIL') || 'tommasostoppani17@gmail.com';
  assertEmailReady(reportEmail);

  const { totals, ranking } = getMonthlyStaffStats();
  const totaleMese = Number(totals?.totale_mese || 0);

  if (!totaleMese) {
    return { sent: false, reason: 'no_month_data', count: 0 };
  }

  const now = new Date();
  const monthLabel = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    month: 'long',
  })
    .format(now)
    .toUpperCase();
  const year = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
  }).format(now);

  const { subject, text, html, csv } = buildMonthlyStaffEmail({
    hotelName,
    monthLabel,
    year,
    totals,
    ranking,
  });

  const filename = `performance_staff_${monthLabel.toLowerCase()}_${year}.csv`;
  const provider = resendConfigured() ? 'resend' : 'smtp';

  await sendReportMail({
    to: reportEmail,
    subject,
    text,
    html,
    filename,
    csv,
  });

  return {
    sent: true,
    count: totaleMese,
    staff: ranking.length,
    to: reportEmail,
    provider,
    force,
  };
}
