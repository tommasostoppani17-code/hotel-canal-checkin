/**
 * Destinatari report Payel — inbox ufficiale solo sul cron produzione.
 * Test, anteprime e invii manuali staff: mai grandcanalhotels@gmail.com.
 */

import {
  isBlockedRecipient,
  sendableRecipientOrEmpty,
} from './recipient-guard.js';

export const DEFAULT_OFFICIAL_REPORT_EMAIL = 'grandcanalhotels@gmail.com';
export const DEFAULT_TEST_REPORT_EMAIL = 'tommasostoppani17@gmail.com';

function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

export function officialReportRecipient() {
  return sendableRecipientOrEmpty(
    env('REPORT_EMAIL_OFFICIAL') || DEFAULT_OFFICIAL_REPORT_EMAIL,
  );
}

export function testReportRecipient() {
  const official = officialReportRecipient();
  const test = sendableRecipientOrEmpty(
    env('REPORT_EMAIL_TEST') ||
      env('REPORT_EMAIL') ||
      DEFAULT_TEST_REPORT_EMAIL,
  );
  if (test && test === official) return '';
  return test;
}

/**
 * @param {{ production?: boolean }} opts
 * production=true → solo inbox ufficiale (cron notturno)
 * production=false → solo test/dev (mai ufficiale)
 */
export function resolveReportRecipients({ production = false } = {}) {
  if (production) {
    const official = officialReportRecipient();
    if (!official) {
      const raw =
        env('REPORT_EMAIL_OFFICIAL') || DEFAULT_OFFICIAL_REPORT_EMAIL;
      if (isBlockedRecipient(raw)) {
        throw new Error(
          `REPORT_EMAIL_OFFICIAL bloccato (info@ / hotelcanal): ${raw}`,
        );
      }
      throw new Error('REPORT_EMAIL_OFFICIAL non configurata');
    }
    return [official];
  }
  const test = testReportRecipient();
  return test ? [test] : [];
}
