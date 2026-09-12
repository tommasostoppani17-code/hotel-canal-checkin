/**
 * Riva OS — PWA boot (Service Worker + install readiness).
 * Incluso da staff / staff124. Non tocca le API.
 */
(function registerRivaPwa() {
  try {
    var html = document.documentElement;
    var standalone =
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;
    if (standalone) html.classList.add('is-pwa-standalone');

    /*
     * Touch “vero” = pointer coarse / no-hover / iOS.
     * NON usare maxTouchPoints da solo: su Windows PWA desktop attiva layout
     * touch e spezza scroll/tap.
     */
    var ua = String(navigator.userAgent || '');
    var ios =
      /iPhone|iPad|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var coarse =
      window.matchMedia &&
      (window.matchMedia('(pointer: coarse)').matches ||
        window.matchMedia('(hover: none)').matches);
    var touch = Boolean(coarse || ios);
    if (touch) html.classList.add('is-pwa-touch');

    var sw = Math.min(window.screen && window.screen.width || 0, window.screen && window.screen.height || 0);
    var iw = window.innerWidth || 0;
    var spoofDesktop = sw > 0 && iw > sw + 60;
    var phoneOrTabletScreen = sw > 0 && sw <= 920;
    var desktopViewport =
      iw >= 1025 ||
      (sw > 0 && Math.max(window.screen.width || 0, window.screen.height || 0) >= 1100);
    /* Richiedi sito desktop su iPhone/iPad (Safari o Home): forza layout phone */
    if (standalone && desktopViewport) {
      html.classList.remove('is-pwa-phone');
    } else if (
      touch &&
      (spoofDesktop ||
        (standalone && sw <= 520) ||
        (spoofDesktop && phoneOrTabletScreen) ||
        (ios && phoneOrTabletScreen && iw >= 768))
    ) {
      html.classList.add('is-pwa-phone');
    }

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
      .register('/sw.js?v=187', { scope: '/' })
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
