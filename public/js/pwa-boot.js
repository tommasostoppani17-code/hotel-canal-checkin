/**
 * Riva OS — PWA boot (Service Worker + install readiness).
 * Incluso da staff.html / pagine dashboard. Non tocca le API.
 */
(function registerRivaPwa() {
  // Manifest tenant-aware: /h/{slug}/staff-manifest.webmanifest
  try {
    const link = document.getElementById('rivaManifestLink');
    const base = window.__TENANT_BASE__;
    if (link && base) {
      link.setAttribute('href', `${base}/staff-manifest.webmanifest`);
    }
  } catch (_) { /* ignore */ }

  if (!('serviceWorker' in navigator)) return;

  const host = String(location.hostname || '');
  const isLocal =
    host === 'localhost'
    || host === '127.0.0.1'
    || host === '0.0.0.0'
    || host.endsWith('.local');
  /* Tunnel di sviluppo: stesso problema dello SW che nasconde i CSS nuovi. */
  const isDevTunnel =
    host.includes('trycloudflare.com')
    || host.includes('ngrok')
    || host.includes('loca.lt')
    || host.includes('cloudflare.com');

  const wipeSwAndCaches = async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    } catch (_) { /* ignore */ }
    try {
      if (window.caches?.keys) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) { /* ignore */ }
  };

  // In locale / tunnel lo SW fa flash di CSS vecchi: spegni tutto.
  if (isLocal || isDevTunnel) {
    wipeSwAndCaches();
    return;
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js?v=181', { scope: '/' })
      .then((reg) => {
        try { reg.update(); } catch (_) { /* ignore */ }
        if (reg.waiting) {
          reg.waiting.postMessage('SKIP_WAITING');
        }
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) {
              worker.postMessage('SKIP_WAITING');
            }
          });
        });
      })
      .catch(() => {
        /* SW opzionale */
      });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
})();
