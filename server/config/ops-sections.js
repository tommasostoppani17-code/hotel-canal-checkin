/**
 * Sezioni operative Camere/HK — gruppo Hotel Canal (+ affiliati).
 * UI staff-ops: una tab per sezione (default). Manager/Dev può forzare lista unica.
 */

export const OPS_SECTION_LABELS = {
  canal: 'Hotel Canal',
  walter: 'Walter',
  'extra-vaca': 'Extra Vaca',
  'cadei-polo': "Ca' dei Polo",
  appartamenti: 'Appartamenti',
  airone: 'Airone',
};

/** Pianta storica Sestriere Care / Emily — stessa suddivisione di prima. */
export const OPS_SECTION_ROOMS = {
  canal: ['110', '111', '112', '113', '114', '115', '117', '118', '210', '211', '212', '213'],
  walter: ['101', '102', '103', '104', '201', '202', '203', '204', '205', '206', '207', '208', '209'],
  'extra-vaca': ['105', '106', '107', '108', '109', '310', '311'],
  'cadei-polo': [
    'Tolentini',
    'Morosini',
    'Dandolo',
    'Santa Croce',
    'Da Ponte',
    'Polo',
    'Malipiero',
    'Badoer',
    'Nicolò',
    'Dilana',
  ],
  appartamenti: ['903', '904', '908', '909'],
  airone: ['2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26'],
};

export const OPS_SECTION_ORDER = [
  'canal',
  'walter',
  'extra-vaca',
  'cadei-polo',
  'appartamenti',
  'airone',
];

const ROOM_TO_SECTION = new Map();
for (const [section, rooms] of Object.entries(OPS_SECTION_ROOMS)) {
  for (const room of rooms) {
    ROOM_TO_SECTION.set(String(room).toLowerCase(), { section, room });
    ROOM_TO_SECTION.set(`${section}:${String(room).toLowerCase()}`, { section, room });
  }
}
ROOM_TO_SECTION.set('dilana', { section: 'cadei-polo', room: 'Dilana' });
ROOM_TO_SECTION.set('di lana', { section: 'cadei-polo', room: 'Dilana' });

export function normalizeOpsRoomId(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
  /* Nomi propri (Tolentini, Santa Croce…): tieni spazi, max 40 */
  return s.replace(/\s+/g, ' ').slice(0, 40);
}

/**
 * @returns {{ section: string, room: string }}
 */
export function resolveOpsRoom(roomNumberRaw, fallbackSection = 'canal') {
  const raw = String(roomNumberRaw || '').trim();
  if (!raw) return { section: fallbackSection, room: '' };

  const lower = raw.toLowerCase();
  if (ROOM_TO_SECTION.has(lower)) return ROOM_TO_SECTION.get(lower);

  const prefixed = lower.match(/^([a-z0-9-]+):(.+)$/);
  if (prefixed) {
    const section = prefixed[1];
    const room = normalizeOpsRoomId(prefixed[2]);
    if (OPS_SECTION_ROOMS[section]) return { section, room };
  }

  const numeric = normalizeOpsRoomId(raw);
  if (ROOM_TO_SECTION.has(numeric.toLowerCase())) {
    return ROOM_TO_SECTION.get(numeric.toLowerCase());
  }

  return { section: fallbackSection, room: numeric || raw };
}

export function listOpsSectionDefs() {
  return OPS_SECTION_ORDER.filter((id) => OPS_SECTION_ROOMS[id]).map((id) => ({
    id,
    label: OPS_SECTION_LABELS[id] || id,
    rooms: [...OPS_SECTION_ROOMS[id]],
  }));
}

export function flattenOpsRooms() {
  const out = [];
  for (const id of OPS_SECTION_ORDER) {
    for (const room of OPS_SECTION_ROOMS[id] || []) out.push(room);
  }
  return out;
}
