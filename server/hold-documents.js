/**
 * Documenti / schedine alloggiati allegati alle prenotazioni (hold).
 * Metadati identità obbligatori + scansione/PDF opzionale.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from './db.js';

const MAX_FILE_BYTES = 2_500_000;
const MAX_DOCS_PER_HOLD = 40;

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const DOC_TYPES = new Set([
  'carta_identita',
  'passaporto',
  'patente',
  'permesso_soggiorno',
  'altro',
]);

export function holdDocumentsRoot() {
  const env = String(process.env.HOLD_DOCS_DIR || '').trim();
  if (env) return path.resolve(env);
  const dbPath = String(process.env.DATABASE_PATH || './data/checkins.db').trim();
  return path.join(path.dirname(path.resolve(dbPath)), 'hold-docs');
}

function ensureDocsDir() {
  const root = holdDocumentsRoot();
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function trimField(raw, max = 120) {
  return String(raw || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function normalizeDocType(raw) {
  const t = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (DOC_TYPES.has(t)) return t;
  const aliases = {
    ci: 'carta_identita',
    'carta-identita': 'carta_identita',
    'carta_d_identita': 'carta_identita',
    id: 'carta_identita',
    passport: 'passaporto',
    license: 'patente',
    permesso: 'permesso_soggiorno',
  };
  return aliases[t] || (t ? 'altro' : '');
}

function docTypeLabel(type) {
  return (
    {
      carta_identita: "Carta d'identità",
      passaporto: 'Passaporto',
      patente: 'Patente',
      permesso_soggiorno: 'Permesso di soggiorno',
      altro: 'Altro documento',
    }[type] || 'Documento'
  );
}

function normalizeBirthDate(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  return '';
}

function sanitizeDisplayName(raw) {
  const name = String(raw || '')
    .trim()
    .replace(/[/\\<>:"|?*\x00-\x1f]/g, '_')
    .slice(0, 180);
  return name || 'documento';
}

function parseBase64Payload(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = s.match(/^data:[^;]+;base64,(.+)$/is);
  try {
    return Buffer.from(m ? m[1] : s, 'base64');
  } catch (_) {
    return null;
  }
}

function normalizeMime(raw) {
  const m = String(raw || '').trim().toLowerCase();
  if (!m) return 'application/octet-stream';
  if (ALLOWED_MIME.has(m)) return m;
  if (m.startsWith('image/')) return m;
  return null;
}

function storagePath(storageName) {
  return path.join(holdDocumentsRoot(), storageName);
}

function identityFromPayload(payload = {}) {
  const guestFirstName = trimField(payload.guestFirstName ?? payload.firstName, 80);
  const guestLastName = trimField(payload.guestLastName ?? payload.lastName, 80);
  const birthDate = normalizeBirthDate(payload.birthDate);
  const birthCountry = trimField(payload.birthCountry, 80);
  const docType = normalizeDocType(payload.docType);
  const issueCountry = trimField(payload.issueCountry ?? payload.issuedIn, 80);
  const citizenship = trimField(payload.citizenship, 80);
  const docNumber = trimField(payload.docNumber, 64).toUpperCase();
  return {
    guestFirstName,
    guestLastName,
    birthDate,
    birthCountry,
    docType,
    issueCountry,
    citizenship,
    docNumber,
  };
}

function validateIdentity(id) {
  if (!id.guestLastName) return 'guest_last_name';
  if (!id.guestFirstName) return 'guest_first_name';
  if (!id.birthDate) return 'birth_date';
  if (!id.birthCountry) return 'birth_country';
  if (!id.docType) return 'doc_type';
  if (!id.issueCountry) return 'issue_country';
  if (!id.citizenship) return 'citizenship';
  if (!id.docNumber) return 'doc_number';
  return null;
}

function buildDisplayFileName(id, fallbackFileName) {
  const who = [id.guestLastName, id.guestFirstName].filter(Boolean).join(' ').trim();
  const type = id.docType ? docTypeLabel(id.docType) : '';
  const base = [who, type, id.docNumber].filter(Boolean).join(' — ');
  if (base) return sanitizeDisplayName(base);
  return sanitizeDisplayName(fallbackFileName);
}

function mapDocRow(row) {
  if (!row) return null;
  const first = row.guest_first_name || '';
  const last = row.guest_last_name || '';
  const fullName = [first, last].filter(Boolean).join(' ').trim();
  const type = row.doc_type || '';
  const display =
    fullName ||
    row.file_name ||
    (type ? docTypeLabel(type) : 'Documento');
  const hasFile = Boolean(row.storage_name) && !String(row.storage_name).startsWith('meta_') && Number(row.size_bytes) > 0;
  return {
    id: Number(row.id),
    holdId: Number(row.hold_id),
    fileName: row.file_name || display,
    displayName: display,
    mimeType: row.mime_type || 'application/octet-stream',
    sizeBytes: Number(row.size_bytes) || 0,
    hasFile,
    uploadedBy: row.uploaded_by || null,
    createdAt: row.created_at,
    guestFirstName: first || null,
    guestLastName: last || null,
    birthDate: row.birth_date || null,
    birthCountry: row.birth_country || null,
    docType: type || null,
    docTypeLabel: type ? docTypeLabel(type) : null,
    issueCountry: row.issue_country || null,
    citizenship: row.citizenship || null,
    docNumber: row.doc_number || null,
  };
}

const DOC_SELECT = `
  id, hold_id, file_name, mime_type, size_bytes, storage_name, uploaded_by, created_at,
  guest_first_name, guest_last_name, birth_date, birth_country,
  doc_type, issue_country, citizenship, doc_number
`;

export function listHoldDocuments(holdId) {
  const hid = Number(holdId);
  if (!Number.isInteger(hid) || hid < 1) return [];
  const rows = getDb()
    .prepare(
      `
    SELECT ${DOC_SELECT}
    FROM hold_documents
    WHERE hold_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
  `,
    )
    .all(hid);
  return rows.map(mapDocRow);
}

export function getHoldDocumentMeta(holdId, docId) {
  const hid = Number(holdId);
  const did = Number(docId);
  if (!Number.isInteger(hid) || hid < 1 || !Number.isInteger(did) || did < 1) {
    return null;
  }
  const row = getDb()
    .prepare(
      `
    SELECT ${DOC_SELECT}
    FROM hold_documents
    WHERE hold_id = ? AND id = ?
  `,
    )
    .get(hid, did);
  if (!row) return null;
  return {
    ...mapDocRow(row),
    storageName: row.storage_name,
  };
}

export function addHoldDocument(holdId, payload = {}) {
  const hid = Number(holdId);
  if (!Number.isInteger(hid) || hid < 1) {
    return { ok: false, error: 'hold_invalid', status: 400 };
  }

  const identity = identityFromPayload(payload);
  const missing = validateIdentity(identity);
  if (missing) {
    return { ok: false, error: 'identity_incomplete', field: missing, status: 400 };
  }

  const hasUpload = Boolean(String(payload.contentBase64 || payload.dataUrl || '').trim());
  let buf = null;
  let mimeType = 'application/x-identity-record';
  let storageName = `meta_${hid}_${crypto.randomBytes(12).toString('hex')}`;
  let sizeBytes = 0;
  let absPath = null;

  if (hasUpload) {
    buf = parseBase64Payload(payload.contentBase64 ?? payload.dataUrl);
    if (!buf || !buf.length) {
      return { ok: false, error: 'content_invalid', status: 400 };
    }
    if (buf.length > MAX_FILE_BYTES) {
      return {
        ok: false,
        error: 'file_too_large',
        status: 400,
        maxBytes: MAX_FILE_BYTES,
      };
    }
    mimeType = normalizeMime(payload.mimeType);
    if (!mimeType) {
      return { ok: false, error: 'mime_not_allowed', status: 400 };
    }
  }

  const db = getDb();
  const count = db
    .prepare(`SELECT COUNT(*) AS n FROM hold_documents WHERE hold_id = ?`)
    .get(hid);
  if (Number(count?.n) >= MAX_DOCS_PER_HOLD) {
    return { ok: false, error: 'docs_limit', status: 400, limit: MAX_DOCS_PER_HOLD };
  }

  const fileName = buildDisplayFileName(identity, payload.fileName);
  const uploadedBy = String(payload.uploadedBy || '').trim() || null;

  if (hasUpload && buf) {
    const ext =
      path.extname(String(payload.fileName || '')).slice(0, 12).replace(/[^a-zA-Z0-9.]/g, '') ||
      (mimeType === 'application/pdf' ? '.pdf' : mimeType.startsWith('image/') ? '.jpg' : '');
    storageName = `${hid}_${crypto.randomBytes(16).toString('hex')}${ext}`;
    absPath = storagePath(storageName);
    ensureDocsDir();
    fs.writeFileSync(absPath, buf);
    sizeBytes = buf.length;
  }

  let docId;
  try {
    const info = db
      .prepare(
        `
      INSERT INTO hold_documents (
        hold_id, file_name, mime_type, size_bytes, storage_name, uploaded_by,
        guest_first_name, guest_last_name, birth_date, birth_country,
        doc_type, issue_country, citizenship, doc_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        hid,
        fileName,
        mimeType,
        sizeBytes,
        storageName,
        uploadedBy,
        identity.guestFirstName,
        identity.guestLastName,
        identity.birthDate,
        identity.birthCountry,
        identity.docType,
        identity.issueCountry,
        identity.citizenship,
        identity.docNumber,
      );
    docId = Number(info.lastInsertRowid);
  } catch (err) {
    if (absPath) {
      try {
        fs.unlinkSync(absPath);
      } catch (_) { /* ignore */ }
    }
    throw err;
  }

  return {
    ok: true,
    document: getHoldDocumentMeta(hid, docId),
  };
}

export function deleteHoldDocument(holdId, docId) {
  const meta = getHoldDocumentMeta(holdId, docId);
  if (!meta) {
    return { ok: false, error: 'not_found', status: 404 };
  }
  getDb()
    .prepare(`DELETE FROM hold_documents WHERE hold_id = ? AND id = ?`)
    .run(Number(holdId), Number(docId));
  if (meta.storageName && !String(meta.storageName).startsWith('meta_')) {
    try {
      fs.unlinkSync(storagePath(meta.storageName));
    } catch (_) { /* file già assente */ }
  }
  return { ok: true };
}

export function readHoldDocumentBuffer(holdId, docId) {
  const meta = getHoldDocumentMeta(holdId, docId);
  if (!meta?.storageName || String(meta.storageName).startsWith('meta_')) return null;
  const absPath = storagePath(meta.storageName);
  if (!fs.existsSync(absPath)) return null;
  return {
    meta,
    buffer: fs.readFileSync(absPath),
  };
}
