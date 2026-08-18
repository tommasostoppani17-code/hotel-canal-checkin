import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import express from 'express';
import cron from 'node-cron';
import dotenv from 'dotenv';

import {
  initDb,
  insertCheckin,
  createCouponToken,
  markCouponSent,
  resolveCouponFromToken,
  updateCheckinCouponDetails,
  exportAllCheckins,
  importCheckinsIfEmpty,
  countCheckins,
  setTableBooking,
  getCheckinById,
  purgeCheckinsOlderThan24Hours,
  isRoomTaken,
  getActiveCheckinByRoom,
  deleteCheckinsByRoom,
  exportStaffMonthStats,
  mergeStaffMonthStats,
  mergeStaffMonthStatsFromCheckins,
  romeCalendarDate,
  listStaffCheckins,
  updateCheckinRoom,
  toggleCheckinStar,
  listBlacklist,
  addToBlacklist,
  addCheckinToBlacklist,
  updateBlacklistNotes,
  removeFromBlacklist,
  listStaffAlerts,
  dismissStaffAlert,
  revealStaffCheckinPhone,
  revealStaffCheckinEmail,
  listCheckinActivity,
  listReceptionNotes,
  createReceptionNote,
  updateReceptionNote,
  setReceptionNoteStatus,
  deleteReceptionNote,
  getReceptionNote,
  RECEPTION_NOTE_CATEGORIES,
} from './db.js';
import {
  runDailyReport,
  runMonthlyStaffReport,
  sendTableBookingAlert,
} from './mail.js';
import { getCsvMedia, whatsappConfigured, sendTableBookingWhatsApp } from './whatsapp.js';
import {
  sendWelcomeEmail,
  buildCouponRedeemPage,
  buildCouponClaimPage,
  buildCouponQrPng,
} from './coupon.js';
import {
  buildCheckinQrPng,
  buildPosterPdfBuffer,
  sendPosterEmail,
} from './poster.js';
import { buildVeniceGuidePdfBuffer } from './venice-guide.js';
import {
  isBackupConfigured,
  pullCheckinsBackup,
  pushCheckinsBackup,
} from './backup.js';
import { buildTableBookingEmail } from './report.js';
import { buildGuestServicesPayload } from './guest-services.js';
import { verifyStaffPin } from './staff-auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const PORT = Number(process.env.PORT || 3000);
const HOTEL_NAME = process.env.HOTEL_NAME || 'Hotel Canal';
const CRON_TZ = process.env.CRON_TZ || 'Europe/Rome';
const CRON_SECRET = process.env.CRON_SECRET || '';
const IS_PROD =
  process.env.RENDER === 'true' || process.env.NODE_ENV === 'production';
const DATABASE_PATH =
  process.env.DATABASE_PATH || path.join(rootDir, 'data', 'checkins.db');

{
  const resolvedDb = path.resolve(DATABASE_PATH);
  const publicRoot = path.resolve(rootDir, 'public');
  if (
    resolvedDb === publicRoot ||
    resolvedDb.startsWith(`${publicRoot}${path.sep}`)
  ) {
    throw new Error(
      'DATABASE_PATH non può trovarsi sotto public/ (esposizione web vietata)',
    );
  }
}

/** Token report manuale: solo se impostato in env (niente hardcoded in prod). */
const REPORT_TRIGGER_TOKEN = String(process.env.REPORT_TRIGGER_TOKEN || '')
  .trim()
  .toLowerCase();

function assertProductionSecrets() {
  if (!IS_PROD) return;
  const cron = String(process.env.CRON_SECRET || '').trim();
  const guest = String(process.env.GUEST_ACCESS_SECRET || '').trim();
  const coupon = String(process.env.COUPON_SECRET || '').trim();
  const weak = (s) =>
    !s ||
    s.length < 24 ||
    /change-me|dev-only|hotel-canal-dev/i.test(s);

  if (!cron || weak(cron)) {
    throw new Error('CRON_SECRET obbligatorio in produzione (≥24 char random)');
  }
  if (!guest || weak(guest)) {
    throw new Error(
      'GUEST_ACCESS_SECRET obbligatorio in produzione (≥24 char, distinto da CRON)',
    );
  }
  if (!coupon || weak(coupon)) {
    throw new Error(
      'COUPON_SECRET obbligatorio in produzione (≥24 char, distinto da CRON)',
    );
  }
  if (guest === cron || coupon === cron || guest === coupon) {
    throw new Error(
      'CRON_SECRET, GUEST_ACCESS_SECRET e COUPON_SECRET devono essere tutti diversi',
    );
  }
  const fieldKey = String(process.env.FIELD_ENCRYPTION_KEY || '').trim();
  if (!fieldKey || fieldKey.length < 32) {
    throw new Error(
      'FIELD_ENCRYPTION_KEY obbligatorio in produzione (≥32 char random)',
    );
  }
}

assertProductionSecrets();

initDb(DATABASE_PATH);

async function syncCheckinsBackup(reason = 'update') {
  if (!isBackupConfigured()) return;
  try {
    const rows = exportAllCheckins();
    const stats = exportStaffMonthStats();
    await pushCheckinsBackup(rows, stats);
    console.log(
      `[backup] synced ${rows.length} checkins + ${stats.length} staff rows (${reason})`,
    );
  } catch (err) {
    console.error('[backup] sync failed:', err.message || err);
  }
}

