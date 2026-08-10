import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
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
  updateCheckinCouponToken,
  exportAllCheckins,
  importCheckinsIfEmpty,
  countCheckins,
  setTableBooking,
  getCheckinById,
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

/** Token report manuale: solo se impostato in env (niente hardcoded in prod). */
const REPORT_TRIGGER_TOKEN = String(process.env.REPORT_TRIGGER_TOKEN || '')
  .trim()
  .toLowerCase();

function assertProductionSecrets() {
  if (!IS_PROD) return;
  const cron = String(process.env.CRON_SECRET || '').trim();
  const guest = String(process.env.GUEST_ACCESS_SECRET || '').trim();
  const coupon = String(process.env.COUPON_SECRET || cron).trim();
  const weak = (s) =>
    !s ||
    s.length < 24 ||
    /change-me|dev-only|hotel-canal-dev/i.test(s);

  if (!cron) {
    throw new Error('CRON_SECRET obbligatorio in produzione');
  }
  if (weak(cron) || weak(guest) || weak(coupon)) {
    console.warn(
      '[security] Segreti deboli o corti: genera CRON_SECRET / GUEST_ACCESS_SECRET / COUPON_SECRET ≥24 char random',
    );
  }
}

assertProductionSecrets();

initDb(DATABASE_PATH);

async function syncCheckinsBackup(reason = 'update') {
  if (!isBackupConfigured()) return;
  try {
    const rows = exportAllCheckins();
    await pushCheckinsBackup(rows);
    console.log(`[backup] synced ${rows.length} checkins (${reason})`);
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
    if (countCheckins() > 0) {
      console.log(`[backup] db locale ok (${countCheckins()} checkins)`);
      return;
    }
    const rows = await pullCheckinsBackup();
    const n = importCheckinsIfEmpty(rows || []);
    console.log(`[backup] ripristinati ${n} checkins da Gist`);
  } catch (err) {
    console.error('[backup] restore failed:', err.message || err);
  }
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));

/** Rate limit semplice in-memory (anti-spam check-in / booking). */
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
      return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' });
    }
    return next();
  };
}

// Pulizia periodica bucket
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (now - bucket.start > 5 * 60_000) rateBuckets.delete(key);
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
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
    ].join('; '),
  );
  const proto = String(req.get('x-forwarded-proto') || req.protocol || '');
  if (proto === 'https') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
  }
  next();
});

