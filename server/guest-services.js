function envTrim(name, fallback = '') {
  const value = String(process.env[name] || '').trim();
  return value || fallback;
}

function wifiNetwork(id, label, ssid, password) {
  if (!ssid || !password) return null;
  return { id, label, ssid, password };
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