async function restoreCheckinsBackupIfNeeded() {
  if (!isBackupConfigured()) {
    console.log('[backup] non configurato (CHECKIN_BACKUP_GIST_ID / TOKEN)');
    return;
  }
  try {
    const backup = await pullCheckinsBackup();
    if (!backup) {
      console.log('[backup] gist vuoto o illeggibile');
      return;
    }
    const { checkins = [], staffMonthStats = [] } = backup;
    if (countCheckins() === 0 && checkins.length) {
      const n = importCheckinsIfEmpty(checkins);
      console.log(`[backup] ripristinati ${n} checkins da Gist`);
    } else {
      console.log(`[backup] db locale ok (${countCheckins()} checkins)`);
    }
    const mergedStats = mergeStaffMonthStats(staffMonthStats);
    const mergedLive = mergeStaffMonthStatsFromCheckins();
    console.log(
      `[backup] staff stats: +${mergedStats} da gist, +${mergedLive} da check-in vivi`,
    );
  } catch (err) {
    console.error('[backup] restore failed:', err.message || err);
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

/** Rate limit in-memory (anti brute-force / DoS su rotte PII). */
const rateBuckets = new Map();
function rateLimit({ windowMs = 60_000, max = 30, keyFn } = {}) {
  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : `${req.ip}|${req.path}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 };
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryMin = Math.max(1, Math.ceil(windowMs / 60_000));
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        error: `Troppe richieste. Riprova tra ${retryMin} minut${retryMin === 1 ? 'o' : 'i'}.`,
        code: 'rate_limited',
      });
    }
    return next();
  };
}

/** Check-in / lead: max 20 richieste / 15 minuti per IP (test reception + ospiti). */
const checkinRateLimit = rateLimit({ windowMs: 15 * 60_000, max: 20 });

// Pulizia periodica bucket (finestre fino a 15m)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start > 20 * 60_000) rateBuckets.delete(key);
  }
}, 60_000).unref?.();

function maskPhone(phone) {
  const s = String(phone || '').replace(/\s/g, '');
  if (s.length < 6) return '***';
  return `${s.slice(0, 3)}…${s.slice(-2)}`;
}

function maskEmail(email) {
  const s = String(email || '');
  const at = s.indexOf('@');
  if (at < 1) return '***';
  return `${s.slice(0, 1)}***${s.slice(at)}`;
}

/** Header di sicurezza (CSP tollera inline perché public/index.html è monolitico). */
app.use((req, res, next) => {
  const proto = String(req.get('x-forwarded-proto') || req.protocol || '');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '0'); // browser moderni: CSP > legacy XSS auditor
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()',
  );
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "object-src 'none'",
      ...(proto === 'https' ? ['upgrade-insecure-requests'] : []),
    ].join('; '),
  );
  if (proto === 'https') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
  next();
});

/** Blocca esplicitamente DB / dump / path data (mai da cartella public). */
app.use((req, res, next) => {
  const p = String(req.path || '').toLowerCase();
  if (
    /\.(db|sqlite3?|sql|bak|dump)$/i.test(p) ||
    p === '/data' ||
    p.startsWith('/data/') ||
    p.includes('checkins.db') ||
    p.includes('.env')
  ) {
    return res.status(404).end();
  }
  return next();
});

// Cache lunga su asset email: i proxy Gmail/Apple rifetchano spesso
app.use(
  '/email',
  express.static(path.join(rootDir, 'public', 'email'), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    dotfiles: 'deny',
    setHeaders(res) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      // Client mail cross-origin devono poter caricare le immagini
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }),
);

app.get('/manifest.webmanifest', (_req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(rootDir, 'public', 'manifest.webmanifest'));
});

app.get('/sw.js', (_req, res) => {
  res.type('application/javascript');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(rootDir, 'public', 'sw.js'));
});

/** Preview locale email richiesta tavolo (stesso HTML inviato). */
app.get('/preview/table-booking-email', (req, res) => {
  if (IS_PROD && !isAuthorizedCron(req)) {
    return res.status(404).end();
  }
  const { html } = buildTableBookingEmail({
    hotelName: HOTEL_NAME,
    row: {
      guest_name: 'Ismary',
      room_number: '17',
      phone: '+34 600 000 000',
      guests_count: 2,
      receptionist: 'TOMMASO',
      table_booking: '20:15',
      coupon_token: 'preview',
      coupon_sent_at: new Date().toISOString(),
    },
  });
  res.type('html').send(html);
});

/** Niente backup / scrap in pubblico. */
app.use((req, res, next) => {
  if (/\.(bak|old|swp|tmp)$/i.test(req.path) || /\/_bak[-_/]/i.test(req.path)) {
    return res.status(404).end();
  }
  return next();
});

function publicBaseUrl() {
  return String(process.env.PUBLIC_URL || `http://localhost:${PORT}`).replace(
    /\/$/,
    '',
  );
}

/** Origini canoniche (apex + www) per eventuali client cross-origin. */
const ALLOWED_ORIGINS = new Set([
  'https://checkin-hotelcanal.it',
  'https://www.checkin-hotelcanal.it',
  publicBaseUrl(),
].filter(Boolean));

app.use((req, res, next) => {
  const origin = String(req.get('origin') || '').replace(/\/$/, '');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
  }
  if (req.method === 'OPTIONS' && origin && ALLOWED_ORIGINS.has(origin)) {
    return res.status(204).end();
  }
  return next();
});

/** Dashboard reception: noindex, mai in homepage ospite. */
app.get(['/staff.html', '/staff', '/staff/'], (_req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Cache-Control', 'no-store');
  res.type('html');
  return res.sendFile(path.join(rootDir, 'public', 'staff.html'));
});

/** Poster HTML: URL a piè di pagina sempre allineato a PUBLIC_URL. */
app.get(['/cartello-reception.html', '/qr-poster.html'], (req, res) => {
  const file = path.join(rootDir, 'public', path.basename(req.path));
  try {
    let html = fs.readFileSync(file, 'utf8');
    const base = publicBaseUrl();
    html = html
      .replace(/https?:\/\/hotel-canal-checkin\.onrender\.com/g, base)
      .replace(/https?:\/\/(?:www\.)?checkin-hotelcanal\.it/g, base)
      .replace(/__PUBLIC_URL__/g, base);
    res.type('html').send(html);
  } catch {
    res.status(404).end();
  }
});

app.use(
  express.static(path.join(rootDir, 'public'), {
    dotfiles: 'deny',
    index: ['index.html'],
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    },
  }),
);

const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const GUEST_ACCESS_TTL_SEC = 60 * 60 * 72; // 72h dopo check-in

function normalizeEmail(value) {
  const trimmed = String(value || '')
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
    .trim()
    .toLowerCase()
    .slice(0, 254);
  return trimmed || null;
}

function isValidEmail(email) {
  const s = String(email || '').trim();
  if (!s || s.length > 254) return false;
  if (/\s/.test(s)) return false;
  const at = s.indexOf('@');
  if (at <= 0 || at >= s.length - 1) return false;
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain || !domain.includes('.')) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) {
    return false;
  }
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return false;
  }
  return true;
}

function guestAccessSecret() {
  const secret = String(process.env.GUEST_ACCESS_SECRET || '').trim();
  if (secret) return secret;
  if (IS_PROD) {
    throw new Error('GUEST_ACCESS_SECRET obbligatorio in produzione');
  }
  return String(process.env.CRON_SECRET || 'dev-only-change-me').trim();
}

