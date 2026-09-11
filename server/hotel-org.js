/**
 * Organizzazione multi-hotel (Dev / Manager).
 * Canal + affiliati seedati; altri hotel = struttura template da personalizzare.
 */
import { getDb, getStaffMember, setStaffPinHash } from './db.js';
import { hashStaffPin, isUsableStaffPassword } from './staff-auth.js';
import { DEFAULT_HOTEL_ROOMS } from './hotel-rooms.js';

export const ORG_MODULES = [
  { id: 'checkin', label: 'Check-in digitale', defaultOn: true },
  { id: 'holds', label: 'Prenotazioni', defaultOn: true },
  { id: 'ops_rooms', label: 'Camere / HK', defaultOn: true },
  { id: 'ops_colazioni', label: 'Colazioni', defaultOn: true },
  { id: 'notes', label: 'Note reception', defaultOn: true },
  { id: 'blacklist', label: 'Segnalazioni', defaultOn: true },
  { id: 'shift_audit', label: 'Chiusura turno', defaultOn: true },
  { id: 'alloggiati', label: 'Schede alloggiati', defaultOn: true },
  { id: 'emily', label: 'Emily / Concierge', defaultOn: false },
  { id: 'whatsapp', label: 'WhatsApp inbound', defaultOn: false },
];

export const ORG_DEPARTMENTS = [
  { id: 'management', label: 'Direzione' },
  { id: 'reception', label: 'Reception' },
  { id: 'housekeeping', label: 'Housekeeping' },
  { id: 'breakfast', label: 'Colazioni' },
  { id: 'other', label: 'Altro' },
];

const ROLE_DEV = 'dev';
const ROLE_MANAGER = 'manager';
const ROLE_RECEPTION = 'receptionist';
const ROLE_HK = 'housekeeping';

export function standardStaffPin() {
  const pin = String(process.env.STAFF_STANDARD_PIN || '1234').trim();
  return isUsableStaffPassword(pin) ? pin : '1234';
}

function defaultModulesMap(on = true) {
  const out = {};
  for (const m of ORG_MODULES) out[m.id] = on ? Boolean(m.defaultOn) : false;
  return out;
}

function parseJson(raw, fallback) {
  try {
    const v = JSON.parse(String(raw || ''));
    return v && typeof v === 'object' ? v : fallback;
  } catch {
    return fallback;
  }
}

function ensureRosterColumn(name, ddl) {
  const db = getDb();
  const cols = db.prepare(`PRAGMA table_info(staff_roster)`).all();
  if (!cols.some((c) => c.name === name)) {
    db.exec(`ALTER TABLE staff_roster ADD COLUMN ${ddl}`);
  }
}

export function ensureHotelOrgSchema() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS org_hotels (
      slug TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'template',
      city TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      rooms_json TEXT,
      modules_json TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  ensureRosterColumn('hotel_slug', 'hotel_slug TEXT');
  ensureRosterColumn('role', "role TEXT NOT NULL DEFAULT 'receptionist'");
  ensureRosterColumn('department', "department TEXT NOT NULL DEFAULT 'reception'");
}

const AFFILIATE_SEED = [
  {
    slug: 'hotel-canal',
    name: 'Hotel Canal',
    kind: 'live',
    city: 'Venezia',
    rooms: DEFAULT_HOTEL_ROOMS,
    modules: defaultModulesMap(true),
    notes: 'Tenant operativo produzione',
  },
  {
    slug: 'hotel-walter',
    name: 'Hotel Walter',
    kind: 'affiliate',
    city: 'Venezia',
    rooms: ['1', '2', '3', '4', '5', '6'],
    modules: { ...defaultModulesMap(false), checkin: true, notes: true },
    notes: 'Affiliato — porta / Wi‑Fi già in guest services',
  },
  {
    slug: 'hotel-airone',
    name: 'Hotel Airone',
    kind: 'affiliate',
    city: 'Venezia',
    rooms: ['101', '102', '103', '201', '202'],
    modules: { ...defaultModulesMap(false), checkin: true, notes: true },
    notes: 'Affiliato — rete Wi‑Fi dedicata',
  },
  {
    slug: 'ca-pisani',
    name: 'Ca’ Pisani / Appartamenti',
    kind: 'affiliate',
    city: 'Venezia',
    rooms: ['A1', 'A2', 'A3', 'A4'],
    modules: { ...defaultModulesMap(false), checkin: true },
    notes: 'Appartamenti — Wi‑Fi Ca Pisani Vista Canal',
  },
  {
    slug: 'ca-dei-polo',
    name: 'Ca’ dei Polo',
    kind: 'affiliate',
    city: 'Venezia',
    rooms: ['1', '2', '3', '4'],
    modules: { ...defaultModulesMap(false), checkin: true },
    notes: 'Affiliato rete Sestriere / Emily',
  },
];

