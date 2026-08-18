function envTrim(name) {
  return String(process.env[name] || '').trim();
}

function wifiNetwork(id, label, ssid, password) {
  if (!ssid || !password) return null;
  return { id, label, ssid, password };
}

/** Reti Wi-Fi per sede. Password solo da env, nessun fallback in sorgente. */
export function buildWifiNetworks() {
  const canalPassword = envTrim('WIFI_PASSWORD');
  const canalSsid = envTrim('WIFI_SSID');
  const aironeSsid = envTrim('WIFI_SSID_AIRONE');
  const apartmentSsid = envTrim('WIFI_SSID_APARTMENT');
  const apartmentPassword = envTrim('WIFI_PASSWORD_APARTMENT');

  return [
    wifiNetwork('canal', 'Hotel Canal', canalSsid, canalPassword),
    wifiNetwork('airone', 'Airone', aironeSsid, canalPassword),
    wifiNetwork(
      'pisani',
      'Appartamenti',
      apartmentSsid,
      apartmentPassword,
    ),
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