function timingSafeEqualStr(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/** Token HMAC legato al check-in: sblocca Wi-Fi / codici porta. */
function issueGuestAccessToken(checkinId) {
  const id = Number(checkinId);
  if (!Number.isFinite(id) || id < 1) return null;
  const exp = Math.floor(Date.now() / 1000) + GUEST_ACCESS_TTL_SEC;
  const body = `v1.${id}.${exp}`;
  const sig = crypto
    .createHmac('sha256', guestAccessSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

function verifyGuestAccessToken(rawToken) {
  const token = String(rawToken || '').trim();
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const id = Number(parts[1]);
  const exp = Number(parts[2]);
  const sig = parts[3];
  if (!Number.isFinite(id) || id < 1 || !Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  const body = `v1.${id}.${exp}`;
  const expected = crypto
    .createHmac('sha256', guestAccessSecret())
    .update(body)
    .digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return null;
  if (!getCheckinById(id)) return null;
  return { checkinId: id, exp };
}

function readGuestAccessToken(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim();
  }
  // Solo header (niente ?token= nei log proxy / Referer)
  return String(req.get('x-guest-token') || '').trim();
}

/** Rimuove markup/script (XSS) da testo libero ospite. */
function sanitizePlainText(value, maxLen = 80) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`\\]/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/** Nome receptionist a testo libero (maiuscolo, spazi normalizzati, no HTML). */
function normalizeReceptionist(raw) {
  const key = sanitizePlainText(raw, 60).toUpperCase();
  return key || null;
}

/** Solo cifre e un eventuale + iniziale (00… → +…). */
function cleanPhone(phone) {
  let s = String(phone || '').replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  const hasPlus = s.startsWith('+');
  s = s.replace(/\+/g, '');
  return hasPlus ? `+${s}` : s;
}

function normalizeField(value) {
  return sanitizePlainText(value, 120).toLowerCase();
}

function toUpperOrNull(value) {
  const trimmed = sanitizePlainText(value, 80);
  return trimmed ? trimmed.toUpperCase() : null;
}

function testerEmailSet() {
  const defaults = [
    'tommasostoppani17@gmail.com',
    'payel@hotelcanal.com',
    'mizan@hotelcanal.com',
  ];
  const fromEnv = String(process.env.TESTER_EMAILS || '')
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const report = String(process.env.REPORT_EMAIL || '')
    .trim()
    .toLowerCase();
  return new Set(
    [...defaults, ...fromEnv, report].filter((e) => e && e.includes('@')),
  );
}

function testerPhoneSet() {
  const fromEnv = String(process.env.TESTER_PHONES || '')
    .split(/[,;\s]+/)
    .map((s) => cleanPhone(s))
    .filter(Boolean);
  const payel = cleanPhone(process.env.WHATSAPP_PAYEL || '');
  return new Set([...fromEnv, payel].filter(Boolean));
}

function testerNameSet() {
  const defaults = ['TOMMASO', 'PAYEL', 'MIZAN', 'STOPPANI'];
  const fromEnv = String(process.env.TESTER_NAMES || '')
    .split(/[,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return new Set([...defaults, ...fromEnv]);
}

function isTesterAccount({ email, phone, firstName, lastName, guestName } = {}) {
  const mail = normalizeEmail(email);
  if (mail && testerEmailSet().has(mail)) return true;

  const tel = cleanPhone(phone);
  if (tel && testerPhoneSet().has(tel)) return true;
  // Match anche senza + / con 00
  if (tel) {
    const digits = tel.replace(/\D/g, '');
    for (const allowed of testerPhoneSet()) {
      const a = String(allowed).replace(/\D/g, '');
      if (a && (a === digits || a.endsWith(digits) || digits.endsWith(a))) {
        return true;
      }
    }
  }

  const names = testerNameSet();
  const tokens = `${firstName || ''} ${lastName || ''} ${guestName || ''}`
    .toUpperCase()
    .split(/[^A-ZÀ-Ü]+/)
    .filter(Boolean);
  if (tokens.some((t) => names.has(t))) return true;

  return false;
}

function isValidPhone(cleaned) {
  return PHONE_REGEX.test(cleaned);
}

function isManualReportTrigger({ phone, guestName, firstName, lastName }) {
  // Disabilitato se REPORT_TRIGGER_TOKEN non è in env (≥12 char)
  const token = REPORT_TRIGGER_TOKEN;
  if (!token || token.length < 12) return false;
  const match = (v) => normalizeField(v) === token;

  const nameOk =
    firstName || lastName
      ? match(firstName) && match(lastName)
      : match(guestName);

  return nameOk && match(phone);
}

function isAuthorizedCron(req) {
  if (!CRON_SECRET) return false;
  const header = req.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  // Solo Authorization Bearer — niente ?secret= in query/log
  return timingSafeEqualStr(bearer, CRON_SECRET);
}

function publicReportSummary(result) {
  if (!result || typeof result !== 'object') return { ok: true };
  return {
    sent: Boolean(result.sent),
    count: Number(result.count) || 0,
    empty:
      Boolean(result.empty) ||
      result.reason === 'no_new_checkins' ||
      result.reason === 'no_month_data',
    reason: result.reason || undefined,
    yearMonth: result.yearMonth || undefined,
    staff: result.staff,
  };
}

function staffReportResponse(result) {
  const summary = publicReportSummary(result);
  const channels = [];
  if (result?.email) {
    channels.push({
      kind: 'email',
      sent: Boolean(result.email.sent),
      to: result.email.to || undefined,
      error: result.email.error || undefined,
    });
  }
  if (result?.whatsapp) {
    channels.push({
      kind: 'whatsapp',
      sent: Boolean(result.whatsapp.sent),
      label: 'WhatsApp Payel',
      error: result.whatsapp.error || undefined,
    });
  }
  return {
    ...summary,
    dateLabel: result?.dateLabel || undefined,
    channels,
    partialErrors: Array.isArray(result?.partialErrors)
      ? result.partialErrors
      : undefined,
    to: result?.to || undefined,
  };
}

const STAFF_COOKIE = 'hc_staff';
const STAFF_SESSION_TTL_SEC = 60 * 60 * 12;

const STAFF_ROSTER = [
  { id: 'tommaso', name: 'TOMMASO', label: 'Tommaso' },
  { id: 'john', name: 'JOHN', label: 'John' },
  { id: 'alejandro', name: 'ALEJANDRO', label: 'Alejandro' },
  { id: 'maria', name: 'MARIA', label: 'Maria' },
  { id: 'mizan', name: 'MIZAN', label: 'Mizan' },
  { id: 'payel', name: 'PAYEL', label: 'Payel' },
];

function staffMemberById(staffId) {
  const id = String(staffId || '').trim().toLowerCase();
  return STAFF_ROSTER.find((member) => member.id === id) || null;
}

function staffPinFor(staffId) {
  const member = staffMemberById(staffId);
  if (!member) return '';
  const envKey = `STAFF_PIN_${member.id.toUpperCase()}`;
  const fromEnv = String(process.env[envKey] || '').trim();
  if (fromEnv) return fromEnv;
  if (!IS_PROD) return `canal${member.id}`;
  return '';
}

function staffAuthConfigured() {
  return STAFF_ROSTER.some((member) => Boolean(staffPinFor(member.id)));
}

function staffSessionSecret() {
  return `${guestAccessSecret()}:staff-dashboard`;
}

function issueStaffSession(staffId) {
  const member = staffMemberById(staffId);
  if (!member) return '';
  const exp = Math.floor(Date.now() / 1000) + STAFF_SESSION_TTL_SEC;
  const body = `v2.${exp}.${member.id}`;
  const sig = crypto
    .createHmac('sha256', staffSessionSecret())
    .update(body)
    .digest('base64url');
  return `${body}.${sig}`;
}

function parseStaffSession(raw) {
  const token = String(raw || '').trim();
  const parts = token.split('.');
  if (parts.length !== 4 || parts[0] !== 'v2') return null;
  const exp = Number(parts[1]);
  const staffId = String(parts[2] || '').trim().toLowerCase();
  const sig = parts[3];
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const member = staffMemberById(staffId);
  if (!member) return null;
  const body = `v2.${exp}.${member.id}`;
  const expected = crypto
    .createHmac('sha256', staffSessionSecret())
    .update(body)
    .digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return null;
  return {
    staffId: member.id,
    staffName: member.name,
    staffLabel: member.label,
    exp,
  };
}

function verifyStaffSession(raw) {
  return Boolean(parseStaffSession(raw));
}

function readCookie(req, name) {
  const header = String(req.headers.cookie || '');
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(i + 1).trim());
      } catch {
        return part.slice(i + 1).trim();
      }
    }
  }
  return '';
}

function setStaffCookie(res, token) {
  const parts = [
    `${STAFF_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${STAFF_SESSION_TTL_SEC}`,
  ];
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearStaffCookie(res) {
  const parts = [
    `${STAFF_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (IS_PROD) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

function requireStaff(req, res, next) {
  const session = parseStaffSession(readCookie(req, STAFF_COOKIE));
  if (!session) {
    return res.status(401).json({ error: 'Accesso staff richiesto', code: 'staff_auth' });
  }
  req.staffUser = session;
  return next();
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

/** Wi-Fi + codici porta: solo con token emesso al check-in riuscito. */
app.get(
  '/api/guest-services',
  rateLimit({ windowMs: 60_000, max: 30 }),
  (req, res) => {
  const access = verifyGuestAccessToken(readGuestAccessToken(req));
  if (!access) {
    return res.status(401).json({
      error: 'Accesso non autorizzato',
    });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    ...buildGuestServicesPayload(),
    checkinId: access.checkinId,
  });
});

/** Ops checklist — solo staff con CRON_SECRET (niente recon pubblico). */
app.get(
  '/api/ready',
  rateLimit({ windowMs: 60_000, max: 20 }),
  (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }
  const from = String(process.env.SMTP_FROM || '');
  const reportEmail = String(process.env.REPORT_EMAIL || '').trim();
  const resendKey = Boolean(String(process.env.RESEND_API_KEY || '').trim());
  const usingDevFrom = /onboarding@resend\.dev/i.test(from);
  const dbPath = DATABASE_PATH;
  const onPersistentDisk = dbPath.startsWith('/var/data');
  const backupOk = isBackupConfigured();
  const guestEmailReady = resendKey && !usingDevFrom;
  const whatsappReady = whatsappConfigured();
  const reportReady =
    (Boolean(reportEmail) &&
      (guestEmailReady || /gmail\.com$/i.test(reportEmail))) ||
    whatsappReady;
  const dataReady = onPersistentDisk || backupOk;
  const blockers = [];
  if (!guestEmailReady) {
    blockers.push('SMTP_FROM: verifica dominio Resend');
  }
  if (!reportEmail && !whatsappReady) {
    blockers.push('REPORT_EMAIL e/o WhatsApp non configurati');
  }
  if (!dataReady) {
    blockers.push('Disco persistente o backup Gist mancante');
  }
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    ok: blockers.length === 0,
    hotel: HOTEL_NAME,
    checkins: countCheckins(),
    reportEmailConfigured: Boolean(reportEmail),
    guestEmailReady,
    reportReady,
    whatsappReady,
    dataReady,
    backupConfigured: backupOk,
    persistentDisk: onPersistentDisk,
    blockers,
  });
});

/** CSV temporaneo per Twilio mediaUrl (token monouso, TTL corto). */
app.get(
  '/api/reports/whatsapp-csv/:token',
  rateLimit({ windowMs: 60_000, max: 10 }),
  (req, res) => {
  const item = getCsvMedia(req.params.token);
  if (!item) {
    return res.status(404).type('text/plain').send('Not found');
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${item.filename.replace(/"/g, '')}"`,
  );
  return res.send(item.csv);
});

/** QR PNG check-in (URL pubblico) — usato dal poster PDF e dalla locandina. */
app.get('/qr-checkin.png', async (_req, res) => {
  try {
    const png = await buildCheckinQrPng();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(png);
  } catch (err) {
    console.error('QR check-in:', err);
    return res.status(500).end();
  }
});

/** Venice guest guide PDF (lang=it|en|fr|de|es). */
app.get('/venice-guide.pdf', async (req, res) => {
  try {
    const lang = String(req.query.lang || 'en').slice(0, 2);
    const pdf = await buildVeniceGuidePdfBuffer(lang);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="hotel-canal-venice-guide-${lang}.pdf"`,
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(pdf);
  } catch (err) {
    console.error('Venice guide PDF:', err);
    return res.status(500).type('text').send('Venice guide PDF error');
  }
});

/** Download A4 PDF poster (English · Welcome Discount). */
app.get('/poster-a4.pdf', async (_req, res) => {
  try {
    const pdf = await buildPosterPdfBuffer({ hotelName: HOTEL_NAME });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="Hotel_Canal_Cartello_Checkin.pdf"',
    );
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(pdf);
  } catch (err) {
    console.error('Poster PDF:', err);
    return res.status(500).type('text').send('Poster PDF error');
  }
});

/**
 * Email the A4 PDF poster.
 * Auth: Authorization Bearer CRON_SECRET
 */
app.get(
  '/api/send-poster',
  rateLimit({ windowMs: 60_000, max: 5 }),
  async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).type('html').send(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:48px;color:#C62828;">Unauthorized.</body></html>`,
    );
  }

  try {
    await sendPosterEmail({
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });
    return res.type('html').send(
      `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:48px;color:#124453;">
        <h2 style="margin:0 0 12px;">A4 PDF poster sent</h2>
        <p style="margin:0;color:#64748B;">Delivery queued.</p>
      </body></html>`,
    );
  } catch (err) {
    console.error('Invio poster:', err);
    return res
      .status(500)
      .type('html')
      .send(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:48px;color:#C62828;">Poster send error.</body></html>`,
      );
  }
});

