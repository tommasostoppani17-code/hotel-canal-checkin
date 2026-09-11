/**
 * Riva OS — PWA boot (Service Worker + install readiness).
 * Incluso da staff / staff124. Non tocca le API.
 */
(function registerRivaPwa() {
  try {
    var standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
    if (standalone) {
      var html = document.documentElement;
      html.classList.add('is-pwa-standalone');
      var touch =
        (window.matchMedia &&
          (window.matchMedia('(pointer: coarse)').matches ||
            window.matchMedia('(hover: none)').matches)) ||
        (navigator.maxTouchPoints > 0);
      if (touch) html.classList.add('is-pwa-touch');
      var sw = Math.min(window.screen && window.screen.width || 0, window.screen && window.screen.height || 0);
      var iw = window.innerWidth || 0;
      var spoofDesktop = sw > 0 && iw > sw + 80;
      var phoneScreen = sw > 0 && sw <= 520;
      if (touch && (spoofDesktop || phoneScreen)) {
        html.classList.add('is-pwa-phone');
      }
      /* VH reale: con Request Desktop Site innerHeight mente; usa visualViewport/screen */
      var syncPhoneVh = function () {
        if (!html.classList.contains('is-pwa-phone')) return;
        var vv = window.visualViewport;
        var h = Math.round((vv && vv.height) || window.innerHeight || sw || 640);
        h = Math.max(280, Math.min(h, Math.round(window.screen && window.screen.height || h)));
        html.style.setProperty('--app-vh', h + 'px');
      };
      syncPhoneVh();
      window.addEventListener('resize', syncPhoneVh, { passive: true });
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', syncPhoneVh, { passive: true });
      }
    }
  } catch (_) { /* ignore */ }

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
      .register('/sw.js?v=182', { scope: '/' })
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
      .catch(() => { /* SW opzionale */ });
  };

  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
})();
