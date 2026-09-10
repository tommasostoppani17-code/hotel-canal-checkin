/**
 * Lab segreto Riva OS su checkin-hotelcanal.it
 * — / resta check-in Canal pubblico (invariato)
 * — /lab hub protetto (codice o sessione staff)
 * — /hk /colazione /ospiti raggiungibili dopo unlock (noindex)
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const COOKIE = 'riva_lab';
const MAX_AGE_SEC = 7 * 24 * 60 * 60;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const RIVA_PAGES = new Set([
  '/hk',
  '/hk.html',
  '/colazione',
  '/colazione.html',
  '/colazioni',
  '/ospiti',
  '/ospiti.html',
  '/guest',
]);

function labSecret() {
  return String(process.env.RIVA_LAB_SECRET || '').trim();
}

function cookieSecret() {
  const lab = labSecret();
  if (lab) return lab;
  return String(process.env.CRON_SECRET || 'dev-lab-only').trim();
}

function signToken() {
  const day = Math.floor(Date.now() / 86_400_000);
  return crypto
    .createHmac('sha256', cookieSecret())
    .update(`riva-lab:${day}`)
    .digest('hex')
    .slice(0, 32);
}

function verifyToken(token) {
  const t = String(token || '').trim();
  if (!t) return false;
  if (t === signToken()) return true;
  const yesterday = crypto
    .createHmac('sha256', cookieSecret())
    .update(`riva-lab:${Math.floor(Date.now() / 86_400_000) - 1}`)
    .digest('hex')
    .slice(0, 32);
  return t === yesterday;
}

function parseCookies(req) {
  const raw = String(req.headers.cookie || '');
  const out = {};
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = decodeURIComponent(part.slice(i + 1).trim());
    if (k) out[k] = v;
  }
  return out;
}

function noindex(res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'no-store');
}

function setLabCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${encodeURIComponent(signToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`,
  );
}

function clearLabCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {import('express').Request} req
 * @param {{ hasStaffSession?: (req: import('express').Request) => boolean }} opts
 */
export function hasLabAccess(req, opts = {}) {
  const secret = labSecret();
  const q = String(req.query?.k || '').trim();
  if (secret && q === secret) return true;
  const cookies = parseCookies(req);
  if (verifyToken(cookies[COOKIE])) return true;
  if (typeof opts.hasStaffSession === 'function' && opts.hasStaffSession(req)) {
    return true;
  }
  /* Dev senza secret: aperto. Prod senza secret: solo staff session (sopra). */
  if (!secret && process.env.NODE_ENV !== 'production') return true;
  return false;
}