/** Slot template per hotel futuri (solo struttura). */
const TEMPLATE_SLOTS = [
  { slug: 'hotel-template-01', name: 'Hotel (slot 1)', city: '' },
  { slug: 'hotel-template-02', name: 'Hotel (slot 2)', city: '' },
  { slug: 'hotel-template-03', name: 'Hotel (slot 3)', city: '' },
  { slug: 'hotel-template-04', name: 'Hotel (slot 4)', city: '' },
  { slug: 'hotel-template-05', name: 'Hotel (slot 5)', city: '' },
];

const CANAL_STAFF_META = {
  tommaso: { role: ROLE_DEV, department: 'management', hotel_slug: 'hotel-canal' },
  mizan: { role: ROLE_MANAGER, department: 'management', hotel_slug: 'hotel-canal' },
  payel: { role: ROLE_MANAGER, department: 'management', hotel_slug: 'hotel-canal' },
  john: { role: ROLE_RECEPTION, department: 'reception', hotel_slug: 'hotel-canal' },
  alejandro: { role: ROLE_RECEPTION, department: 'reception', hotel_slug: 'hotel-canal' },
  maria: { role: ROLE_RECEPTION, department: 'reception', hotel_slug: 'hotel-canal' },
  sayeed: { role: ROLE_RECEPTION, department: 'reception', hotel_slug: 'hotel-canal' },
  farooq: { role: ROLE_HK, department: 'housekeeping', hotel_slug: 'hotel-canal' },
  farhad: { role: ROLE_HK, department: 'housekeeping', hotel_slug: 'hotel-canal' },
};

