#!/usr/bin/env node
/**
 * Ripristino one-shot contatti da report email 22–24/08/2026 su PRODUZIONE.
 * Usa CRON_SECRET + endpoint live (cifratura con chiave Render).
 */
import dotenv from 'dotenv';

dotenv.config();

const BASE = (
  process.env.PUBLIC_URL || 'https://checkin-hotelcanal.it'
).replace(/\/$/, '');
const SECRET = String(process.env.CRON_SECRET || '').trim();
if (!SECRET) {
  console.error('CRON_SECRET mancante');
  process.exit(1);
}

/** @type {Array<object>} */
const rows = [
  // 22/08/2026
  { stayDate: '2026-08-22', roomNumber: '04', guestName: 'MARIANO LANFRANCHI', phone: '+41791565435', email: 'mariano.lanfranchi@hispeed.ch', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '14', guestName: 'ELIS NEZIRAJ', phone: '3338826664', email: 'elisneziraj@gmail.com', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '20', guestName: 'MARINA EKERT', phone: '4915730606146', email: 'marina.ekert@gmail.com', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '26', guestName: 'AOI NAGATA', phone: '+337000076895087', email: 'foyra80857@gmail.com', receptionist: 'JOHN', guestsCount: 1, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '102', guestName: 'JACKSON CHESSER', phone: '0433391948', email: 'jackson.chesser1@gmail.com', receptionist: 'JOHN', guestsCount: 4, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '105', guestName: 'LEONIE CHESSER', phone: '0439570485', email: 'leoniechesser@gmail.com', receptionist: 'JOHN', guestsCount: 1, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '108', guestName: 'HASSAN IQBAL', phone: '+393445452775', email: 'hiqbal95@gmail.com', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '111', guestName: 'JULIA GIMAEVA', phone: '89373601183', email: 'juliagimaeva@mail.ru', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '206', guestName: 'ENDI GASHI', phone: '+4917660188993', email: 'endigashi46@outlook.de', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-22', roomNumber: '310', guestName: 'MANUEL NESE', phone: '3339868149', email: 'manuel.nese@libero.it', receptionist: 'JOHN', guestsCount: 2, voucher: true },

  // 23/08/2026 (lista unica; il paste aveva il report duplicato)
  { stayDate: '2026-08-23', roomNumber: '14', guestName: 'JACEK SĘKOWSKI', phone: '+48728821519', email: 'goldsolar2@wp.pl', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '22', guestName: 'IRENE RADDINO', phone: '+393934811772', email: 'ire.radd@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '101', guestName: 'NATHAN LEPAGE', phone: '9789875884', email: 'nlepage2002@gmail.com', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '109', guestName: 'ABBAS TAYEB', phone: '+33788052303', email: 'abbastayeb14@gmail.com', receptionist: 'TOMMASO', guestsCount: 4, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '111', guestName: 'BAHROUN SAFOUAN', phone: '+48518332767', email: 'bahrounsafouan@gmail.com', receptionist: 'JOHN', guestsCount: 1, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '113', guestName: 'DILŞAD BILEK', phone: '+905396343662', email: 'dilsadbilek@hotmail.com', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '114', guestName: 'KSENIJA NAJEHALSKA', phone: '27022388', email: 'skudyakovg@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '118', guestName: 'CHRISTOPHE DELHAIE', phone: '+33687694856', email: 'christophe.delhaie@gmail.com', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '202', guestName: 'QUANG LONG VU', phone: '+84974182468', email: 'longkiep@gmail.com', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '205', guestName: 'CHRISTIANE BAUMANN', phone: '+491602322253', email: 'baumann.markus@gmx.net', receptionist: 'JOHN', guestsCount: 4, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '208', guestName: 'ILKAY ALKAN', phone: '+491737060011', email: 'ilkay2001@gmx.de', receptionist: 'JOHN', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-23', roomNumber: '311', guestName: 'MARIA ALVAREZ', phone: '16478337273', email: 'gapebbles@hotmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  // senza stanza / senza voucher (come in report)
  { stayDate: '2026-08-23', roomNumber: '', guestName: 'NATHAN LEPAGE', phone: '9789875884', email: 'nlepage2002@gmail.com', receptionist: '', guestsCount: 2, voucher: false },
  { stayDate: '2026-08-23', roomNumber: '', guestName: 'QUANG LONG VU', phone: '+84974182468', email: 'write4meall@gmail.com', receptionist: '', guestsCount: 2, voucher: false },

  // 24/08/2026
  { stayDate: '2026-08-24', roomNumber: '105', guestName: 'GUILHEM JACQUOT', phone: '0761920337', email: 'guilhem.jct@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-24', roomNumber: '114', guestName: 'MICHAEL VERBEEK', phone: '+31651175635', email: 'ti141807@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-24', roomNumber: '202', guestName: 'LAWRENCE NG', phone: '+4407760260610', email: 'nglawrence2005@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-24', roomNumber: '203', guestName: 'AGNES BAUER', phone: '+436804432245', email: 'agnes.bauer5@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-24', roomNumber: '206', guestName: 'ASTRID FORRESTOL', phone: '+4748166265', email: 'aforrestol@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-24', roomNumber: '210', guestName: 'MARA JOS ARREGUI FERNANDEZ', phone: '+34655709968', email: 'marajosfernandez@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-24', roomNumber: '211', guestName: 'ALONSO ANDRES JESUS MARIA', phone: '+34688612173', email: 'alonsojesusmaria@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
  { stayDate: '2026-08-24', roomNumber: '311', guestName: 'MARTA CAMPALANS TORRES', phone: '+34687055355', email: 'campalans.marta@gmail.com', receptionist: 'TOMMASO', guestsCount: 2, voucher: true },
];

// Nathan voucher NO: stesso email del 101 → skip automatico per emailKey.
// Quang write4meall: email diversa → inserito senza stanza.

const res = await fetch(`${BASE}/api/cron/restore-report-checkins`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SECRET}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  body: JSON.stringify({ rows }),
});
const body = await res.json().catch(() => ({}));
console.log(res.status, JSON.stringify(body, null, 2));
if (!res.ok || !body.ok) process.exit(1);
