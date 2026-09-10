/**
 * Prefissa le chiamate /api/* (e asset tenant) con /h/{slug} quando la pagina
 * e servita sotto /h/:slug/...
 */
(function () {
  const match = String(location.pathname || '').match(/^\/h\/([^/]+)/i);
  if (!match) return;
  const slug = match[1];
  const base = '/h/' + encodeURIComponent(slug);
  window.__TENANT_SLUG__ = slug;
  window.__TENANT_BASE__ = base;

  const prefixes = [
    '/api/',
    '/qr-checkin.png',
    '/poster-a4.pdf',
    '/venice-guide.pdf',
    '/coupon/',
    '/paga/',
    '/uploads/',
    '/cartello-reception.html',
    '/qr-poster.html',
  ];

  function rewriteUrl(url) {
    const raw = String(url || '');
    if (!raw.startsWith('/')) return raw;
    if (raw.startsWith('/h/')) return raw;
    if (raw.startsWith('/admin')) return raw;
    if (raw.startsWith('/health')) return raw;
    for (const p of prefixes) {
      if (raw === p || raw.startsWith(p)) return base + raw;
    }
    return raw;
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    if (typeof input === 'string') {
      return originalFetch(rewriteUrl(input), init);
    }
    if (input && typeof input.url === 'string') {
      const next = rewriteUrl(input.url);
      if (next !== input.url) {
        return originalFetch(next, init || input);
      }
    }
    return originalFetch(input, init);
  };

  const originalOpen = window.open.bind(window);
  window.open = function (url, target, features) {
    return originalOpen(rewriteUrl(url), target, features);
  };

  function applyHotelBranding(hotel) {
    if (!hotel) return;
    window.__HOTEL__ = hotel;
    const isStaff = /\/staff(?:124)?(?:\.html)?\/?$/i.test(location.pathname);

    if (!isStaff && hotel.name) {
      const hotelLine = String(hotel.legalName || hotel.name || '').trim();
      const isOspiti = /\/ospiti(?:\.html)?\/?$/i.test(location.pathname);
      if (isOspiti) {
        document.title = (hotelLine || hotel.name) + ' · Ospiti';
      } else {
        document.title = 'Check-in — ' + hotel.name;
      }
      document
        .querySelectorAll(
          '#gateHotelName, #hotel-title, [data-hotel-name], .brand-hotel-name',
        )
        .forEach(function (el) {
          /* Non toccare il wordmark Riva (.riva-wordmark / .hotel-title staff) */
          if (el.closest && el.closest('.riva-wordmark')) return;
          if (el.classList && el.classList.contains('riva-wordmark')) return;
          el.textContent = hotelLine || hotel.name;
        });
      document.querySelectorAll('.hotel-subtitle, [data-hotel-city]').forEach(function (el) {
        if (hotel.city) el.textContent = hotel.city;
        else if (/venice|venezia|experience/i.test(el.textContent || '')) {
          el.textContent = hotel.name;
        }
      });
    }

    if (hotel.brandPrimary && !isStaff) {
      /* Accent tenant opzionale — il chrome Riva resta nero */
      document.documentElement.style.setProperty('--brand-primary', hotel.brandPrimary);
      document.documentElement.style.setProperty('--brand-accent', hotel.brandPrimary);
    }

    if (hotel.logoUrl) {
      document.querySelectorAll('[data-hotel-logo], #hotel-logo').forEach(function (img) {
        if (img.tagName === 'IMG') {
          img.src = hotel.logoUrl;
          img.alt = hotel.name || 'Logo';
          img.hidden = false;
        }
      });
    }

    const privacyEl = document.getElementById('privacy-text');
    if (privacyEl && hotel.privacyControllerText) {
      privacyEl.textContent = hotel.privacyControllerText;
    }

    const welcomeEl = document.getElementById('guest-welcome-text');
    if (welcomeEl && hotel.guestWelcomeText) {
      welcomeEl.textContent = hotel.guestWelcomeText;
    }

    /* Nascondi upsell partner se non configurato */
    if (!hotel.partnerRestaurant) {
      document.body.classList.add('no-partner-upsell');
      document.querySelectorAll('[data-partner-block], .dining-hero, .restaurant-showcase').forEach(function (el) {
        el.setAttribute('hidden', '');
        el.style.display = 'none';
      });
    }

    /* Sfondo neutro se ancora venice-bg */
    if (!isStaff) {
      document.body.classList.add('tenant-branded');
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    fetch(base + '/api/hotel-public', { cache: 'no-store' })
      .then(function (r) {
        return r.ok ? r.json() : null;
      })
      .then(function (payload) {
        const hotel = payload && payload.hotel ? payload.hotel : null;
        applyHotelBranding(hotel);
      })
      .catch(function () {
        /* silent */
      });
  });
})();
