/**
 * Backup durable dei check-in + rollup staff mensile su GitHub Gist.
 * Su Render free il filesystem è effimero: al boot ripristiniamo se il DB è vuoto.
 * staff_month_stats deve essere nel backup: i PII spariscono dopo checkout + 7 giorni (GDPR)
 * ma il report mensile legge solo il rollup.
 */

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function configured() {
  return Boolean(
    env('CHECKIN_BACKUP_GIST_ID').trim() &&
      env('CHECKIN_BACKUP_GITHUB_TOKEN').trim(),
  );
}

async function gistRequest(method, path, body) {
  const token = env('CHECKIN_BACKUP_GITHUB_TOKEN').trim();
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'hotel-canal-checkin',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || text || res.statusText;
    throw new Error(`Gist ${method} ${path} → ${res.status}: ${msg}`);
  }
  return data;
}

function pickGistJsonFile(gist) {
  const files = gist?.files || {};
  if (files['checkins.json']) return 'checkins.json';
  const names = Object.keys(files);
  const json = names.find((n) => n.endsWith('.json'));
  return json || names[0] || 'checkins.json';
}

export function isBackupConfigured() {
  return configured();
}

/**
 * @param {object[]} checkins
 * @param {object[]} [staffMonthStats]
 */
export async function pushCheckinsBackup(checkins, staffMonthStats = []) {
  if (!configured()) return { skipped: true };
  const gistId = env('CHECKIN_BACKUP_GIST_ID').trim();
  const payload = {
    version: 2,
    updatedAt: new Date().toISOString(),
    checkins,
    staffMonthStats: Array.isArray(staffMonthStats) ? staffMonthStats : [],
  };
  const gist = await gistRequest('GET', `/gists/${gistId}`);
  const filename = pickGistJsonFile(gist);
  await gistRequest('PATCH', `/gists/${gistId}`, {
    files: {
      [filename]: {
        content: JSON.stringify(payload, null, 2),
        filename: 'checkins.json',
      },
    },
  });
  return {
    ok: true,
    count: checkins.length,
    staffMonths: payload.staffMonthStats.length,
  };
}

/**
 * @returns {Promise<{ checkins: object[], staffMonthStats: object[] } | null>}
 */
export async function pullCheckinsBackup() {
  if (!configured()) return null;
  const gistId = env('CHECKIN_BACKUP_GIST_ID').trim();
  const gist = await gistRequest('GET', `/gists/${gistId}`);
  const filename = pickGistJsonFile(gist);
  const file = gist.files?.[filename];
  if (!file) return null;
  let content = file.content;
  if (!content && file.raw_url) {
    const raw = await fetch(file.raw_url, {
      headers: {
        Authorization: `Bearer ${env('CHECKIN_BACKUP_GITHUB_TOKEN').trim()}`,
        'User-Agent': 'hotel-canal-checkin',
      },
    });
    content = await raw.text();
  }
  if (!content) return null;
  const data = JSON.parse(content);
  if (Array.isArray(data)) {
    return { checkins: data, staffMonthStats: [] };
  }
  return {
    checkins: Array.isArray(data?.checkins) ? data.checkins : [],
    staffMonthStats: Array.isArray(data?.staffMonthStats)
      ? data.staffMonthStats
      : [],
  };
}
