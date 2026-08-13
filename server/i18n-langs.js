/** Canonical guest languages (device primary → 2-letter code → else en). */
export const SUPPORTED_GUEST_LANGS = [
  'it',
  'en',
  'fr',
  'de',
  'zh',
  'ja',
  'bn',
  'ar',
  'ru',
  'pl',
  'nl',
  'es', // already translated; keep so Spanish devices do not regress
];

export function resolveGuestLang(raw) {
  const code = String(raw || '')
    .trim()
    .slice(0, 2)
    .toLowerCase();
  return SUPPORTED_GUEST_LANGS.includes(code) ? code : 'en';
}