// Cache lunga su asset email: i proxy Gmail/Apple rifetchano spesso
app.use(
  '/email',
  express.static(path.join(rootDir, 'public', 'email'), {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    setHeaders(res) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      res.setHeader('Access-Control-Allow-Origin', '*');
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

app.use(express.static(path.join(rootDir, 'public')));

const PHONE_REGEX = /^(\+|00)?[0-9]{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUEST_ACCESS_TTL_SEC = 60 * 60 * 72; // 72h dopo check-in

function guestAccessSecret() {
  const secret = String(
    process.env.GUEST_ACCESS_SECRET || process.env.CRON_SECRET || '',
  ).trim();
  if (secret) return secret;
  if (IS_PROD) {
    throw new Error('GUEST_ACCESS_SECRET o CRON_SECRET obbligatorio in produzione');
  }
  return 'dev-only-change-me';
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
  return String(req.query.token || req.get('x-guest-token') || '').trim();
}

function buildGuestServicesPayload() {
  let doorMain = String(process.env.DOOR_CODE_WALTER || '').trim();
  if (doorMain && !doorMain.endsWith('#')) doorMain = `${doorMain}#`;
  const doorInner = String(process.env.DOOR_CODE_AIRONE || '').trim();
  return {
    wifiSsid: String(process.env.WIFI_SSID || 'hotel canal').trim() || 'hotel canal',
    wifiPassword: String(process.env.WIFI_PASSWORD || '').trim(),
    doorMain,
    doorInner,
    trattoriaPhone: String(process.env.TRATTORIA_PHONE || '+393282464972').trim(),
    trattoriaPhoneDisplay: String(
      process.env.TRATTORIA_PHONE_DISPLAY || '328 246 4972',
    ).trim(),
  };
}

/** Nome receptionist a testo libero (maiuscolo, spazi normalizzati). */
function normalizeReceptionist(raw) {
  const key = String(raw || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
  return key || null;
}

function cleanPhone(phone) {
  return String(phone || '').replace(/[\s\-\(\)\.]/g, '');
}

function normalizeField(value) {
  return String(value || '').trim().toLowerCase();
}

function toUpperOrNull(value) {
  const trimmed = String(value || '').trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function normalizeEmail(value) {
  const trimmed = String(value || '').trim().toLowerCase();
  return trimmed || null;
}

function isValidPhone(cleaned) {
  return PHONE_REGEX.test(cleaned);
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
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
  const querySecret = String(req.query.secret || '');
  return (
    timingSafeEqualStr(bearer, CRON_SECRET) ||
    timingSafeEqualStr(querySecret, CRON_SECRET)
  );
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    hotel: HOTEL_NAME,
    tz: CRON_TZ,
  });
});

/** Wi-Fi + codici porta: solo con token emesso al check-in riuscito. */
app.get('/api/guest-services', (req, res) => {
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

/** Checklist go-live (senza email/PII in chiaro). Auth opzionale via CRON_SECRET. */
app.get('/api/ready', (req, res) => {
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
    blockers.push(
      'Verifica dominio su Resend e imposta SMTP_FROM tipo Welcome <checkin@hotelcanal.com>',
    );
  }
  if (!reportEmail && !whatsappReady) {
    blockers.push(
      'Imposta REPORT_EMAIL (mail Canal) e/o WhatsApp Payel (TWILIO_* + WHATSAPP_PAYEL)',
    );
  }
  if (!dataReady) {
    blockers.push('Aggiungi disco Render su /var/data oppure backup Gist');
  }
  const staffView = isAuthorizedCron(req);
  res.json({
    ok: blockers.length === 0,
    hotel: HOTEL_NAME,
    publicUrl: process.env.PUBLIC_URL || null,
    checkins: staffView ? countCheckins() : undefined,
    reportEmailConfigured: Boolean(reportEmail),
    reportEmail: staffView ? reportEmail || null : undefined,
    smtpFromDev: usingDevFrom,
    guestEmailReady,
    reportReady,
    whatsappReady,
    dataReady,
    backupConfigured: backupOk,
    persistentDisk: onPersistentDisk,
    blockers,
  });
});

/** CSV temporaneo per Twilio mediaUrl (token monouso a tempo, senza auth). */
app.get('/api/reports/whatsapp-csv/:token', (req, res) => {
  const item = getCsvMedia(req.params.token);
  if (!item) {
    return res.status(404).type('text/plain').send('CSV non trovato o scaduto');
  }
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
      'inline; filename="hotel-canal-reception-poster-a4.pdf"',
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
 * Auth: ?secret=CRON_SECRET
 */
app.get('/api/send-poster', async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).type('html').send(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:48px;color:#C62828;">Unauthorized.</body></html>`,
    );
  }

  try {
    const result = await sendPosterEmail({
      to: typeof req.query.to === 'string' ? req.query.to : undefined,
    });
    const safeTo = String(result.to || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return res.type('html').send(
      `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:48px;color:#124453;">
        <h2 style="margin:0 0 12px;">A4 PDF poster sent</h2>
        <p style="margin:0;color:#64748B;">To: <strong style="color:#124453;">${safeTo}</strong> · ~${result.pdfKb} KB</p>
        <p style="margin:16px 0 0;font-size:13px;color:#8E8E93;">Also available at <a href="/poster-a4.pdf" style="color:#124453;">/poster-a4.pdf</a></p>
      </body></html>`,
    );
  } catch (err) {
    console.error('Invio poster:', err);
    return res
      .status(500)
      .type('html')
      .send(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:48px;color:#C62828;">Poster send error: ${String(err.message || err).replace(/</g, '')}</body></html>`,
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
  const receptionist =
    normalizeReceptionist(req.body?.receptionist || req.body?.staff || '') ||
    'TOMMASO';

  if (!roomNumber) {
    return res.status(400).type('html').send(
      buildCouponClaimPage({
        token,
        guestName: row.guest_name,
        error: 'Inserisci il numero di stanza.',
      }),
    );
  }

  const redeemToken = createCouponToken({
    id: payload?.id,
    email: row.email || payload?.e || '',
    guestName: row.guest_name || payload?.g || '',
    phone: row.phone || payload?.p || '',
    guestsCount: row.guests_count ?? payload?.n ?? 2,
    roomNumber,
    receptionist,
  });

  if (row.id) {
    updateCheckinCouponDetails(row.id, { roomNumber, receptionist });
    updateCheckinCouponToken(row.id, redeemToken);
    markCouponSent(row.id);
  } else {
    const phone = row.phone || payload?.p;
    if (phone) {
      const id = insertCheckin({
        phone,
        email: row.email || payload?.e || null,
        guestName: row.guest_name || payload?.g || null,
        roomNumber,
        receptionist,
        guestsCount: row.guests_count ?? payload?.n ?? 2,
        couponToken: redeemToken,
      });
      markCouponSent(id);
      void syncCheckinsBackup('coupon-claim');
    }
  }

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
        console.log('[manual-report]', result);
        return res.status(200).json({
          success: true,
          reportTriggered: true,
          ...result,
        });
      } catch (err) {
        console.error('Errore report manuale:', err);
        return res.status(500).json({
          error: err.message || 'Errore invio report',
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
    if (!includeCoupon) {
      roomNumber = null;
      receptionist = null;
    }

    const couponToken = createCouponToken({
      email,
      guestName,
      phone,
      guestsCount,
      roomNumber: includeCoupon ? roomNumber : null,
      receptionist: includeCoupon ? receptionist : null,
    });

    const id = insertCheckin({
      phone,
      email,
      guestName,
      roomNumber,
      receptionist,
      guestsCount,
      couponToken,
    });
    void syncCheckinsBackup('checkin');

    let welcomeSent = false;
    try {
      await sendWelcomeEmail({
        to: email,
        guestName,
        roomNumber,
        receptionist,
        guestsCount,
        token: couponToken,
        language: languageRaw,
        includeCoupon,
      });
      if (includeCoupon) markCouponSent(id);
      welcomeSent = true;
      console.log(
        `[welcome] Concierge email → ${email} · lang ${String(languageRaw || 'en').slice(0, 2)} · coupon ${includeCoupon ? 'yes' : 'claim-link'} · room ${roomNumber || '-'} · staff ${receptionist || '-'} · guests ${guestsCount}`,
      );
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
      couponToken,
      claimUrl: includeCoupon
        ? null
        : `${(process.env.PUBLIC_URL || '').replace(/\/$/, '')}/coupon/claim/${encodeURIComponent(couponToken)}`,
      receptionist: receptionist || null,
      guestsCount,
    });
  } catch (err) {
    console.error('Errore check-in:', err);
    return res.status(500).json({ error: 'Errore interno server' });
  }
}

app.post(
  '/api/checkins',
  rateLimit({ windowMs: 60_000, max: 20 }),
  handleCheckin,
);
app.post(
  '/api/save-lead',
  rateLimit({ windowMs: 60_000, max: 20 }),
  handleCheckin,
);

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
    const okTime =
      /^\d{2}:\d{2}$/.test(rawTime) ||
      /^(REQUESTED|CALL|TAVOLO)$/i.test(rawTime);
    if (!okTime) {
      return res.status(400).json({ error: 'Orario / richiesta non valida' });
    }

    const row = setTableBooking(id, rawTime, guestsRaw);
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
      channels,
      warning: anySent ? undefined : (errors.join(' | ') || 'Alert staff non inviato'),
    });
  } catch (err) {
    console.error('Errore table-booking:', err);
    return res.status(500).json({ error: 'Errore interno server' });
  }
});

app.post('/api/cron/daily-report', async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  try {
    const result = await runDailyReport({ force: true });
    return res.json(result);
  } catch (err) {
    console.error('Errore report giornaliero:', err);
    return res.status(500).json({ error: err.message || 'Errore report' });
  }
});

app.post('/api/cron/monthly-staff-report', async (req, res) => {
  if (!isAuthorizedCron(req)) {
    return res.status(401).json({ error: 'Non autorizzato' });
  }

  try {
    const result = await runMonthlyStaffReport({ force: true });
    return res.json(result);
  } catch (err) {
    console.error('Errore report mensile:', err);
    return res.status(500).json({ error: err.message || 'Errore report mensile' });
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
  '59 23 * * *',
  async () => {
    console.log(`[cron] Check report mensile staff…`);
    try {
      const result = await runMonthlyStaffReport();
      if (result.sent) {
        console.log(
          `[cron] Report mensile inviato (${result.count} anagrafiche, ${result.staff} staff) → ${result.to}`,
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
  console.log(`Cron staff: 23:59 ultimo giorno del mese (${CRON_TZ})`);
  await restoreCheckinsBackupIfNeeded();
});
