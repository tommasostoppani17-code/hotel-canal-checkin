/**
 * Alert ops minimi — webhook opzionale (Slack/Discord/Telegram bridge).
 * MONITOR_WEBHOOK_URL=https://…  (POST JSON)
 */

function env(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

export function monitorWebhookConfigured() {
  return Boolean(env('MONITOR_WEBHOOK_URL'));
}

/**
 * @param {string} event  es. report_failed | ready_blockers | cron_error
 * @param {Record<string, unknown>} detail
 */
export async function notifyMonitor(event, detail = {}) {
  const url = env('MONITOR_WEBHOOK_URL');
  if (!url) return { sent: false, reason: 'not_configured' };

  const payload = {
    source: 'riva-os',
    hotel: env('HOTEL_NAME', 'Hotel Canal'),
    event: String(event || 'event').slice(0, 80),
    detail,
    ts: new Date().toISOString(),
    publicUrl: env('PUBLIC_URL'),
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'RivaOS-Monitor/1' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      console.warn(`[monitor] webhook HTTP ${res.status}`);
      return { sent: false, reason: `http_${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    console.warn('[monitor] webhook failed:', err.message || err);
    return { sent: false, reason: err.message || 'fetch_failed' };
  }
}
