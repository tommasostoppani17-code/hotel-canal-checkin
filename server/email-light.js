/**
 * Forza le email in modalità chiara anche se il telefono è in dark mode.
 * Gmail / Apple Mail / Outlook.com continuano a tentare inversioni: meta + CSS + bgcolor.
 */

export const EMAIL_FORCE_WHITE = '#FFFFFF';
export const EMAIL_FORCE_TEXT = '#1D1D1F';

/** Meta + CSS anti dark-mode da inserire in <head>. */
export function emailLightModeHead({ canal = '#124453', box = '#F4F7F9', extraCss = '' } = {}) {
  return `
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light only">
  <meta name="x-apple-disable-message-reformatting">
  <style type="text/css">
    :root {
      color-scheme: light only;
      supported-color-schemes: light only;
    }
    html, body {
      color-scheme: light only !important;
      background-color: ${EMAIL_FORCE_WHITE} !important;
      background-image: none !important;
      color: ${EMAIL_FORCE_TEXT} !important;
    }
    .email-bg,
    .email-card,
    .email-content,
    .force-white {
      background-color: ${EMAIL_FORCE_WHITE} !important;
      background-image: none !important;
      color: ${EMAIL_FORCE_TEXT} !important;
    }
    .force-box {
      background-color: ${box} !important;
      background-image: none !important;
    }
    @media (prefers-color-scheme: dark) {
      :root { color-scheme: light only !important; }
      html,
      body,
      .email-bg,
      .email-card,
      .email-content,
      .force-white,
      .voucher-body {
        background-color: ${EMAIL_FORCE_WHITE} !important;
        background-image: none !important;
        color: ${EMAIL_FORCE_TEXT} !important;
      }
      .force-box,
      .room-badge,
      .route-card,
      .access-card,
      .meta-chip-inner {
        background-color: ${box} !important;
        background-image: none !important;
      }
      .text-main,
      .text-muted,
      .email-content,
      .email-content p,
      .email-content td,
      .email-content div,
      .email-content span,
      .email-content strong,
      .email-content li {
        color: ${EMAIL_FORCE_TEXT} !important;
      }
      .brand-title { color: ${canal} !important; }
      a { color: ${canal} !important; }
    }
    /* Outlook.com / Outlook app dark mode */
    [data-ogsc] html,
    [data-ogsc] body,
    [data-ogsc] .email-bg,
    [data-ogsc] .email-card,
    [data-ogsc] .email-content,
    [data-ogsc] .force-white,
    [data-ogsb] html,
    [data-ogsb] body,
    [data-ogsb] .email-bg,
    [data-ogsb] .email-card,
    [data-ogsb] .email-content,
    [data-ogsb] .force-white {
      background-color: ${EMAIL_FORCE_WHITE} !important;
      color: ${EMAIL_FORCE_TEXT} !important;
    }
    [data-ogsc] .force-box,
    [data-ogsc] .room-badge,
    [data-ogsc] .route-card,
    [data-ogsc] .access-card,
    [data-ogsb] .force-box,
    [data-ogsb] .room-badge,
    [data-ogsb] .route-card,
    [data-ogsb] .access-card {
      background-color: ${box} !important;
    }
    ${extraCss}
  </style>`;
}

/** Attributi inline per <body> e wrapper esterni. */
export function emailLightBodyAttrs() {
  return `class="email-bg" bgcolor="${EMAIL_FORCE_WHITE}" style="margin:0;padding:0;background-color:${EMAIL_FORCE_WHITE} !important;background-image:none !important;color:${EMAIL_FORCE_TEXT} !important;"`;
}