function couponLinkGonePage() {
  return `<!DOCTYPE html><html lang="it"><body style="font-family:sans-serif;padding:40px;text-align:center;max-width:420px;margin:40px auto;">
    <h1 style="color:#124453;">Link non valido</h1>
    <p>Questo coupon non e riconosciuto. Rifai il check-in dall'app Hotel Canal per ricevere un nuovo link.</p>
    <p><a href="/" style="color:#124453;">Torna al check-in</a></p>
  </body></html>`;
}

app.get('/coupon/:token/qr.png', async (req, res) => {
  try {
    // PNG dal token firmato (niente lookup DB): Gmail puo scaricarlo anche dopo un redeploy.
    const token = String(req.params.token || '').trim();
    if (!token || token.length < 12) return res.status(404).end();
    const png = await buildCouponQrPng(token);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(png);
  } catch (err) {
    console.error('QR coupon:', err);
    return res.status(500).end();
  }
});

app.get('/coupon/claim/:token', (req, res) => {
  const token = String(req.params.token || '').trim();
  const resolved = resolveCouponFromToken(token);
  if (!resolved) {
    return res.status(404).type('html').send(couponLinkGonePage());
  }
  const { row } = resolved;
  if (row.room_number && row.receptionist) {
    return res.redirect(302, `/coupon/${encodeURIComponent(token)}`);
  }
  return res.type('html').send(
    buildCouponClaimPage({
      token,
      guestName: row.guest_name,
    }),
  );
});

