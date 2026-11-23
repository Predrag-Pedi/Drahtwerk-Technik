import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {fail} from './security.mjs';
import {audit} from './db.mjs';
import {companyStorageBytes, companyStorageLimit} from './storage.mjs';
import {templateTools, railProfiles, parseWireColors, standardDocuments} from '../platform/workshop-model.mjs';

const fileLimit = 10 * 1024 * 1024;
const documentKey = tool => tool === 'ew' ? 'files' : 'images';
const str = (value, max, empty = false) => {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) fail(400, 'Text fehlt oder ist zu lang.');
  return value.trim();
};
const id = value => {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) fail(400, 'Ungültige Eintrags-ID.');
  return value;
};
function list(value, max, parse, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum || value.length > max) fail(400, 'Anzahl der Einträge ist ungültig.');
  const result = value.map(v => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) fail(400, 'Ungültiger Eintrag.');
    return parse(v);
  });
  if (new Set(result.map(v => v.id)).size !== result.length) fail(400, 'Eintrags-IDs müssen eindeutig sein.');
  return result;
}
async function defaults(root, tool) {
  if (tool === 'rails') return railProfiles();
  if (tool === 'wireColors') return parseWireColors(await readFile(resolve(root, 'drahtfarben.txt'), 'utf8'));
  const manifest = JSON.parse(await readFile(resolve(root, tool === 'ew' ? 'ew-dateien.json' : 'aufbau-dateien.json'), 'utf8'));
  return standardDocuments(tool, manifest);
}
function validate(db, companyId, tool, value, standard) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(400, 'Werkstattvorlage fehlt.');
  if (tool === 'rails') {
    if (!Array.isArray(value.profiles)) fail(400, 'Bitte die Seite neu laden: Schienenregeln werden jetzt je Verteilungstiefe gespeichert.');
    const profiles = list(value.profiles, 50, p => {
      if (!Number.isInteger(p.depth) || p.depth < 1 || p.depth > 2000) fail(400, 'Verteilungstiefe muss eine ganze Zahl von 1 bis 2000 mm sein.');
      return {id: id(p.id), depth: p.depth, rows: list(p.rows, 100, r => {
        if (!['w', 'h', 'd'].includes(r.dimension) || !Number.isFinite(r.deduction) || r.deduction < 0 || r.deduction > 10000) fail(400, 'Basis oder Abzug ist ungültig (0–10000 mm).');
        return {id: id(r.id), label: str(r.label, 120), dimension: r.dimension, deduction: r.deduction};
      }, 1)};
    }, 1);
    if (new Set(profiles.map(p => p.depth)).size !== profiles.length) fail(400, 'Jede Verteilungstiefe darf nur einmal vorkommen.');
    return {version: 2, profiles};
  }
  if (tool === 'wireColors') return {groups: list(value.groups, 30, g => ({
    id: id(g.id), name: str(g.name, 120), rows: list(g.rows, 100, r => ({
      id: id(r.id), name: str(r.name, 200), size: str(r.size, 100, true), wire: str(r.wire, 100, true), color: str(r.color, 120, true),
    })),
  }), 1)};
  const key = documentKey(tool), allowed = new Set(standard.folders.flatMap(f => f[key].map(d => d.path)));
  const folders = list(value.folders, 200, f => ({
    id: id(f.id), name: str(f.name, 120), info: str(f.info ?? '', 10000, true),
    [key]: list(f[key], 250, doc => {
      const result = {id: id(doc.id), name: str(doc.name, 180)};
      if (doc.fileId) {
        const fileId = id(doc.fileId);
        if (!db.prepare('SELECT id FROM workshop_files WHERE id=? AND company_id=? AND tool=?').get(fileId, companyId, tool)) fail(400, 'Datei ist für diesen Betrieb und dieses Werkzeug nicht verfügbar.');
        return {...result, fileId};
      }
      if (!allowed.has(doc.path)) fail(400, 'Unbekannte Standarddatei.');
      return {...result, path: doc.path};
    }),
  }));
  if (new Set(folders.map(f => f.name.toLocaleLowerCase('de-CH'))).size !== folders.length) fail(400, 'Ordnernamen müssen eindeutig sein.');
  return {folders};
}
const filePath = (s, file) => `/api/workshop-files/${s.company.id}/${s.user.id}/${file.id}/${file.name}`;
function effective(db, s, tool, standard) {
  const row = db.prepare('SELECT data,revision,updated_at FROM workshop_templates WHERE company_id=? AND tool=?').get(s.company.id, tool);
  const raw = row?.data ? JSON.parse(row.data) : standard;
  const value = tool === 'rails' ? railProfiles(raw) : structuredClone(raw);
  if (tool === 'ew' || tool === 'spacing') for (const folder of value.folders) for (const doc of folder[documentKey(tool)]) {
    if (doc.fileId) {
      const file = db.prepare('SELECT id,name FROM workshop_files WHERE id=? AND company_id=? AND tool=?').get(doc.fileId, s.company.id, tool);
      if (!file) fail(500, 'Eine gespeicherte Werkstattdatei fehlt.');
      doc.path = filePath(s, file);
    }
  }
  return {value, ...(tool === 'ew' || tool === 'spacing' ? {standard} : {}), revision: row?.revision || 0, source: row?.data ? 'company' : 'standard', updatedAt: row?.updated_at || null};
}
function atomic(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {const result = fn(); db.exec('COMMIT'); return result;}
  catch (error) {db.exec('ROLLBACK'); throw error;}
}
function checkQuota(db, companyId, delta) {
  if (companyStorageBytes(db, companyId) + delta > companyStorageLimit) fail(413, 'Speichergrenze des Testbetriebs erreicht (500 MB).');
}
function uploadedFile(tool, value) {
  const name = str(value.name, 180);
  if (/[\/\\\x00-\x1f\x7f]/.test(name) || name.startsWith('.')) fail(400, 'Ungültiger Dateiname.');
  if (typeof value.base64 !== 'string' || value.base64.length > Math.ceil(fileLimit / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64)) fail(400, 'Datei muss gültiges Base64 enthalten (maximal 10 MB).');
  const bytes = Buffer.from(value.base64, 'base64');
  if (!bytes.length || bytes.length > fileLimit || bytes.toString('base64') !== value.base64) fail(400, 'Datei ist leer, zu gross oder ungültig.');
  let mime;
  if (tool === 'ew' && /\.pdf$/i.test(name) && bytes.subarray(0,5).toString() === '%PDF-') mime = 'application/pdf';
  if (tool === 'spacing') {
    if (/\.png$/i.test(name) && bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) mime = 'image/png';
    if (/\.jpe?g$/i.test(name) && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) mime = 'image/jpeg';
    if (/\.webp$/i.test(name) && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP') mime = 'image/webp';
  }
  if (!mime) fail(400, tool === 'ew' ? 'Bitte eine PDF-Datei hochladen.' : 'Bitte eine PNG-, JPEG- oder WebP-Zeichnung hochladen.');
  return {name, mime, bytes};
}

export function workshopHandler({db, root, body, json, freshSession, requireArea}) {
  return async function handle({req, res, path, method, s}) {
    const media = path.match(/^\/api\/workshop-files\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)$/);
    if (media) {
      if (method !== 'GET') fail(405, 'Methode nicht erlaubt.');
      if (media[1] !== s.company?.id || media[2] !== s.user.id) fail(404, 'Datei nicht gefunden.');
      const file = db.prepare('SELECT * FROM workshop_files WHERE id=? AND company_id=?').get(media[3], s.company.id);
      if (!file || file.name !== media[4]) fail(404, 'Datei nicht gefunden.');
      requireArea(s, file.tool);
      res.setHeader('Content-Type', file.mime);
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name).replaceAll("'", '%27')}`);
      res.end(file.bytes);
      return true;
    }
    const route = path.match(/^\/api\/company\/workshop\/([A-Za-z]+)(?:\/(files)(?:\/([^/]+))?)?$/);
    if (!route) return false;
    const [, tool, files, fileId] = route;
    if (!Object.hasOwn(templateTools, tool)) fail(404, 'Werkzeug nicht gefunden.');
    requireArea(s, tool, method !== 'GET');
    if (files) {
      if (!['ew', 'spacing'].includes(tool)) fail(404, 'Dieses Werkzeug hat keine Dateien.');
      if (method === 'GET' && !fileId) {
        const items = db.prepare('SELECT id,name,mime,length(bytes) size,uploaded_at uploadedAt FROM workshop_files WHERE company_id=? AND tool=? ORDER BY uploaded_at').all(s.company.id, tool);
        json(res, {files: items.map(f => ({...f, path: filePath(s, f)})), usedBytes: companyStorageBytes(db, s.company.id), limitBytes: companyStorageLimit});
      } else if (method === 'POST' && !fileId) {
        const b = await body(req), current = freshSession(req, s);
        requireArea(current, tool, true);
        const file = uploadedFile(tool, b), newId = randomUUID(), at = new Date().toISOString();
        atomic(db, () => {
          if (db.prepare('SELECT COUNT(*) n FROM workshop_files WHERE company_id=? AND tool=?').get(current.company.id, tool).n >= 250) fail(413, 'Maximal 250 eigene Dateien pro Werkzeug. Nicht mehr benötigte Dateien entfernen.');
          checkQuota(db, current.company.id, file.bytes.length);
          db.prepare('INSERT INTO workshop_files VALUES (?,?,?,?,?,?,?,?)').run(newId, current.company.id, tool, file.name, file.mime, file.bytes, current.user.id, at);
          audit(db, current.user.id, current.company.id, 'workshop.fileUploaded', tool + ':' + newId);
        });
        json(res, {id: newId, name: file.name, path: filePath(current, {id: newId, name: file.name}), size: file.bytes.length}, 201);
      } else if (method === 'DELETE' && fileId) {
        await body(req);
        const current = freshSession(req, s);
        requireArea(current, tool, true);
        atomic(db, () => {
          const template = db.prepare('SELECT data FROM workshop_templates WHERE company_id=? AND tool=?').get(current.company.id, tool);
          if (template?.data && JSON.parse(template.data).folders.some(f => f[documentKey(tool)].some(d => d.fileId === fileId))) fail(409, 'Die Datei wird verwendet. Zuerst aus der Vorlage entfernen und speichern.');
          const result = db.prepare('DELETE FROM workshop_files WHERE id=? AND company_id=? AND tool=?').run(fileId, current.company.id, tool);
          if (!result.changes) fail(404, 'Datei nicht gefunden.');
          audit(db, current.user.id, current.company.id, 'workshop.fileDeleted', tool + ':' + fileId);
        });
        json(res, {ok: true});
      } else fail(405, 'Methode nicht erlaubt.');
      return true;
    }
    const b = ['PUT', 'DELETE'].includes(method) ? await body(req) : null;
    const standard = await defaults(root, tool), current = freshSession(req, s);
    requireArea(current, tool, method !== 'GET');
    if (method === 'GET') json(res, effective(db, current, tool, standard));
    else if (['PUT', 'DELETE'].includes(method)) {
      const active = freshSession(req, current);
      requireArea(active, tool, true);
      atomic(db, () => {
        const old = db.prepare('SELECT data,revision FROM workshop_templates WHERE company_id=? AND tool=?').get(active.company.id, tool);
        if (!Number.isInteger(b.revision) || b.revision !== (old?.revision || 0)) fail(409, 'Die Firmenvorlage wurde inzwischen geändert. Bitte Änderungen sichern und neu laden.');
        const data = method === 'DELETE' ? null : JSON.stringify(validate(db, active.company.id, tool, b.value, standard));
        if (data && Buffer.byteLength(data) > 2 * 1024 * 1024) fail(413, 'Die Vorlage ist zu gross (maximal 2 MB).');
        checkQuota(db, active.company.id, (data ? Buffer.byteLength(data) : 0) - (old?.data ? Buffer.byteLength(old.data) : 0));
        // Retain the revision on reset so stale tabs cannot overwrite a later reset.
        db.prepare('INSERT INTO workshop_templates VALUES (?,?,?,?,?,?) ON CONFLICT(company_id,tool) DO UPDATE SET data=excluded.data,revision=excluded.revision,updated_by=excluded.updated_by,updated_at=excluded.updated_at').run(active.company.id, tool, data, (old?.revision || 0) + 1, active.user.id, new Date().toISOString());
        audit(db, active.user.id, active.company.id, method === 'DELETE' ? 'workshop.reset' : 'workshop.saved', tool);
      });
      json(res, effective(db, active, tool, standard));
    } else fail(405, 'Methode nicht erlaubt.');
    return true;
  };
}
