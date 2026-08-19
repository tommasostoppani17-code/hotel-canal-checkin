/**
 * Tipografia email Hotel Canal — stesso sistema della mail tavolo Trattoria.
 *
 * Display / brand  → Cormorant Garamond (SERIF)
 * Prosa / saluti   → EB Garamond italic (BODY)
 * Sezioni          → Cinzel (CINZEL)
 * Label / CTA / UI → DM Sans (SANS)
 */

export const EMAIL_SERIF =
  "'Cormorant Garamond',Georgia,'Times New Roman',serif";
export const EMAIL_BODY =
  "'EB Garamond',Georgia,'Times New Roman',serif";
export const EMAIL_SANS =
  "'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
export const EMAIL_CINZEL = "'Cinzel',Georgia,'Times New Roman',serif";

/** Google Fonts — Cinzel + Cormorant + DM Sans + EB Garamond (italic). */
export const EMAIL_GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=DM+Sans:wght@400;500;600;700&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&display=swap';

export function emailFontsHead() {
  return `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${EMAIL_GOOGLE_FONTS_HREF}" rel="stylesheet">`;
}

/** Prosa principale (saluti, paragrafi). */
export function emailBodyStyle({ size = '18px', line = '1.55' } = {}) {
  return `font-family:${EMAIL_BODY};font-style:italic;font-size:${size};line-height:${line};font-weight:400`;
}

/** Label uppercase (ORARIO, STANZA, …). */
export function emailLabelStyle({ size = '13px', color = '#8A949C' } = {}) {
  return `font-family:${EMAIL_SANS};font-size:${size};font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${color} !important`;
}

/** Titolo brand / display uppercase. */
export function emailDisplayStyle({
  size = '27px',
  color = '#164E5B',
  tracking = '0.12em',
} = {}) {
  return `font-family:${EMAIL_SERIF};font-size:${size};font-weight:700;letter-spacing:${tracking};color:${color} !important;text-transform:uppercase;line-height:1.15;mso-line-height-rule:exactly`;
}

/** Eyebrow partner (PARTNER · HOTEL CANAL). */
export function emailEyebrowStyle({
  size = '12.5px',
  color = '#6E868F',
  tracking = '0.24em',
} = {}) {
  return `font-family:${EMAIL_SANS};font-size:${size};font-weight:600;letter-spacing:${tracking};text-transform:uppercase;color:${color} !important`;
}

/** Titolo sezione Cinzel. */
export function emailSectionStyle({ size = '16px', color = '#164E5B' } = {}) {
  return `font-family:${EMAIL_CINZEL};font-size:${size};font-weight:700;color:${color} !important;letter-spacing:0.08em;text-transform:uppercase;line-height:1.2`;
}

/** Valore dettaglio (nome, stanza, telefono). */
export function emailValueStyle({ size = '19px', color = '#164E5B' } = {}) {
  return `font-family:${EMAIL_SERIF};font-size:${size};font-weight:600;color:${color} !important;letter-spacing:0.02em;line-height:1.3`;
}

/** CTA bottone. */
export function emailCtaStyle({ size = '15.5px' } = {}) {
  return `font-family:${EMAIL_SANS};font-weight:600;font-size:${size};text-transform:uppercase;letter-spacing:0.08em`;
}
