/**
 * Temi premium lato ospite (Legno / Quarzo / Laguna / Spezie).
 * Persistenza: hotel_settings.key = guest_theme
 */

import { getHotelSetting, setHotelSetting } from './db.js';

export const GUEST_THEMES = [
  {
    id: 'legno',
    className: 'theme-legno',
    label: 'Legno',
    blurb: 'Baite, chalet, montagna — caldo e organico',
  },
  {
    id: 'quarzo',
    className: 'theme-quarzo',
    label: 'Quarzo',
    blurb: 'Boutique / 5 stelle — quiet luxury',
  },
  {
    id: 'laguna',
    className: 'theme-laguna',
    label: 'Laguna',
    blurb: 'Venezia e mare — fresco e arioso',
  },
  {
    id: 'spezie',
    className: 'theme-spezie',
    label: 'Spezie',
    blurb: 'Agriturismi e dimore — terracotta soft',
  },
];

const ALLOWED = new Set(GUEST_THEMES.map((t) => t.id));

export function normalizeGuestTheme(raw) {
  const id = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^theme-/, '');
  return ALLOWED.has(id) ? id : 'quarzo';
}

export function getGuestThemeId() {
  return normalizeGuestTheme(getHotelSetting('guest_theme', 'quarzo'));
}

export function setGuestThemeId(themeId, updatedBy = '') {
  const requested = String(themeId || '')
    .trim()
    .toLowerCase()
    .replace(/^theme-/, '');
  if (!ALLOWED.has(requested)) {
    return { ok: false, error: 'theme_invalid' };
  }
  setHotelSetting('guest_theme', requested, updatedBy);
  return { ok: true, theme: requested, className: `theme-${requested}` };
}

export function guestThemePublicPayload() {
  const theme = getGuestThemeId();
  return {
    ok: true,
    theme,
    className: `theme-${theme}`,
    themes: GUEST_THEMES,
  };
}
