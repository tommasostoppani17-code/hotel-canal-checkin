#!/usr/bin/env node
/**
 * Trigger report endpoints su Render Cron (UTC).
 * Uso: node scripts/trigger-cron.mjs daily|monthly
 */
const kind = process.argv[2] || 'daily';
const secret = process.env.CRON_SECRET || '';
const host = (process.env.RENDER_EXTERNAL_HOSTNAME || process.env.HOST || '')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '');
const base =
  process.env.PUBLIC_URL ||
  (host ? `https://${host}` : '') ||
  '';

if (!base) {
  console.error('PUBLIC_URL / HOST mancante');
  process.exit(1);
}
if (!secret) {
  console.error('CRON_SECRET mancante');
  process.exit(1);
}

const path =
  kind === 'monthly'
    ? '/api/cron/monthly-staff-report'
    : '/api/cron/daily-report';

const url = `${base.replace(/\/$/, '')}${path}`;
console.log(`[cron-trigger] POST ${url}`);

const res = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  },
});

const text = await res.text();
console.log(`[cron-trigger] ${res.status}`, text.slice(0, 400));
if (!res.ok) process.exit(1);
