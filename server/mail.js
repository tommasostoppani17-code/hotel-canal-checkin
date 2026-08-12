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
  purgeCheckinsOlderThan24Hours,
  exportAllCheckins,
  exportStaffMonthStats,
} from './db.js';
import {
  isBlockedRecipient,
  assertSendableRecipient,
  sendableRecipientOrEmpty,
} from './recipient-guard.js';

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
  assertSendableRecipient(payload.to, 'report');
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
  if (isBlockedRecipient(reportEmail)) {
    throw new Error(
      `REPORT_EMAIL bloccato (non inviare a info@ / hotelcanal): ${reportEmail}`,
    );
  }
  if (!resendConfigured() && !smtpConfigured()) {
    throw new Error(
      'Email non configurata: imposta RESEND_API_KEY oppure SMTP_HOST/USER/PASS',
    );
  }
}

export async function sendTableBookingAlert(row) {
  // Solo REPORT_EMAIL / TABLE_BOOKING_EMAIL — niente hotel di default
  const rawTo =
    env('TABLE_BOOKING_EMAIL') ||
    env('REPORT_EMAIL') ||
    '';
  const to = sendableRecipientOrEmpty(rawTo);
  if (!to) {
    if (isBlockedRecipient(rawTo)) {
      throw new Error(
        `Destinatario tavolo bloccato (info@ / hotelcanal): ${rawTo}`,
      );
    }
    throw new Error('REPORT_EMAIL / TABLE_BOOKING_EMAIL non configurata');
  }
  if (
    /@(hotelcanal\.|payel)/i.test(to) &&
    env('ALLOW_HOTEL_MAIL', 'false').toLowerCase() !== 'true'
  ) {
    throw new Error(
      'Destinatario hotel/Payel bloccato (ALLOW_HOTEL_MAIL non attivo)',
    );
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

  const baseFrom =
    env('TABLE_BOOKING_FROM') ||
    env('REPORT_FROM') ||
    env('SMTP_FROM', 'Hotel Canal Front Desk <onboarding@resend.dev>');
  // Mittente notifica tavolo = Trattoria (non Front Desk)
  const from = String(baseFrom).replace(
    /^[^<]*(?=<)/,
    'Trattoria alla Terrazza ',
  ).replace(
    /^(?!.*<)(.+)$/,
    'Trattoria alla Terrazza <$1>',
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
  const reportEmailRaw =
    env('REPORT_EMAIL') || 'tommasostoppani17@gmail.com';
  const reportEmail = sendableRecipientOrEmpty(reportEmailRaw);
  if (!reportEmail && isBlockedRecipient(reportEmailRaw)) {
    console.warn(
      `[report] REPORT_EMAIL bloccato, skip email: ${reportEmailRaw}`,
    );
  }
  const rows = getUnreportedCheckins();

  if (!rows.length) {
    let purged = 0;
    try {
      purged = purgeCheckinsOlderThan24Hours();
      if (purged > 0) {
        console.log(
          `[GDPR] Eliminati ${purged} check-in più vecchi di 24 ore (retention)`,
        );
        const { pushCheckinsBackup } = await import('./backup.js');
        if (
          process.env.CHECKIN_BACKUP_GIST_ID &&
          process.env.CHECKIN_BACKUP_GITHUB_TOKEN
        ) {
          await pushCheckinsBackup(
            exportAllCheckins(),
            exportStaffMonthStats(),
          );
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

  // Privacy by design: un attimo dopo l'invio riuscito del CSV → epurazione 24h.
  let purged = 0;
  try {
    purged = purgeCheckinsOlderThan24Hours();
    if (purged > 0) {
      console.log(
        `[GDPR] Post-report: eliminati ${purged} check-in >24h (retention)`,
      );
    }
    const { pushCheckinsBackup } = await import('./backup.js');
    if (
      process.env.CHECKIN_BACKUP_GIST_ID &&
      process.env.CHECKIN_BACKUP_GITHUB_TOKEN
    ) {
      await pushCheckinsBackup(exportAllCheckins(), exportStaffMonthStats());
    }
  } catch (err) {
    console.error('[GDPR] post-report purge/backup failed:', err.message || err);
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

/** True if `date` is the 1st calendar day of the month in Europe/Rome. */
export function isFirstDayOfMonthRome(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    day: '2-digit',
  }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value;
  return Number(day) === 1;
}

/** Previous calendar month in Europe/Rome → { year, month, yearMonth, monthLabel }. */
export function previousMonthRome(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  let year = Number(map.year);
  let month = Number(map.month) - 1;
  if (month < 1) {
    month = 12;
    year -= 1;
  }
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
  // Label IT from a mid-month UTC date in that month
  const labelDate = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
  const monthLabel = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'UTC',
    month: 'long',
  })
    .format(labelDate)
    .toUpperCase();
  return { year, month, yearMonth, monthLabel };
}

/** @deprecated use isFirstDayOfMonthRome — kept for compatibility */
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
  if (!force && !isFirstDayOfMonthRome()) {
    return { sent: false, reason: 'not_month_start' };
  }

  const hotelName = env('HOTEL_NAME', 'Hotel Canal');
  const reportEmailRaw =
    env('REPORT_EMAIL') || 'tommasostoppani17@gmail.com';
  const reportEmail = sendableRecipientOrEmpty(reportEmailRaw);
  if (!reportEmail) {
    if (isBlockedRecipient(reportEmailRaw)) {
      throw new Error(
        `REPORT_EMAIL bloccato (non inviare a info@ / hotelcanal): ${reportEmailRaw}`,
      );
    }
    throw new Error('REPORT_EMAIL non configurata');
  }
  assertEmailReady(reportEmail);

  // Allinea rollup ai check-in ancora in DB (mesi storici restano dal backup).
  try {
    const { mergeStaffMonthStatsFromCheckins } = await import('./db.js');
    mergeStaffMonthStatsFromCheckins();
  } catch (err) {
    console.error('[monthly] merge stats failed:', err.message || err);
  }

  let period = previousMonthRome();
  let { totals, ranking, source } = getMonthlyStaffStats(period.yearMonth);
  let totaleMese = Number(totals?.totale_mese || 0);

  // Force manuale a metà mese: se il mese scorso è vuoto, invia il mese in corso.
  if (!totaleMese && force) {
    const currentYm = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Rome',
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(new Date());
    const map = Object.fromEntries(currentYm.map((p) => [p.type, p.value]));
    const year = Number(map.year);
    const month = Number(map.month);
    const yearMonth = `${year}-${String(month).padStart(2, '0')}`;
    const labelDate = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
    const monthLabel = new Intl.DateTimeFormat('it-IT', {
      timeZone: 'UTC',
      month: 'long',
    })
      .format(labelDate)
      .toUpperCase();
    period = { year, month, yearMonth, monthLabel };
    ({ totals, ranking, source } = getMonthlyStaffStats(period.yearMonth));
    totaleMese = Number(totals?.totale_mese || 0);
  }

  if (!totaleMese) {
    return {
      sent: false,
      reason: 'no_month_data',
      count: 0,
      yearMonth: period.yearMonth,
      empty: true,
    };
  }

  const { subject, text, html, csv } = buildMonthlyStaffEmail({
    hotelName,
    monthLabel: period.monthLabel,
    year: String(period.year),
    totals,
    ranking,
  });

  const filename = `performance_staff_${period.monthLabel.toLowerCase()}_${period.year}.csv`;
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
    yearMonth: period.yearMonth,
    source,
  };
}
