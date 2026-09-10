#!/usr/bin/env node
/**
 * Stampa URL LAN per iPad (stesso Wi‑Fi del Mac).
 */
import os from 'node:os';

const port = Number(process.env.PORT || 3000);
const ips = [];
for (const list of Object.values(os.networkInterfaces() || {})) {
  for (const net of list || []) {
    if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
  }
}

if (!ips.length) {
  console.log('Nessun IP LAN trovato. Collega il Mac al Wi‑Fi.');
  process.exit(1);
}

console.log('\nRiva OS · URL per iPad (stesso Wi‑Fi)\n');
for (const ip of ips) {
  const base = `http://${ip}:${port}`;
  console.log(`Base:       ${base}`);
  console.log(`Check-in:   ${base}/`);
  console.log(`Staff:      ${base}/staff`);
  console.log(`HK:         ${base}/hk`);
  console.log(`Colazioni:  ${base}/colazione`);
  console.log(`Ospiti:     ${base}/ospiti`);
  console.log('');
}
console.log('Home screen: Safari → Condividi → Aggiungi alla schermata Home\n');
console.log('PIN piani: Farooq / 1477 · Farhad / 2588 (se impostati in .env)\n');