app.post('/coupon/claim/:token', (req, res) => {
  const token = String(req.params.token || '').trim();
  const resolved = resolveCouponFromToken(token);
  if (!resolved) {
    return res.status(404).type('html').send(couponLinkGonePage());
  }

  const { row, payload } = resolved;
  const roomNumber = toUpperOrNull(req.body?.roomNumber || req.body?.room || '');
  const receptionist = normalizeReceptionist(
    req.body?.receptionist || req.body?.staff || '',
  );

  if (!roomNumber) {
    return res.status(400).type('html').send(
      buildCouponClaimPage({
        token,
        guestName: row.guest_name,
        error: 'Inserisci il numero di stanza.',
      }),
    );
  }
  if (!receptionist) {
    return res.status(400).type('html').send(
      buildCouponClaimPage({
        token,
        guestName: row.guest_name,
        error: 'Inserisci il nome del receptionist.',
      }),
    );
  }

  if (isRoomTaken(roomNumber, row.id || null, row.stay_date || romeCalendarDate(row.created_at))) {
    return res.status(409).type('html').send(
      buildCouponClaimPage({
        token,
        guestName: row.guest_name,
        error: 'Questa stanza è già registrata. Contatta la reception.',
      }),
    );
  }

  if (row.id) {
    updateCheckinCouponDetails(row.id, { roomNumber, receptionist });
    markCouponSent(row.id);
    void syncCheckinsBackup('coupon-claim');
    return res.redirect(302, `/coupon/${encodeURIComponent(token)}`);
  }

  // Legacy token firmato senza riga DB: crea check-in con token opaco nuovo
  const phone = row.phone || payload?.p;
  if (!phone) {
    return res.status(400).type('html').send(couponLinkGonePage());
  }
  const redeemToken = createCouponToken();
  let id;
  try {
    id = insertCheckin({
      phone,
      email: row.email || payload?.e || null,
      guestName: row.guest_name || payload?.g || null,
      roomNumber,
      receptionist,
      guestsCount: row.guests_count ?? payload?.n ?? 2,
      couponToken: redeemToken,
      withCoupon: true,
    });
  } catch (err) {
    const msg = String(err?.message || err || '');
    if (/UNIQUE|idx_checkins_room_unique|idx_checkins_room_day_unique/i.test(msg)) {
      return res.status(409).type('html').send(
        buildCouponClaimPage({
          token,
          guestName: row.guest_name,
          error: 'Questa stanza è già registrata. Contatta la reception.',
        }),
      );
    }
    throw err;
  }
  markCouponSent(id);
  void syncCheckinsBackup('coupon-claim');

  return res.redirect(302, `/coupon/${encodeURIComponent(redeemToken)}`);
});

app.get('/coupon/:token', (req, res) => {
  const token = String(req.params.token || '').trim();
  const resolved = resolveCouponFromToken(token);
  if (!resolved) {
    return res.status(404).type('html').send(couponLinkGonePage());
  }

  const { row } = resolved;
  if (!row.room_number || !row.receptionist) {
    return res.redirect(302, `/coupon/claim/${encodeURIComponent(token)}`);
  }

  return res.type('html').send(
    buildCouponRedeemPage({
      receptionist: row.receptionist,
      roomNumber: row.room_number,
      guestName: row.guest_name,
      guestsCount: row.guests_count,
    }),
  );
});

