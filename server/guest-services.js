function envTrim(name, fallback = '') {
  const value = String(process.env[name] || '').trim();
  return value || fallback;
}

function wifiNetwork(id, label, ssid, password) {
  if (!ssid || !password) return null;
  return { id, label, ssid, password };
}

/** Categorie segnalazione ospite → note reception. */
export const GUEST_REPORT_CATEGORIES = [
  {
    id: 'maintenance',
    labelIt: 'Manutenzione',
    labelEn: 'Maintenance',
    hintIt: 'Aria, luce, bagno, riparazioni',
    hintEn: 'AC, lights, bathroom, repairs',
  },
  {
    id: 'cleaning',
    labelIt: 'Pulizia camera',
    labelEn: 'Room cleaning',
    hintIt: 'Biancheria, riassetto, richiesta extra',
    hintEn: 'Linens, tidy-up, extra request',
  },
  {
    id: 'noise',
    labelIt: 'Rumore',
    labelEn: 'Noise',
    hintIt: 'Disturbo da altre camere o corridoio',
    hintEn: 'Disturbance from other rooms or corridor',
  },
  {
    id: 'missing',
    labelIt: 'Dotazione mancante',
    labelEn: 'Missing amenity',
    hintIt: 'Asciugamani, cuscini, asciugacapelli…',
    hintEn: 'Towels, pillows, hairdryer…',
  },
  {
    id: 'wifi',
    labelIt: 'Problema Wi‑Fi',
    labelEn: 'Wi‑Fi issue',
    hintIt: 'Connessione lenta o assente',
    hintEn: 'Slow or missing connection',
  },
  {
    id: 'access',
    labelIt: 'Accesso / porta',
    labelEn: 'Access / door',
    hintIt: 'Chiave, codice, ingresso hotel',
    hintEn: 'Key, door code, hotel entrance',
  },
  {
    id: 'other',
    labelIt: 'Altro',
    labelEn: 'Other',
    hintIt: 'Qualsiasi altra richiesta',
    hintEn: 'Any other request',
  },
];

const GUEST_REPORT_IDS = new Set(GUEST_REPORT_CATEGORIES.map((c) => c.id));

export function normalizeGuestReportCategory(raw) {
  const key = String(raw || '').trim().toLowerCase();
  return GUEST_REPORT_IDS.has(key) ? key : null;
}

/** Reti Wi-Fi per sede: Canal, Airone, appartamenti Ca Pisani. */
export function buildWifiNetworks() {
  const canalPassword = envTrim('WIFI_PASSWORD', 'hotelcanal');
  const canalSsid = envTrim('WIFI_SSID', 'hotel canal');
  const aironeSsid = envTrim('WIFI_SSID_AIRONE', 'hotel airone');
  const aironePassword = envTrim('WIFI_PASSWORD_AIRONE', canalPassword);
  const apartmentSsid = envTrim('WIFI_SSID_APARTMENT', 'Ca Pisani Vista Canal');
  const apartmentPassword = envTrim(
    'WIFI_PASSWORD_APARTMENT',
    '4dwnw5rgej3vqmd9',
  );

  return [
    wifiNetwork('canal', 'Hotel Canal', canalSsid, canalPassword),
    wifiNetwork('airone', 'Airone', aironeSsid, aironePassword),
    wifiNetwork('pisani', 'Appartamenti', apartmentSsid, apartmentPassword),
  ].filter(Boolean);
}

export function buildGuestServicesPayload() {
  let doorWalter = envTrim('DOOR_CODE_WALTER');
  if (doorWalter && !doorWalter.endsWith('#')) doorWalter = `${doorWalter}#`;
  const doorAirone = envTrim('DOOR_CODE_AIRONE');
  const wifiNetworks = buildWifiNetworks();
  const primary = wifiNetworks[0] || { ssid: '', password: '' };

  return {
    wifiSsid: primary.ssid || null,
    wifiPassword: primary.password || null,
    wifiNetworks,
    doorMain: doorWalter || null,
    doorInner: doorAirone || null,
    doorWalter: doorWalter || null,
    doorAirone: doorAirone || null,
    trattoriaPhone: envTrim('TRATTORIA_PHONE') || '+393282464972',
    trattoriaPhoneDisplay: envTrim('TRATTORIA_PHONE_DISPLAY') || '328 246 4972',
    tripadvisorUrl:
      envTrim('TRATTORIA_TRIPADVISOR_URL') ||
      'https://www.tripadvisor.it/Restaurant_Review-g187870-d34095681-Reviews-Trattoria_Alla_Terrazza-Venice_Veneto.html',
    tripadvisorRating: envTrim('TRATTORIA_TRIPADVISOR_RATING') || '4.3',
  };
}

/** Payload area ospiti: servizi + orari + categorie segnalazione. */
export function buildGuestHubPayload() {
  const services = buildGuestServicesPayload();
  const hotelName = envTrim('HOTEL_NAME', 'Hotel Canal');
  return {
    hotelName,
    address: envTrim('HOTEL_ADDRESS', 'Santa Croce 553, Venezia'),
    hours: {
      checkIn: envTrim('HOTEL_CHECKIN_LABEL', 'dalle 14:00'),
      checkOut: envTrim('HOTEL_CHECKOUT_LABEL', 'entro le 10:30'),
      breakfast: envTrim('HOTEL_BREAKFAST_LABEL', '07:30 – 10:00'),
      reception: envTrim('HOTEL_RECEPTION_HOURS', '24h · codice porta di notte'),
    },
    ...services,
    reportCategories: GUEST_REPORT_CATEGORIES,
  };
}
