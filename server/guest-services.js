function env(name, fallback = '') {
  return process.env[name] ?? fallback;
}

/** Reti Wi-Fi per sede (Hotel Canal, Airone, appartamenti). */
export function buildWifiNetworks() {
  const canalPassword = String(env('WIFI_PASSWORD', '')).trim();
  const canalSsid =
    String(env('WIFI_SSID', 'hotel canal')).trim() || 'hotel canal';
  const aironeSsid =
    String(env('WIFI_SSID_AIRONE', 'hotel airone')).trim() || 'hotel airone';
  const apartmentSsid =
    String(env('WIFI_SSID_APARTMENT', 'Ca Pisani Vista Canal')).trim() ||
    'Ca Pisani Vista Canal';
  const apartmentPassword = String(
    env('WIFI_PASSWORD_APARTMENT', '4dwnw5rgej3vqmd9'),
  ).trim();

  return [
    {
      id: 'canal',
      label: 'Hotel Canal',
      ssid: canalSsid,
      password: canalPassword,
    },
    {
      id: 'airone',
      label: 'Airone',
      ssid: aironeSsid,
      password: canalPassword,
    },
    {
      id: 'pisani',
      label: 'Appartamenti',
      ssid: apartmentSsid,
      password: apartmentPassword,
    },
  ];
}

export function buildGuestServicesPayload() {
  let doorWalter = String(env('DOOR_CODE_WALTER', '')).trim();
  if (doorWalter && !doorWalter.endsWith('#')) doorWalter = `${doorWalter}#`;
  const doorAirone = String(env('DOOR_CODE_AIRONE', '')).trim();
  const wifiNetworks = buildWifiNetworks();
  const primary = wifiNetworks[0];

  return {
    wifiSsid: primary.ssid,
    wifiPassword: primary.password,
    wifiNetworks,
    doorMain: doorWalter,
    doorInner: doorAirone,
    doorWalter,
    doorAirone,
    trattoriaPhone: String(env('TRATTORIA_PHONE', '+393282464972')).trim(),
    trattoriaPhoneDisplay: String(
      env('TRATTORIA_PHONE_DISPLAY', '328 246 4972'),
    ).trim(),
  };
}