async function handleCheckin(req, res) {
  try {
    const phoneRaw = String(req.body?.phone || '').trim();
    const emailRaw = String(req.body?.email || '').trim();
    const firstNameRaw = String(
      req.body?.firstName || req.body?.firstname || '',
    ).trim();
    const lastNameRaw = String(
      req.body?.lastName || req.body?.lastname || '',
    ).trim();
    const guestNameRaw = String(
      req.body?.guestName ||
        req.body?.fullname ||
        [firstNameRaw, lastNameRaw].filter(Boolean).join(' ') ||
        '',
    ).trim();
    const roomNumberRaw = String(
      req.body?.roomNumber || req.body?.room || '',
    ).trim();
    const receptionistRaw = String(
      req.body?.receptionist || req.body?.staff || '',
    ).trim();
    const guestsRaw =
      req.body?.guestsCount ?? req.body?.guests_count ?? req.body?.guests ?? '';
    const languageRaw =
      req.body?.language ?? req.body?.lang ?? req.body?.locale ?? '';
    const privacy =
      req.body?.privacy === true ||
      req.body?.privacy === 'true' ||
      req.body?.privacy === 'on';

    if (!privacy) {
      return res.status(400).json({ error: 'Consenso privacy obbligatorio' });
    }

    if (
      isManualReportTrigger({
        phone: phoneRaw,
        guestName: guestNameRaw,
        firstName: firstNameRaw,
        lastName: lastNameRaw,
      })
    ) {
      try {
        const result = await runDailyReport({ force: true });
        console.log('[manual-report]', publicReportSummary(result));
        return res.status(200).json({
          success: true,
          reportTriggered: true,
          ...publicReportSummary(result),
        });
      } catch (err) {
        console.error('Errore report manuale:', err);
        return res.status(500).json({
          error: 'Errore invio report',
        });
      }
    }

    const phone = cleanPhone(phoneRaw);
    if (!phone) {
      return res.status(400).json({ error: 'Telefono obbligatorio' });
    }
    if (!isValidPhone(phone)) {
      return res.status(400).json({ error: 'Numero di telefono non valido' });
    }

    const email = normalizeEmail(emailRaw);
    if (!email) {
      return res.status(400).json({ error: 'Email obbligatoria' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    const firstName = toUpperOrNull(firstNameRaw);
    const lastName = toUpperOrNull(lastNameRaw);
    if (!firstName) {
      return res.status(400).json({ error: 'Nome obbligatorio' });
    }
    if (!lastName) {
      return res.status(400).json({ error: 'Cognome obbligatorio' });
    }

    const guestName = `${firstName} ${lastName}`;
    let roomNumber = toUpperOrNull(roomNumberRaw);
    let receptionist = normalizeReceptionist(receptionistRaw);

    let guestsCount = Number.parseInt(String(guestsRaw).trim(), 10);
    if (!Number.isFinite(guestsCount) || guestsCount < 1) guestsCount = 2;
    if (guestsCount > 20) guestsCount = 20;

    const wantCoupon =
      req.body?.wantCoupon === true ||
      req.body?.wantCoupon === 'true' ||
      req.body?.includeCoupon === true ||
      req.body?.includeCoupon === 'true';

    // Coupon: stanza + receptionist del check-in obbligatori
    if (wantCoupon) {
      if (!roomNumber) {
        return res.status(400).json({ error: 'Numero di stanza obbligatorio per il coupon' });
      }
      if (!receptionist) {
        return res
          .status(400)
          .json({ error: 'Nome del receptionist del check-in obbligatorio per il coupon' });
      }
    }

    const includeCoupon = Boolean(wantCoupon && roomNumber && receptionist);
    // Stanza serve sempre a Payel (tavolo) — non azzerarla se manca il coupon.
    // Solo il receptionist resta legato al flusso coupon.
    if (!includeCoupon) {
      receptionist = null;
    }

    const tester = isTesterAccount({
      email,
      phone,
      firstName,
      lastName,
      guestName,
    });

    if (roomNumber && isRoomTaken(roomNumber)) {
      if (tester) {
        const removed = deleteCheckinsByRoom(roomNumber);
        console.log(
          `[tester] stanza ${roomNumber} liberata (${removed} check-in) per ${maskEmail(email)}`,
        );
      } else {
        const existing = getActiveCheckinByRoom(roomNumber);
        const sameEmail =
          existing?.email &&
          normalizeEmail(existing.email) === email;
        const samePhone =
          existing?.phone &&
          cleanPhone(existing.phone) === phone;
        if (existing && (sameEmail || samePhone)) {
          return res.status(200).json({
            success: true,
            alreadyRegistered: true,
            id: existing.id,
            guestAccessToken: issueGuestAccessToken(existing.id),
            checkCode: `HC-${String(existing.id).padStart(4, '0')}`,
            createdAt: existing.created_at || new Date().toISOString(),
            welcomeSent: false,
            couponSent: Boolean(existing.coupon_sent_at),
            receptionist: existing.receptionist || null,
            guestsCount: existing.guests_count ?? guestsCount,
            tester: false,
            skipDeviceLock: false,
          });
        }
        return res.status(409).json({
          error: 'Stanza già registrata',
          code: 'room_taken',
        });
      }
    }

    const couponToken = createCouponToken();

    let id;
    try {
      id = insertCheckin({
        phone,
        email,
        guestName,
        roomNumber,
        receptionist,
        guestsCount,
        couponToken,
        withCoupon: includeCoupon,
        skipStaffStats: tester,
      });
    } catch (err) {
      const msg = String(err?.message || err || '');
      if (/UNIQUE|idx_checkins_room_unique|idx_checkins_room_day_unique/i.test(msg)) {
        if (tester && roomNumber) {
          deleteCheckinsByRoom(roomNumber);
          id = insertCheckin({
            phone,
            email,
            guestName,
            roomNumber,
            receptionist,
            guestsCount,
            couponToken,
            withCoupon: includeCoupon,
            skipStaffStats: true,
          });
        } else {
          return res.status(409).json({
            error: 'Stanza già registrata',
            code: 'room_taken',
          });
        }
      } else {
        throw err;
      }
    }

    // Orario tavolo scelto nello Step 2 (opzionale)
    const tableRaw = String(
      req.body?.tableBooking ?? req.body?.table_booking ?? '',
    )
      .trim()
      .toUpperCase();
    if (
      tableRaw &&
      tableRaw !== 'NO' &&
      tableRaw !== 'SKIP' &&
      tableRaw !== 'NONE' &&
      (/^\d{2}:\d{2}$/.test(tableRaw) ||
        /^(REQUESTED|CALL|TAVOLO)$/i.test(tableRaw))
    ) {
      setTableBooking(id, tableRaw, guestsCount);
    }

    void syncCheckinsBackup('checkin');

    let welcomeSent = false;
    try {
      const welcomeResult = await sendWelcomeEmail({
        to: email,
        guestName,
        roomNumber,
        receptionist,
        guestsCount,
        token: couponToken,
        language: languageRaw,
        includeCoupon,
      });
      welcomeSent = Boolean(welcomeResult?.sent);
      if (welcomeSent && includeCoupon) markCouponSent(id);
      if (welcomeSent) {
        console.log(
          `[welcome] Concierge email → ${maskEmail(email)} · lang ${String(languageRaw || 'en').slice(0, 2)} · coupon ${includeCoupon ? 'yes' : 'claim-link'} · room ${roomNumber || '-'} · staff ${receptionist || '-'} · guests ${guestsCount}`,
        );
      } else {
        console.warn(
          `[welcome] non inviata → ${maskEmail(email)} · reason ${welcomeResult?.reason || 'unknown'}`,
        );
      }
    } catch (mailErr) {
      console.error('[welcome] Errore invio:', mailErr.message || mailErr);
    }

    return res.status(201).json({
      success: true,
      id,
      guestAccessToken: issueGuestAccessToken(id),
      checkCode: `HC-${String(id).padStart(4, '0')}`,
      createdAt: new Date().toISOString(),
      welcomeSent,
      couponSent: includeCoupon && welcomeSent,
      receptionist: receptionist || null,
      guestsCount,
      tester: Boolean(tester),
      skipDeviceLock: Boolean(tester),
    });
  } catch (err) {
    console.error('Errore check-in:', err?.message || err);
    return res.status(500).json({ error: 'Errore interno server' });
  }
}

app.post('/api/checkins', checkinRateLimit, handleCheckin);
app.post('/api/save-lead', checkinRateLimit, handleCheckin);

/** Richiesta tavolo dopo check-in → email Payel + WhatsApp Twilio (se configurato). */
app.post(
  '/api/table-booking',
  rateLimit({ windowMs: 60_000, max: 12 }),
  async (req, res) => {
  try {
    const access = verifyGuestAccessToken(readGuestAccessToken(req));
    if (!access) {
      return res.status(401).json({ error: 'Accesso non autorizzato' });
    }
    const id = Number(req.body?.checkinId ?? req.body?.id ?? access.checkinId);
    if (!Number.isFinite(id) || id < 1 || id !== access.checkinId) {
      return res.status(403).json({ error: 'checkinId non corrisponde al token' });
    }
    const rawTimeIn = String(req.body?.tableBooking ?? req.body?.time ?? 'REQUESTED')
      .trim();
    const timeMatch = rawTimeIn.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    const rawTime = timeMatch
      ? `${String(Math.min(23, Number(timeMatch[1]))).padStart(2, '0')}:${String(Math.min(59, Number(timeMatch[2]))).padStart(2, '0')}`
      : rawTimeIn.toUpperCase();
    const guestLang = String(req.body?.language ?? req.body?.lang ?? '')
      .trim()
      .toLowerCase()
      .slice(0, 5);
    const guestsRaw =
      req.body?.guestsCount ?? req.body?.guests_count ?? req.body?.pax ?? null;
    if (!rawTime || /^(NO|SKIP|NONE)$/i.test(rawTime)) {
      return res.json({ sent: false, skipped: true });
    }
    const dateRaw = String(req.body?.tableDate ?? req.body?.date ?? '')
      .trim()
      .slice(0, 10);
    const okDate = !dateRaw || /^\d{4}-\d{2}-\d{2}$/.test(dateRaw);
    if (!okDate) {
      return res.status(400).json({ error: 'Data prenotazione non valida' });
    }
    const storedTime =
      dateRaw && /^\d{2}:\d{2}$/.test(rawTime) ? `${dateRaw} ${rawTime}` : rawTime;
    const okTime =
      /^\d{2}:\d{2}$/.test(rawTime) ||
      /^(REQUESTED|CALL|TAVOLO)$/i.test(rawTime);
    if (!okTime) {
      return res.status(400).json({ error: 'Orario / richiesta non valida' });
    }

    const row = setTableBooking(id, storedTime, guestsRaw);
    if (!row) {
      return res.status(404).json({ error: 'Check-in non trovato' });
    }
    if (guestLang) row.guest_lang = guestLang;

    const channels = { email: null, whatsapp: null };
    const errors = [];

    try {
      channels.email = await sendTableBookingAlert(row);
      console.log(
        `[table] Email alert · stanza ${row.room_number || '-'} · ${rawTime} · ${maskPhone(row.phone)}`,
      );
    } catch (err) {
      const message = err.message || String(err);
      console.error('[table] Alert email fallita:', message);
      errors.push(`email: ${message}`);
      channels.email = { sent: false, error: message };
    }

    try {
      channels.whatsapp = await sendTableBookingWhatsApp(row);
      if (channels.whatsapp?.sent) {
        console.log(
          `[table] WhatsApp alert · stanza ${row.room_number || '-'}`,
        );
      }
    } catch (err) {
      const message = err.message || String(err);
      console.error('[table] Alert WhatsApp fallita:', message);
      errors.push(`whatsapp: ${message}`);
      channels.whatsapp = { sent: false, error: message };
    }

    void syncCheckinsBackup('table-booking');
    const anySent = Boolean(channels.email?.sent || channels.whatsapp?.sent);
    // Prenotazione salvata: successo ospite anche se alert Payel fallisce
    return res.status(anySent ? 200 : 202).json({
      success: true,
      saved: true,
      alertSent: anySent,
      tableBooking: rawTime,
    });
  } catch (err) {
    console.error('Errore table-booking:', err);
    return res.status(500).json({ error: 'Errore interno server' });
  }
});

const staffLoginLimit = rateLimit({ windowMs: 15 * 60_000, max: 8 });

app.get('/api/staff/login-info', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    configured: staffAuthConfigured(),
    staff: STAFF_ROSTER.map((member) => ({ id: member.id, label: member.label })),
  });
});