function unlockGateHtml(errorMsg) {
  const err = errorMsg
    ? `<p class="err">${escapeHtml(errorMsg)}</p>`
    : '';
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>Lab</title>
  <style>
    :root { --ink:#124453; --muted:#6b8494; --line:#dfe5ea; --err:#c62828; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100dvh; display:grid; place-items:center; padding:24px;
      font-family: Montserrat, ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: linear-gradient(165deg, #eef5f9 0%, #e4eef3 100%); color: var(--ink); }
    form { width:min(100%, 360px); background:#fff; border:1px solid var(--line); border-radius:16px; padding:28px 24px; }
    h1 { margin:0 0 6px; font-size:1.15rem; font-weight:700; letter-spacing:-0.02em; }
    p { margin:0 0 18px; font-size:0.9rem; color:var(--muted); line-height:1.4; }
    label { display:block; font-size:0.75rem; font-weight:600; margin-bottom:6px; }
    input { width:100%; font-size:1rem; padding:12px 14px; border:1px solid var(--line); border-radius:10px; margin-bottom:14px; }
    button { width:100%; font-size:1rem; font-weight:600; padding:12px; border:0; border-radius:10px; background:#124453; color:#fff; cursor:pointer; }
    .err { color:var(--err); font-size:0.85rem; margin:-6px 0 12px; }
    .hint { margin:14px 0 0; font-size:0.75rem; color:var(--muted); }
  </style>
</head>
<body>
  <form method="post" action="/lab/unlock" autocomplete="off">
    <h1>Riva OS Lab</h1>
    <p>Prove interne. Il check-in ospiti Canal su <strong>/</strong> non cambia.</p>
    ${err}
    <label for="k">Codice lab</label>
    <input id="k" name="k" type="password" enterkeyhint="go" required autofocus>
    <button type="submit">Entra</button>
    <p class="hint">Oppure accedi prima a /staff con PIN reception, poi torna qui.</p>
  </form>
</body>
</html>`;
}

function hubHtml() {
  const links = [
    { href: '/hk', title: 'Housekeeping', sub: 'Piani · camere · mobile' },
    { href: '/colazione', title: 'Colazioni', sub: 'Sala · toggle ingresso' },
    { href: '/ospiti', title: 'Area ospiti', sub: 'Wi‑Fi · porte · segnalazioni' },
    { href: '/staff', title: 'Staff reception', sub: 'Dashboard (già in uso)' },
    { href: '/lab/devices', title: '20 viewport', sub: 'iPhone / iPad / desktop' },
  ];
  const items = links
    .map(
      (l) =>
        `<a class="row" href="${escapeHtml(l.href)}"><span class="t">${escapeHtml(l.title)}</span><span class="s">${escapeHtml(l.sub)}</span></a>`,
    )
    .join('');
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <title>Riva OS Lab</title>
  <style>
    :root { --ink:#124453; --muted:#6b8494; --line:#dfe5ea; }
    * { box-sizing: border-box; }
    body { margin:0; min-height:100dvh; padding: max(20px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom));
      font-family: Montserrat, ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: linear-gradient(165deg, #eef5f9 0%, #e4eef3 100%); color: var(--ink); }
    .wrap { width:min(100%, 420px); margin:0 auto; }
    h1 { margin:8px 0 4px; font-size:1.35rem; font-weight:700; letter-spacing:-0.03em; }
    .lead { margin:0 0 20px; font-size:0.9rem; color:var(--muted); line-height:1.45; }
    .card { background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; }
    .row { display:flex; flex-direction:column; gap:2px; padding:16px 18px; text-decoration:none; color:inherit; border-bottom:1px solid var(--line); -webkit-tap-highlight-color:transparent; }
    .row:last-child { border-bottom:0; }
    .row:active { background:#f4f8fa; }
    .t { font-weight:650; font-size:0.98rem; }
    .s { font-size:0.8rem; color:var(--muted); }
    .foot { margin:16px 0 0; font-size:0.75rem; color:var(--muted); line-height:1.4; }
    .foot a { color:inherit; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Riva OS Lab</h1>
    <p class="lead">Sezioni segrete per iPhone / iPad. Ospiti Canal: solo <strong>https://checkin-hotelcanal.it/</strong>.</p>
    <div class="card">${items}</div>
    <p class="foot"><a href="/lab/logout">Esci dal lab</a> · non condividere il codice</p>
  </div>
</body>
</html>`;
}

function normalizePath(p) {
  return String(p || '')
    .toLowerCase()
    .replace(/\/+$/, '') || '/';
}

function isRivaPagePath(pathname) {
  const p = normalizePath(pathname);
  if (RIVA_PAGES.has(p)) return true;
  if (p.startsWith('/lab/devices')) return true;
  return false;
}

/**
 * @param {import('express').Express} app
 * @param {{ hasStaffSession: (req: import('express').Request) => boolean }} opts
 */
export function mountLab(app, opts) {
  const hasStaffSession = opts.hasStaffSession;

  app.use((req, res, next) => {
    if (String(process.env.RIVA_LAB_GUARD || '1').trim() === '0') {
      return next();
    }
    if (!isRivaPagePath(req.path)) return next();
    if (hasLabAccess(req, { hasStaffSession })) return next();
    noindex(res);
    if (req.accepts('html')) {
      return res.status(401).type('html').send(unlockGateHtml('Serve accesso lab.'));
    }
    return res.status(401).json({ error: 'lab_required' });
  });

  app.get(['/lab', '/lab/'], (req, res) => {
    noindex(res);
    const secret = labSecret();
    if (secret && String(req.query.k || '') === secret) {
      setLabCookie(res);
      return res.redirect(302, '/lab');
    }
    if (!hasLabAccess(req, { hasStaffSession })) {
      return res.type('html').send(unlockGateHtml());
    }
    /* Staff già loggato senza cookie lab: emetti cookie per le altre pagine. */
    if (!verifyToken(parseCookies(req)[COOKIE])) {
      setLabCookie(res);
    }
    return res.type('html').send(hubHtml());
  });

  app.post('/lab/unlock', (req, res) => {
    noindex(res);
    const secret = labSecret();
    const k = String(req.body?.k || req.query?.k || '').trim();
    if (!secret) {
      if (hasStaffSession(req)) {
        setLabCookie(res);
        return res.redirect(302, '/lab');
      }
      if (process.env.NODE_ENV === 'production') {
        return res
          .status(503)
          .type('html')
          .send(unlockGateHtml('Lab non configurato (manca RIVA_LAB_SECRET).'));
      }
      setLabCookie(res);
      return res.redirect(302, '/lab');
    }
    if (k !== secret) {
      return res.status(401).type('html').send(unlockGateHtml('Codice non valido.'));
    }
    setLabCookie(res);
    return res.redirect(302, '/lab');
  });

  app.get('/lab/logout', (_req, res) => {
    noindex(res);
    clearLabCookie(res);
    return res.redirect(302, '/lab');
  });

  app.get('/lab/go/:target', (req, res) => {
    noindex(res);
    if (!hasLabAccess(req, { hasStaffSession })) {
      return res.redirect(302, '/lab');
    }
    const map = {
      hk: '/hk',
      colazione: '/colazione',
      ospiti: '/ospiti',
      staff: '/staff',
      devices: '/lab/devices',
    };
    const dest = map[String(req.params.target || '').toLowerCase()];
    if (!dest) return res.redirect(302, '/lab');
    return res.redirect(302, dest);
  });
}

export { rootDir };
