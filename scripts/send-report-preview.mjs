#!/usr/bin/env node
/** Invia email report di prova — MAI all'inbox ufficiale. */
import dotenv from 'dotenv';
import { Resend } from 'resend';
import {
  buildReportEmail,
  buildCsv,
  demoReportPreviewRows,
  formatRomeDate,
} from '../server/report.js';
import { testReportRecipient } from '../server/report-recipients.js';

dotenv.config();

const to = testReportRecipient();
if (!to) {
  console.error('Destinatario test non configurato (REPORT_EMAIL_TEST / REPORT_EMAIL)');
  process.exit(1);
}
const from = String(
  process.env.REPORT_FROM ||
    process.env.SMTP_FROM ||
    'Hotel Canal Front Desk <onboarding@resend.dev>',
).replace(/Welcome to Hotel Canal/i, 'Hotel Canal Front Desk');
const hotelName = String(process.env.HOTEL_NAME || 'Hotel Canal').trim();
const apiKey = String(process.env.RESEND_API_KEY || '').trim();

if (!apiKey) {
  console.error('RESEND_API_KEY mancante in .env');
  process.exit(1);
}

const rows = demoReportPreviewRows();
const dateLabel = formatRomeDate();
const { subject, text, html } = buildReportEmail({
  hotelName,
  count: rows.length,
  dateLabel,
  rows,
});
const csv = buildCsv(rows);
const filename = `report_presenze_hotel_canal_${new Date().toISOString().slice(0, 10)}.csv`;

const resend = new Resend(apiKey);
const { data, error } = await resend.emails.send({
  from,
  to: [to],
  subject: `[TEST] ${subject}`,
  text,
  html,
  attachments: [{ filename, content: Buffer.from(csv, 'utf8') }],
});

if (error) {
  console.error('Errore:', JSON.stringify(error));
  process.exit(1);
}

console.log(`Report inviato a ${to} · ${rows.length} ospiti · id ${data?.id}`);