app.post('/api/staff/login', staffLoginLimit, (req, res) => {
  if (!staffAuthConfigured()) {
    return res.status(503).json({ error: 'Dashboard staff non configurata' });
  }
  const staffId = String(req.body?.staff || req.body?.staffId || '').trim().toLowerCase();
  const pin = String(req.body?.pin || '').trim();
  const member = staffMemberById(staffId);
  const expected = member ? staffPinFor(member.id) : '';
  if (!member || !expected || !pin || !verifyStaffPin(pin, expected)) {
    return res.status(401).json({ error: 'Nome o password non validi', code: 'bad_pin' });
  }
  setStaffCookie(res, issueStaffSession(member.id));
  return res.json({
    ok: true,
    staff: { id: member.id, name: member.name, label: member.label },
  });
});

app.post('/api/staff/logout', (req, res) => {
  clearStaffCookie(res);
  return res.json({ ok: true });
});

app.get('/api/staff/session', (req, res) => {
  const session = parseStaffSession(readCookie(req, STAFF_COOKIE));
  if (!session) return res.json({ ok: false });
  return res.json({
    ok: true,
    staff: {
      id: session.staffId,
      name: session.staffName,
      label: session.staffLabel,
    },
  });
});

app.get(
  '/api/staff/checkins',
  rateLimit({ windowMs: 60_000, max: 60 }),
  requireStaff,
  (req, res) => {
    const date = String(req.query.date || '').trim();
    const q = String(req.query.q || '').trim().slice(0, 80);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Data non valida' });
    }
    const payload = listStaffCheckins({ date, q });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(payload);
  },
);

app.patch(
  '/api/staff/checkins/:id/room',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = updateCheckinRoom(
      id,
      req.body?.room || req.body?.roomNumber,
      req.staffUser?.staffName,
    );
    if (!result.ok) {
      const status =
        result.error === 'not_found'
          ? 404
          : result.error === 'room_taken'
            ? 409
            : 400;
      return res.status(status).json({
        error:
          result.error === 'room_taken'
            ? 'Stanza già occupata in quel giorno'
            : result.error === 'room_required'
              ? 'Numero di stanza obbligatorio'
              : 'Stanza non valida',
        code: result.error,
      });
    }
    void syncCheckinsBackup('staff-room');
    return res.json(result.row);
  },
);

app.post(
  '/api/staff/checkins/:id/star',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = toggleCheckinStar(id, req.staffUser?.staffName);
    if (!result.ok) {
      return res.status(404).json({ error: 'Check-in non trovato' });
    }
    void syncCheckinsBackup('staff-star');
    return res.json(result.row);
  },
);

