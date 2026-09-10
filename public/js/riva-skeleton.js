/**
 * Riva OS — Skeleton builders + Stale-While-Revalidate cache
 * Vanilla JS (no React). Usare window.RivaSkeleton da staff.html / staff-ops.js
 */
(function (global) {
  'use strict';

  const DEFAULT_TTL_MS = 3 * 60 * 1000;
  const store = new Map();

  function now() {
    return Date.now();
  }

  function peek(key) {
    const entry = store.get(String(key));
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < now()) return null;
    return entry.data;
  }

  /** Come peek, ma restituisce anche dati scaduti (SWR: mostra subito, revalidate sotto). */
  function peekStale(key) {
    const entry = store.get(String(key));
    return entry ? entry.data : null;
  }

  function put(key, data, ttlMs = DEFAULT_TTL_MS) {
    store.set(String(key), {
      data,
      cachedAt: now(),
      expiresAt: ttlMs > 0 ? now() + ttlMs : 0,
    });
  }

  function invalidate(key) {
    if (key == null) store.clear();
    else store.delete(String(key));
  }

  function invalidatePrefix(prefix) {
    const p = String(prefix);
    for (const k of store.keys()) {
      if (k.startsWith(p)) store.delete(k);
    }
  }

  const inflight = new Map();

  /**
   * SWR fetch: returns cached data immediately if present, always revalidates in background.
   * First visit: awaits network. Usa stale scaduti se force=false.
   */
  async function fetchSWR(key, loader, { ttlMs = DEFAULT_TTL_MS, force = false, onFresh = null } = {}) {
    const k = String(key);
    const stale = !force ? (peek(k) ?? peekStale(k)) : null;

    if (!inflight.has(k)) {
      const job = Promise.resolve()
        .then(loader)
        .then((data) => {
          put(k, data, ttlMs);
          if (typeof onFresh === 'function') onFresh(data, false);
          return data;
        })
        .finally(() => {
          inflight.delete(k);
        });
      inflight.set(k, job);
    } else if (typeof onFresh === 'function') {
      inflight.get(k)?.then((data) => onFresh(data, false)).catch(() => {});
    }

    if (stale != null) {
      return { data: stale, fromCache: true };
    }

    const data = await inflight.get(k);
    return { data, fromCache: false };
  }

  function skelText(widthClass = 'skel-w70', extra = '') {
    return `<span class="skel-text ${widthClass}${extra ? ` ${extra}` : ''}" aria-hidden="true"></span>`;
  }

  function matrixRows(count = 8) {
    return Array.from({ length: count }, () => `
      <tr class="matrix-row--skeleton" aria-hidden="true">
        <td class="col-guest">${skelText('skel-w70')}${skelText('skel-w40')}</td>
        <td class="col-room">${skelText('skel-w25')}</td>
        <td class="col-phone">${skelText('skel-w55')}</td>
        <td class="col-email">${skelText('skel-w70')}</td>
        <td class="col-receptionist">${skelText('skel-w40')}</td>
        <td class="col-actions">${skelText('skel-w25')}</td>
      </tr>`).join('');
  }

  /** Clienti — stessa card reale (avatar 44 · nome · status · tel · email · 2 action 32) */
  function guestCardRows(count = 6) {
    return Array.from({ length: count }, (_, i) => {
      const delay = i * 60;
      return `
      <tr class="matrix-row--skeleton nv-guest-card-mobile nv-guest-card-skeleton clienti-row-skeleton" aria-hidden="true" style="--skel-i:${i};--sc-skel-i:${i};animation-delay:${delay}ms">
        <td class="col-room nv-mobile-room-zone">
          <span class="nv-guest-avatar nv-guest-avatar--skel skeleton-shimmer" style="--sc-skel-i:${i};animation-delay:${delay}ms"></span>
        </td>
        <td class="col-guest nv-mobile-info-zone">
          <span class="skel-text clienti-skel-name skeleton-shimmer" style="--sc-skel-i:${i};animation-delay:${delay}ms" aria-hidden="true"></span>
          <span class="skel-text clienti-skel-dates skeleton-shimmer" style="--sc-skel-i:${i};animation-delay:${delay + 40}ms" aria-hidden="true"></span>
          <span class="clienti-skel-contacts" aria-hidden="true">
            <span class="skel-text clienti-skel-phone skeleton-shimmer" style="--sc-skel-i:${i};animation-delay:${delay + 80}ms"></span>
            <span class="skel-text clienti-skel-email skeleton-shimmer" style="--sc-skel-i:${i};animation-delay:${delay + 120}ms"></span>
          </span>
        </td>
        <td class="col-actions nv-mobile-action-zone">
          <span class="skel-circle clienti-skel-icon skeleton-shimmer" style="--sc-skel-i:${i};animation-delay:${delay + 40}ms" aria-hidden="true"></span>
          <span class="skel-circle clienti-skel-icon skeleton-shimmer" style="--sc-skel-i:${i + 1};animation-delay:${delay + 80}ms" aria-hidden="true"></span>
        </td>
        <td class="col-phone" hidden></td>
        <td class="col-email" hidden></td>
        <td class="col-receptionist" hidden></td>
      </tr>`;
    }).join('');
  }

  /** Toolbar Clienti — capsule In camera / Altra data (36px rounded-full, gap 8) */
  function clientsToolbarSkeleton() {
    return [
      `<span class="date-pill date-pill--skel skeleton-shimmer" style="width:96px;min-width:96px;height:36px;border-radius:9999px;--sc-skel-i:0" aria-hidden="true"></span>`,
      `<span class="date-pill date-pill--skel date-pill--skel-light skeleton-shimmer" style="width:108px;min-width:108px;height:36px;border-radius:9999px;--sc-skel-i:1" aria-hidden="true"></span>`,
    ].join('');
  }

  function feedRows(count = 6) {
    return Array.from({ length: count }, () => `
      <article class="feed-row feed-row--skeleton" aria-hidden="true">
        ${skelText('skel-w40')}
        ${skelText('skel-w70')}
        ${skelText('skel-w55')}
      </article>`).join('');
  }

  function shiftAuditKeyTiles(count = 28) {
    return Array.from({ length: count }, (_, i) =>
      `<div class="sc-key-tile is-skeleton skeleton-shimmer" style="--sc-skel-i:${i % 12}" aria-hidden="true"></div>`,
    ).join('');
  }

  function shiftAuditTableRows(colCount = 5, rowCount = 3) {
    const widths = ['skel-w40', 'skel-w25', 'skel-w25', 'skel-w55', 'skel-w25', 'skel-w25'];
    return Array.from({ length: rowCount }, (_, rowI) => {
      const cells = Array.from({ length: colCount }, (_, i) =>
        `<td><span class="skel-text ${widths[i % widths.length]} skel-text--sm skeleton-shimmer" style="--sc-skel-i:${rowI * 2 + i};display:block;border-radius:4px" aria-hidden="true"></span></td>`,
      ).join('');
      return `<tr class="skel-row" aria-hidden="true">${cells}</tr>`;
    }).join('');
  }

  function shiftAuditCashHint() {
    return skelText('skel-w70 skel-text--md');
  }

  /** Chiusura turno — timeline turni (forma = feed finale) */
  function shiftClosureKeysStatus(count = 3) {
    return Array.from({ length: count }, (_, i) => `
      <div class="sc-keys-tl__item" aria-hidden="true">
        <span class="sc-keys-tl__rail"><span class="sc-skel sc-skel--dot skeleton-shimmer" style="--sc-skel-i:${i}"></span></span>
        <span class="sc-skel sc-skel--line skeleton-shimmer" style="--sc-skel-i:${i};width:68%;height:12px;border-radius:4px"></span>
      </div>`).join('');
  }

  function shiftClosureCashLine(index = 0, width = '72px') {
    return `<span class="sc-skel sc-skel--line skeleton-shimmer" style="--sc-skel-i:${index};width:${width};height:14px;display:inline-block;border-radius:4px" aria-hidden="true"></span>`;
  }

  function shiftClosureSignRows(count = 3) {
    return Array.from({ length: count }, (_, i) => `
      <div class="sc-sign-row sc-skel-row" aria-hidden="true">
        <span class="sc-skel sc-skel--dot skeleton-shimmer" style="--sc-skel-i:${i};width:40px;height:40px;border-radius:50%"></span>
        <div style="display:flex;flex-direction:column;gap:6px;min-width:0;flex:1">
          <span class="sc-skel sc-skel--line skeleton-shimmer" style="--sc-skel-i:${i};width:72px;height:10px;border-radius:4px"></span>
          <span class="sc-skel sc-skel--line skeleton-shimmer" style="--sc-skel-i:${i + 1};width:55%;height:12px;border-radius:4px"></span>
        </div>
        <span class="sc-skel sc-skel--pill skeleton-shimmer" style="--sc-skel-i:${i + 2};width:64px;height:28px;border-radius:999px"></span>
      </div>`).join('');
  }

  function rackRows(count = 14) {
    return `<div class="rack-skeleton" aria-hidden="true">${Array.from({ length: count }, () => `
      <div class="rack-skeleton__row">
        <div class="skel-block rack-skeleton__label skeleton-shimmer"></div>
        <div class="skel-block rack-skeleton__track skeleton-shimmer"></div>
      </div>`).join('')}</div>`;
  }

  function opsColazioniGrid(count = 10) {
    const rows = Array.from({ length: count }, (_, idx) => {
      const delay = idx * 80;
      return `
      <div class="ops-skeleton-bf-row" style="--bf-skel-i:${idx}">
        <div class="skel-block skeleton-shimmer" style="width:34%;height:20px;border-radius:6px;animation-delay:${delay}ms"></div>
        <div class="skel-block skeleton-shimmer" style="width:24%;height:36px;border-radius:12px;animation-delay:${delay + 40}ms"></div>
        <div class="skel-block skeleton-shimmer" style="width:28%;height:36px;border-radius:12px;animation-delay:${delay + 80}ms"></div>
      </div>`;
    }).join('');
    return `<div class="ops-bf-shell colazioni-page-wrapper" aria-busy="true" aria-hidden="true">
      <div class="ops-bf-page">
        <div class="ops-skeleton-bf-wrap">
          <div class="ops-skeleton-bf-card colazioni-card-container">
            <div class="ops-skeleton-bf-rows">${rows}</div>
          </div>
        </div>
      </div>
      <div class="bf-command-bar bf-command-bar--bottom">
        <span class="skel-block skeleton-shimmer" style="flex:1;height:36px;border-radius:9999px"></span>
        <span class="skel-block skeleton-shimmer" style="width:88px;height:36px;border-radius:9999px"></span>
      </div>
    </div>`;
  }

  function opsHkToolbarSkeleton() {
    const widths = ['sm', 'md', 'lg', 'md', 'lg', 'sm'];
    const caps = widths
      .map(
        (w, i) =>
          `<span class="hk-skeleton-element hk-skel-capsule hk-skel-capsule--${w}${i === 0 ? ' hk-skel-capsule--on' : ''}" style="animation-delay:${i * 50}ms" aria-hidden="true"></span>`,
      )
      .join('');
    return `<div class="ig-subbar-tabs-inner" aria-hidden="true">
      <div class="ops-sec-tabs ops-sec-tabs--skel" role="presentation">${caps}</div>
      <p class="ops-stats-line hk-skeleton-stats" aria-hidden="true">
        <span class="hk-skeleton-element hk-skeleton-stats__bar" style="animation-delay:80ms"></span>
      </p>
    </div>`;
  }

  function opsRoomsCards(count = 12) {
    return Array.from({ length: count }, (_, idx) => {
      const wave = idx * 60;
      return `<article class="ops-room hk-card-skeleton" style="--hk-skel-i:${idx}" aria-hidden="true">
        <span class="hk-skeleton-element hk-card-skeleton__num" style="animation-delay:${wave}ms"></span>
        <span class="hk-skeleton-element hk-card-skeleton__status" style="animation-delay:${wave + 30}ms"></span>
        <div class="hk-card-skeleton__dots" aria-hidden="true">
          <span class="hk-skeleton-element hk-card-skeleton__dot" style="animation-delay:${wave + 50}ms"></span>
          <span class="hk-skeleton-element hk-card-skeleton__dot" style="animation-delay:${wave + 50}ms"></span>
          <span class="hk-skeleton-element hk-card-skeleton__dot" style="animation-delay:${wave + 50}ms"></span>
        </div>
      </article>`;
    }).join('');
  }

  /** Griglia camere HK — speculare a .ops-room (bordino · num · stato · 3 pallini) */
  function opsRoomsGrid(count = 12) {
    const cards = opsRoomsCards(count);
    return `<div class="ops-rooms-shell" aria-busy="true" aria-hidden="true">
      <div class="ops-rooms-content">
        <div class="ops-rooms-grid ops-skeleton-grid">${cards}</div>
      </div>
    </div>`;
  }

  function skelCircle(sizePx = 40, extra = '') {
    return `<span class="skel-circle skeleton-shimmer${extra ? ` ${extra}` : ''}" style="width:${sizePx}px;height:${sizePx}px" aria-hidden="true"></span>`;
  }

  function skelButton(widthClass = 'skel-w55', extra = '') {
    return `<span class="skel-block skel-button skeleton-shimmer ${widthClass}${extra ? ` ${extra}` : ''}" aria-hidden="true"></span>`;
  }

  function notifyItems(count = 4) {
    return Array.from({ length: count }, () => `
      <div class="notify-item notify-item--skeleton" aria-hidden="true">
        ${skelText('skel-w70', 'skel-text--lg')}
        ${skelText('skel-w55', 'skel-text--sm')}
        ${skelText('skel-w100', 'skel-text--sm')}
      </div>`).join('');
  }

  function menuHistoryRows(count = 3) {
    return Array.from({ length: count }, () => `
      <div class="row-menu-history-row row-menu-history-row--skeleton" role="presentation" aria-hidden="true">
        ${skelText('skel-w100', 'skel-text--md')}
        ${skelText('skel-w40', 'skel-text--sm')}
      </div>`).join('');
  }

  function reportSheetSkeleton() {
    return `<div class="report-skeleton" aria-hidden="true">
      ${skelText('skel-w70', 'skel-text--lg')}
      ${skelText('skel-w100', 'skel-text--md')}
      <div class="report-skeleton__channels">
        ${Array.from({ length: 2 }, () => `
          <div class="report-skeleton__channel">
            ${skelText('skel-w25', 'skel-text--md')}
            ${skelText('skel-w55', 'skel-text--sm')}
            ${skelText('skel-w25', 'skel-text--sm')}
          </div>`).join('')}
      </div>
      ${skelButton('skel-w40', 'report-skeleton__btn')}
    </div>`;
  }

  function settingsStatsSkeleton() {
    return {
      statToday: skelText('skel-w25', 'skel-text--lg'),
      statMonth: skelText('skel-w25', 'skel-text--lg'),
      statCoupons: skelText('skel-w25', 'skel-text--lg'),
    };
  }

  function blacklistRows(count = 6) {
    return feedRows(count);
  }

  function settingsPanel(rows = 5) {
    return `<div class="settings-skeleton" aria-hidden="true">
      <div class="skel-block settings-skeleton__card skeleton-shimmer"></div>
      ${Array.from({ length: rows }, () =>
        '<div class="skel-block settings-skeleton__row skeleton-shimmer"></div>',
      ).join('')}
    </div>`;
  }

  function revealEl(el, { fade = true } = {}) {
    if (!el) return;
    if (fade) {
      el.classList.remove('fade-in-premium', 'content-fade-in');
      void el.offsetWidth;
      el.classList.add('fade-in-premium');
      window.setTimeout(() => {
        el.classList.remove('fade-in-premium');
      }, 220);
    }
  }

  function mountHtml(el, html) {
    if (!el) return;
    el.innerHTML = html;
  }

  global.RivaSkeleton = {
    peek,
    peekStale,
    put,
    invalidate,
    invalidatePrefix,
    fetchSWR,
    matrixRows,
    guestCardRows,
    clientsToolbarSkeleton,
    feedRows,
    shiftAuditKeyTiles,
    shiftAuditTableRows,
    shiftAuditCashHint,
    shiftClosureKeysStatus,
    shiftClosureCashLine,
    shiftClosureSignRows,
    rackRows,
    opsColazioniGrid,
    opsRoomsGrid,
    opsRoomsCards,
    opsHkToolbarSkeleton,
    settingsPanel,
    settingsStatsSkeleton,
    skelCircle,
    skelButton,
    notifyItems,
    menuHistoryRows,
    reportSheetSkeleton,
    blacklistRows,
    revealEl,
    mountHtml,
    skelText,
  };

  if (document.body) document.body.classList.add('has-riva-skeleton');
  else document.addEventListener('DOMContentLoaded', () => {
    document.body?.classList.add('has-riva-skeleton');
  });
})(typeof window !== 'undefined' ? window : globalThis);
