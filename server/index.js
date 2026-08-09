import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
} from './db.js';
import { runDailyReport, runMonthlyStaffReport } from './mail.js';
import {
  verifyCopyBroadcastQuery,
  buildCopyBroadcastPage,
} from './report.js';
import {
  sendWelcomeEmail,
  buildCouponRedeemPage,
  buildCouponClaimPage,
  buildCouponQrPng,
} from './coupon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const PORT = Number(process.env.PORT || 3000);
const HOTEL_NAME = process.env.HOTEL_NAME || 'Hotel Canal';
const CRON_TZ = process.env.CRON_TZ || 'Europe/Rome';
const CRON_SECRET = process.env.CRON_SECRET || '';
const DATABASE_PATH =
  process.env.DATABASE_PATH || path.join(rootDir, 'data', 'checkins.db');

initDb(DATABASE_PATH);

const app = express();
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.static(path.join(rootDir, 'public')));

const REPORT_TRIGGER_TOKEN = 'grandcanalhotel';
const PHONE_REGEX = /^(\+|00)?[0-9]{7,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function isManualReportTrigger({ phone, guestName, roomNumber, firstName, lastName }) {
  const fields = [phone, roomNumber];
  if (firstName || lastName) {
    fields.push(firstName, lastName);
  } else {
    fields.push(guestName);
  }
  return fields.every((v) => normalizeField(v) === REPORT_TRIGGER_TOKEN);
}

function isAuthorizedCron(req) {
  if (!CRON_SECRET) return false;
  const header = req.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
  const querySecret = req.query.secret;
  return bearer === CRON_SECRET || querySecret === CRON_SECRET;
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    hotel: HOTEL_NAME,
    tz: CRON_TZ,
  });
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
        roomNumber: roomNumberRaw,
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

    // Coupon in mail solo se richiesto + stanza + receptionist
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

app.post('/api/checkins', handleCheckin);
app.post('/api/save-lead', handleCheckin);

/** Micro-pagina per "Copia tutti" nella mail report (clipboard via browser). */
app.get('/api/copy-broadcast', (req, res) => {
  const phones = verifyCopyBroadcastQuery(req.query.d, req.query.s);
  if (!phones) {
    return res
      .status(400)
      .type('html')
      .send(
        `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:48px;color:#C62828;">Link non valido o scaduto.</body></html>`,
      );
  }
  if (!String(phones).trim()) {
    return res
      .status(404)
      .type('html')
      .send(
        `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;text-align:center;padding:48px;color:#C62828;">Nessun numero da copiare.</body></html>`,
      );
  }
  res.type('html').send(buildCopyBroadcastPage(phones));
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
        console.log(
          `[cron] Inviato report (${result.count} contatti) a ${result.to}`,
        );
      } else {
        console.log(`[cron] Nessun nuovo contatto — mail non inviata`);
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

app.listen(PORT, () => {
  console.log(`${HOTEL_NAME} check-in attivo su http://localhost:${PORT}`);
  console.log(
    `Cron report: 00:00 ${CRON_TZ} → ${process.env.REPORT_EMAIL || '(REPORT_EMAIL non impostata)'}`,
  );
  console.log(`Cron staff: 23:59 ultimo giorno del mese (${CRON_TZ})`);
});