app.get(
  '/api/staff/checkins/:id/phone',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = revealStaffCheckinPhone(id, req.staffUser?.staffName);
    if (!result.ok) {
      return res.status(404).json({
        error: 'Telefono non disponibile',
        code: result.error,
      });
    }
    console.log(`[staff-reveal] phone checkin=${id}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ phone: result.phone });
  },
);

app.get(
  '/api/staff/checkins/:id/email',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = revealStaffCheckinEmail(id, req.staffUser?.staffName);
    if (!result.ok) {
      return res.status(404).json({
        error: 'Email non disponibile',
        code: result.error,
      });
    }
    console.log(`[staff-reveal] email checkin=${id}`);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ email: result.email });
  },
);

app.post(
  '/api/staff/send-report',
  rateLimit({ windowMs: 60_000, max: 6 }),
  requireStaff,
  async (req, res) => {
    try {
      const result = await runDailyReport({ force: true });
      console.log('[staff-report]', publicReportSummary(result));
      return res.json(staffReportResponse(result));
    } catch (err) {
      console.error('Errore report staff:', err);
      return res.status(500).json({ error: 'Errore invio report' });
    }
  },
);

app.get(
  '/api/staff/alerts',
  rateLimit({ windowMs: 60_000, max: 120 }),
  requireStaff,
  (req, res) => {
    const payload = listStaffAlerts();
    res.setHeader('Cache-Control', 'no-store');
    return res.json(payload);
  },
);

app.post(
  '/api/staff/alerts/:id/dismiss',
  rateLimit({ windowMs: 60_000, max: 60 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    const result = dismissStaffAlert(id);
    if (!result.ok) {
      return res.status(result.error === 'invalid_id' ? 400 : 404).json({
        error: result.error === 'invalid_id' ? 'Id non valido' : 'Notifica non trovata',
      });
    }
    return res.json({ ok: true });
  },
);

app.get(
  '/api/staff/checkins/:id/activity',
  rateLimit({ windowMs: 60_000, max: 80 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const activity = listCheckinActivity(id, 20, 'room_change');
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ activity });
  },
);

app.get(
  '/api/staff/reception-notes',
  rateLimit({ windowMs: 60_000, max: 80 }),
  requireStaff,
  (req, res) => {
    const date = String(req.query.date || '').trim();
    const q = String(req.query.q || '').trim().slice(0, 80);
    const includeDone = String(req.query.includeDone || '').trim() === '1';
    const shift = String(req.query.shift || '').trim() === '1';
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Data non valida' });
    }
    const payload = listReceptionNotes({ date, q, includeDone, shift });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(payload);
  },
);

app.post(
  '/api/staff/reception-notes',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const result = createReceptionNote({
      checkinId: req.body?.checkinId ?? req.body?.checkin_id ?? null,
      guestName: req.body?.guestName ?? req.body?.guest_name ?? '',
      roomNumber: req.body?.roomNumber ?? req.body?.room_number ?? '',
      category: req.body?.category ?? 'other',
      instruction: req.body?.instruction ?? req.body?.note ?? '',
      dueDate: req.body?.dueDate ?? req.body?.due_date ?? '',
      dueTime: req.body?.dueTime ?? req.body?.due_time ?? '',
      createdBy: req.staffUser?.staffName,
    });
    if (!result.ok) {
      return res.status(400).json({
        error:
          result.error === 'name_required'
            ? 'Nome ospite obbligatorio'
            : result.error === 'instruction_required'
              ? 'Descrivi cosa fare per il team'
              : 'Dati non validi',
        code: result.error,
      });
    }
    return res.json(result);
  },
);

app.patch(
  '/api/staff/reception-notes/:id',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = updateReceptionNote(id, {
      guestName: req.body?.guestName,
      roomNumber: req.body?.roomNumber,
      category: req.body?.category,
      instruction: req.body?.instruction,
      dueDate: req.body?.dueDate,
      dueTime: req.body?.dueTime,
    }, req.staffUser?.staffName);
    if (!result.ok) {
      const status = result.error === 'not_found' ? 404 : 400;
      return res.status(status).json({
        error: result.error === 'not_found' ? 'Nota non trovata' : 'Dati non validi',
        code: result.error,
      });
    }
    return res.json(result);
  },
);

app.post(
  '/api/staff/reception-notes/:id/complete',
  rateLimit({ windowMs: 60_000, max: 60 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = setReceptionNoteStatus(id, 'done', req.staffUser?.staffName);
    if (!result.ok) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }
    return res.json(result);
  },
);

app.post(
  '/api/staff/reception-notes/:id/reopen',
  rateLimit({ windowMs: 60_000, max: 60 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = setReceptionNoteStatus(id, 'open', req.staffUser?.staffName);
    if (!result.ok) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }
    return res.json(result);
  },
);

app.delete(
  '/api/staff/reception-notes/:id',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = deleteReceptionNote(id);
    if (!result.ok) {
      return res.status(404).json({ error: 'Nota non trovata' });
    }
    return res.json(result);
  },
);

app.get(
  '/api/staff/blacklist',
  rateLimit({ windowMs: 60_000, max: 60 }),
  requireStaff,
  (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 80);
    const payload = listBlacklist({ q });
    res.setHeader('Cache-Control', 'no-store');
    return res.json(payload);
  },
);

app.post(
  '/api/staff/blacklist',
  rateLimit({ windowMs: 60_000, max: 30 }),
  requireStaff,
  (req, res) => {
    const guestName = String(req.body?.guestName || req.body?.name || '').trim();
    const notes = String(req.body?.notes || '').trim().slice(0, 2000);
    const checkinId = req.body?.checkinId ?? req.body?.checkin_id ?? null;
    const result = addToBlacklist({
      guestName,
      notes,
      checkinId,
      staffName: req.staffUser?.staffName,
    });
    if (!result.ok) {
      return res.status(400).json({
        error: result.error === 'name_required' ? 'Nome obbligatorio' : 'Dati non validi',
        code: result.error,
      });
    }
    return res.json(result);
  },
);

app.post(
  '/api/staff/checkins/:id/blacklist',
  rateLimit({ windowMs: 60_000, max: 30 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const notes = String(req.body?.notes || '').trim().slice(0, 2000);
    const result = addCheckinToBlacklist(id, notes, req.staffUser?.staffName);
    if (!result.ok) {
      const status =
        result.error === 'not_found'
          ? 404
          : result.error === 'name_required'
            ? 400
            : 400;
      return res.status(status).json({
        error:
          result.error === 'not_found'
            ? 'Check-in non trovato'
            : result.error === 'name_required'
              ? 'Nome ospite mancante'
              : 'Dati non validi',
        code: result.error,
      });
    }
    return res.json(result);
  },
);

app.patch(
  '/api/staff/blacklist/:id',
  rateLimit({ windowMs: 60_000, max: 40 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const notes = String(req.body?.notes || '').trim().slice(0, 2000);
    const result = updateBlacklistNotes(id, notes, req.staffUser?.staffName);
    if (!result.ok) {
      return res.status(404).json({ error: 'Voce non trovata' });
    }
    return res.json(result.entry);
  },
);

app.delete(
  '/api/staff/blacklist/:id',
  rateLimit({ windowMs: 60_000, max: 30 }),
  requireStaff,
  (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      return res.status(400).json({ error: 'Id non valido' });
    }
    const result = removeFromBlacklist(id);
    if (!result.ok) {
      return res.status(404).json({ error: 'Voce non trovata' });
    }
    return res.json({ ok: true });
  },
);

app.post(
  '/api/cron/daily-report',
  rateLimit({ windowMs: 60_000, max: 10 }),
  async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  try {
    const result = await runDailyReport({ force: true });
    return res.json(publicReportSummary(result));
  } catch (err) {
    console.error('Errore report giornaliero:', err);
    return res.status(500).json({ error: 'Errore report' });
  }
});

app.post(
  '/api/cron/monthly-staff-report',
  rateLimit({ windowMs: 60_000, max: 10 }),
  async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  try {
    const force =
      String(req.query.force || '').trim() === '1' ||
      req.body?.force === true;
    const result = await runMonthlyStaffReport({ force });
    return res.json(publicReportSummary(result));
  } catch (err) {
    console.error('Errore report mensile:', err);
    return res.status(500).json({ error: 'Errore report mensile' });
  }
});

cron.schedule(
  '0 0 * * *',
  async () => {
    console.log(`[cron] Report notturno ${HOTEL_NAME}…`);
    try {
      const result = await runDailyReport();
      if (result.sent) {
        const channels = [
          result.email?.sent ? `email→${result.email.to}` : null,
          result.whatsapp?.sent ? `whatsapp→${result.whatsapp.to}` : null,
        ]
          .filter(Boolean)
          .join(', ');
        console.log(
          `[cron] Inviato report (${result.count} contatti) ${channels || result.to}`,
        );
        if (result.partialErrors?.length) {
          console.warn('[cron] Canali parziali:', result.partialErrors.join('; '));
        }
      } else {
        console.log(`[cron] Nessun nuovo contatto — report non inviato`);
      }
    } catch (err) {
      console.error('[cron] Fallito:', err.message || err);
    }
  },
  { timezone: CRON_TZ },
);

cron.schedule(
  '5 0 1 * *',
  async () => {
    console.log(`[cron] Report mensile staff (1° del mese)…`);
    try {
      const result = await runMonthlyStaffReport();
      if (result.sent) {
        console.log(
          `[cron] Report mensile inviato (${result.count} anagrafiche, ${result.staff} staff, ${result.yearMonth}) → ${result.to}`,
        );
      } else {
        console.log(`[cron] Report mensile saltato: ${result.reason}`);
      }
    } catch (err) {
      console.error('[cron] Report mensile fallito:', err.message || err);
    }
  },
  { timezone: CRON_TZ },
);

app.listen(PORT, async () => {
  console.log(`${HOTEL_NAME} check-in attivo su http://localhost:${PORT}`);
  console.log(
    `Cron report: 00:00 ${CRON_TZ} → email ${process.env.REPORT_EMAIL || '(off)'} | whatsapp ${whatsappConfigured() ? 'on' : 'off'}`,
  );
  console.log(`Cron staff: 00:05 il 1° del mese (${CRON_TZ}) → mese precedente`);
  console.log(
    `[staff] Dashboard /staff ${staffAuthConfigured() ? 'attiva' : 'NON configurata — imposta STAFF_PIN_* su Render'}`,
  );
  await restoreCheckinsBackupIfNeeded();
  try {
    const purged = purgeCheckinsOlderThan24Hours();
    if (purged > 0) {
      console.log(`[GDPR] Boot purge: wipe PII 24h, rimossi ${purged} unstarred >7g`);
      void syncCheckinsBackup('gdpr-purge');
    }
  } catch (err) {
    console.error('[GDPR] Boot purge failed:', err.message || err);
  }
});