function upsertHotel(row) {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO org_hotels (slug, name, kind, city, active, rooms_json, modules_json, notes, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?, ?, datetime('now'))
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      kind = excluded.kind,
      city = excluded.city,
      rooms_json = COALESCE(org_hotels.rooms_json, excluded.rooms_json),
      modules_json = COALESCE(org_hotels.modules_json, excluded.modules_json),
      notes = COALESCE(NULLIF(TRIM(org_hotels.notes), ''), excluded.notes),
      updated_at = datetime('now')
  `,
  ).run(
    row.slug,
    row.name,
    row.kind,
    row.city || '',
    JSON.stringify(row.rooms || []),
    JSON.stringify(row.modules || defaultModulesMap(true)),
    row.notes || '',
  );
}

export function seedHotelOrg() {
  ensureHotelOrgSchema();
  for (const h of AFFILIATE_SEED) upsertHotel(h);
  for (const t of TEMPLATE_SLOTS) {
    upsertHotel({
      ...t,
      kind: 'template',
      rooms: [],
      modules: defaultModulesMap(false),
      notes: 'Struttura vuota — da personalizzare (nome, manager, camere, moduli)',
    });
  }

  const db = getDb();
  const update = db.prepare(
    `
    UPDATE staff_roster
    SET hotel_slug = ?, role = ?, department = ?
    WHERE staff_id = ?
  `,
  );
  for (const [id, meta] of Object.entries(CANAL_STAFF_META)) {
    update.run(meta.hotel_slug, meta.role, meta.department, id);
  }

  // Manager placeholder sugli affiliati (password standard se manca)
  const affiliateManagers = [
    { slug: 'hotel-walter', label: 'Walter Mgr', id: 'waltermgr' },
    { slug: 'hotel-airone', label: 'Airone Mgr', id: 'aironemgr' },
    { slug: 'ca-pisani', label: 'Pisani Mgr', id: 'pisanmgr' },
    { slug: 'ca-dei-polo', label: 'Polo Mgr', id: 'polomgr' },
  ];
  const insertMgr = db.prepare(`
    INSERT OR IGNORE INTO staff_roster
      (staff_id, name, label, protected, seeded, active, created_by, hotel_slug, role, department)
    VALUES (?, ?, ?, 0, 1, 1, 'hotel-org-seed', ?, 'manager', 'management')
  `);
  const updateMgr = db.prepare(`
    UPDATE staff_roster
    SET hotel_slug = ?, role = 'manager', department = 'management', active = 1, label = ?, name = ?
    WHERE staff_id = ?
  `);
  for (const am of affiliateManagers) {
    const name = am.label.toUpperCase();
    insertMgr.run(am.id, name, am.label, am.slug);
    updateMgr.run(am.slug, am.label, name, am.id);
    const hasPin = db.prepare(`SELECT 1 FROM staff_credentials WHERE staff_id = ?`).get(am.id);
    if (!hasPin) setStaffPinHash(am.id, hashStaffPin(standardStaffPin()));
  }
}

function mapHotelRow(row) {
  if (!row) return null;
  return {
    slug: row.slug,
    name: row.name,
    kind: row.kind,
    city: row.city || '',
    active: Number(row.active) === 1,
    rooms: Array.isArray(parseJson(row.rooms_json, []))
      ? parseJson(row.rooms_json, [])
      : [],
    modules: { ...defaultModulesMap(true), ...parseJson(row.modules_json, {}) },
    notes: row.notes || '',
  };
}

export function listOrgHotels({ activeOnly = true } = {}) {
  ensureHotelOrgSchema();
  const sql = activeOnly
    ? `SELECT * FROM org_hotels WHERE active = 1 ORDER BY
         CASE kind WHEN 'live' THEN 0 WHEN 'affiliate' THEN 1 ELSE 2 END, name COLLATE NOCASE ASC`
    : `SELECT * FROM org_hotels ORDER BY name COLLATE NOCASE ASC`;
  return getDb().prepare(sql).all().map(mapHotelRow);
}

export function getOrgHotel(slug) {
  ensureHotelOrgSchema();
  const row = getDb()
    .prepare(`SELECT * FROM org_hotels WHERE slug = ?`)
    .get(String(slug || '').trim());
  return mapHotelRow(row);
}

function enrichStaff(member) {
  if (!member) return null;
  const db = getDb();
  const row = db
    .prepare(`SELECT hotel_slug, role, department FROM staff_roster WHERE staff_id = ?`)
    .get(member.id);
  const role = String(row?.role || '').toLowerCase() || ROLE_RECEPTION;
  const department = String(row?.department || '').toLowerCase() || 'reception';
  const hotelSlug = String(row?.hotel_slug || '').trim() || 'hotel-canal';
  return {
    ...member,
    role,
    department,
    hotelSlug,
    manager: role === ROLE_MANAGER || role === ROLE_DEV,
    dev: role === ROLE_DEV,
  };
}

export function getStaffOrgProfile(staffId) {
  const member = getStaffMember(staffId, { includeInactive: false });
  return enrichStaff(member);
}

export function isOrgDev(staffId) {
  const p = getStaffOrgProfile(staffId);
  if (p?.dev) return true;
  return String(staffId || '').toLowerCase() === 'tommaso';
}

export function isOrgManager(staffId) {
  const p = getStaffOrgProfile(staffId);
  if (p?.role === ROLE_MANAGER || p?.role === ROLE_DEV) return true;
  const id = String(staffId || '').toLowerCase();
  return id === 'mizan' || id === 'payel';
}

export function staffHotelSlug(staffId) {
  return getStaffOrgProfile(staffId)?.hotelSlug || 'hotel-canal';
}

function staffForHotel(slug) {
  ensureHotelOrgSchema();
  const rows = getDb()
    .prepare(
      `
      SELECT * FROM staff_roster
      WHERE active = 1 AND (hotel_slug = ? OR (? = 'hotel-canal' AND (hotel_slug IS NULL OR hotel_slug = '')))
      ORDER BY
        CASE role WHEN 'dev' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END,
        department COLLATE NOCASE ASC,
        label COLLATE NOCASE ASC
    `,
    )
    .all(slug, slug);
  return rows.map((row) =>
    enrichStaff({
      id: row.staff_id,
      name: row.name,
      label: row.label,
      protected: Number(row.protected) === 1,
      seeded: Number(row.seeded) === 1,
      active: Number(row.active) === 1,
      createdBy: row.created_by || '',
    }),
  );
}

function groupByDepartment(staffList) {
  const groups = {};
  for (const d of ORG_DEPARTMENTS) groups[d.id] = { id: d.id, label: d.label, staff: [] };
  for (const s of staffList) {
    const dep = groups[s.department] ? s.department : 'other';
    if (!groups[dep]) groups[dep] = { id: dep, label: dep, staff: [] };
    groups[dep].staff.push({
      id: s.id,
      label: s.label,
      name: s.name,
      role: s.role,
      department: s.department,
      protected: s.protected,
      manager: s.role === ROLE_MANAGER || s.role === ROLE_DEV,
    });
  }
  return ORG_DEPARTMENTS.map((d) => groups[d.id]).filter((g) => g.staff.length);
}

export function buildOrgConsolePayload(staffId) {
  seedHotelOrg();
  const me = getStaffOrgProfile(staffId);
  const dev = isOrgDev(staffId);
  const manager = isOrgManager(staffId);
  const hotels = listOrgHotels({ activeOnly: true });

  if (dev) {
    return {
      ok: true,
      mode: 'dev',
      me,
      modulesCatalog: ORG_MODULES,
      departments: ORG_DEPARTMENTS,
      standardPinHint: 'password standard (env STAFF_STANDARD_PIN o 1234)',
      hotels: hotels.map((h) => {
        const staff = staffForHotel(h.slug);
        const managers = staff.filter((s) => s.role === ROLE_MANAGER || s.role === ROLE_DEV);
        return {
          ...h,
          roomCount: (h.rooms || []).length,
          managers: managers.map((m) => ({ id: m.id, label: m.label, role: m.role })),
          departments: groupByDepartment(staff),
          staffCount: staff.length,
        };
      }),
    };
  }

  if (manager) {
    const slug = me?.hotelSlug || 'hotel-canal';
    const hotel = getOrgHotel(slug) || hotels.find((h) => h.slug === slug) || hotels[0];
    const staff = staffForHotel(hotel.slug);
    return {
      ok: true,
      mode: 'manager',
      me,
      modulesCatalog: ORG_MODULES,
      departments: ORG_DEPARTMENTS,
      standardPinHint: 'password standard (env STAFF_STANDARD_PIN o 1234)',
      hotel: {
        ...hotel,
        roomCount: (hotel.rooms || []).length,
        departments: groupByDepartment(staff),
        staffCount: staff.length,
      },
    };
  }

  return { ok: false, error: 'forbidden' };
}

export function patchHotelModules(slug, modulesPatch, actorId) {
  if (!isOrgDev(actorId) && !(isOrgManager(actorId) && staffHotelSlug(actorId) === slug)) {
    return { ok: false, error: 'forbidden' };
  }
  const hotel = getOrgHotel(slug);
  if (!hotel) return { ok: false, error: 'hotel_not_found' };
  const next = { ...hotel.modules };
  for (const [k, v] of Object.entries(modulesPatch || {})) {
    if (!ORG_MODULES.some((m) => m.id === k)) continue;
    next[k] = Boolean(v);
  }
  getDb()
    .prepare(
      `UPDATE org_hotels SET modules_json = ?, updated_at = datetime('now') WHERE slug = ?`,
    )
    .run(JSON.stringify(next), slug);
  return { ok: true, modules: next };
}

export function setStaffManagerFlag(targetStaffId, makeManager, actorId) {
  const target = getStaffOrgProfile(targetStaffId);
  if (!target) return { ok: false, error: 'not_found' };
  if (target.role === ROLE_DEV) return { ok: false, error: 'protected' };
  if (target.protected && !isOrgDev(actorId)) return { ok: false, error: 'protected' };

  const actorHotel = staffHotelSlug(actorId);
  if (isOrgDev(actorId)) {
    /* ok */
  } else if (isOrgManager(actorId) && target.hotelSlug === actorHotel) {
    /* ok */
  } else {
    return { ok: false, error: 'forbidden' };
  }

  const role = makeManager ? ROLE_MANAGER : ROLE_RECEPTION;
  const department = makeManager ? 'management' : target.department === 'management' ? 'reception' : target.department;
  getDb()
    .prepare(`UPDATE staff_roster SET role = ?, department = ? WHERE staff_id = ?`)
    .run(role, department, target.id);
  return { ok: true, staff: getStaffOrgProfile(target.id) };
}

export function resetStaffPasswordStandard(targetStaffId, actorId) {
  const target = getStaffOrgProfile(targetStaffId);
  if (!target) return { ok: false, error: 'not_found' };
  if (target.role === ROLE_DEV && !isOrgDev(actorId)) return { ok: false, error: 'protected' };

  const actorHotel = staffHotelSlug(actorId);
  if (isOrgDev(actorId)) {
    /* ok */
  } else if (isOrgManager(actorId) && target.hotelSlug === actorHotel) {
    /* ok */
  } else {
    return { ok: false, error: 'forbidden' };
  }

  setStaffPinHash(target.id, hashStaffPin(standardStaffPin()));
  return { ok: true, staffId: target.id };
}

export function assignStaffDepartment(targetStaffId, department, actorId) {
  const dep = String(department || '').toLowerCase();
  if (!ORG_DEPARTMENTS.some((d) => d.id === dep)) return { ok: false, error: 'bad_department' };
  const target = getStaffOrgProfile(targetStaffId);
  if (!target) return { ok: false, error: 'not_found' };
  if (target.role === ROLE_DEV) return { ok: false, error: 'protected' };

  const actorHotel = staffHotelSlug(actorId);
  if (isOrgDev(actorId)) {
    /* ok */
  } else if (isOrgManager(actorId) && target.hotelSlug === actorHotel) {
    /* ok */
  } else {
    return { ok: false, error: 'forbidden' };
  }

  getDb()
    .prepare(`UPDATE staff_roster SET department = ? WHERE staff_id = ?`)
    .run(dep, target.id);
  return { ok: true, staff: getStaffOrgProfile(target.id) };
}

export function modulesForStaffSession(staffId) {
  seedHotelOrg();
  const slug = staffHotelSlug(staffId);
  const hotel = getOrgHotel(slug);
  return hotel?.modules || defaultModulesMap(true);
}
