// Persistência local em SQLite via node:sqlite (builtin do Node >=22.5, sem
// dependência nativa — funciona igual no fluxo git e dentro do Electron).
// Espelha 1:1 a API e a semântica de postgres.js; diferenças de tipo:
//   jsonb -> TEXT (JSON.stringify/parse) · text[] -> TEXT JSON · boolean -> 0/1
//   timestamptz -> TEXT ISO gerado no JS  · regexp_replace -> coluna phone_digits
import { mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scoreLead } from '../utils/score.js';

// O chamador (index.js do db) só importa este módulo quando node:sqlite existe.
const { DatabaseSync } = process.getBuiltinModule('node:sqlite');

export const dbEnabled = true;

const DATA_DIR = process.env.CACA_DATA_DIR ?? path.join(os.homedir(), '.caca-cliente');
const DB_FILE = path.join(DATA_DIR, 'caca-cliente.db');

let db = null;
const nowIso = () => new Date().toISOString();
const j = (v) => (v == null ? null : JSON.stringify(v));
const pj = (s) => { try { return s == null ? null : JSON.parse(s); } catch { return null; } };
const b = (v) => (v ? 1 : 0);
const digits = (phone) => {
  const d = (phone ?? '').toString().replace(/\D/g, '');
  return d || null;
};

// Schema versionado via PRAGMA user_version. v1 = schema completo atual;
// migrações futuras: if (version < 2) { ALTER TABLE ...; user_version = 2 }.
const DDL_V1 = `
CREATE TABLE IF NOT EXISTS searches (
  id         TEXT PRIMARY KEY,
  niche      TEXT NOT NULL,
  city       TEXT,
  lat        REAL,
  lng        REAL,
  radius_km  REAL,
  found      INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
  search_id         TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  lead_id           TEXT NOT NULL,
  name              TEXT,
  address           TEXT,
  phone             TEXT,
  phone_digits      TEXT,
  lat               REAL,
  lng               REAL,
  has_website       INTEGER,
  source            TEXT,
  niche             TEXT,
  rating            REAL,
  reviews_count     INTEGER,
  enrichment        TEXT,
  enrichment_status TEXT NOT NULL DEFAULT 'pending',
  stage             TEXT NOT NULL DEFAULT 'novo',
  notes             TEXT,
  follow_up_at      TEXT,
  tags              TEXT DEFAULT '[]',
  estimated_value   REAL,
  wa_invalid        INTEGER DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (search_id, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_lead_id ON leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_search_stage ON leads(search_id, stage);
CREATE INDEX IF NOT EXISTS idx_leads_phone_digits ON leads(phone_digits);
`;

export async function initDb() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    db = new DatabaseSync(DB_FILE);
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA busy_timeout = 5000;');
    db.exec('PRAGMA foreign_keys = ON;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version < 1) {
      db.exec(DDL_V1);
      db.exec('PRAGMA user_version = 1;');
    }
    console.log(`[db] SQLite local pronto — persistência ATIVADA (${DB_FILE}).`);
    return true;
  } catch (e) {
    console.error('[db] falha ao abrir o SQLite (seguindo em memória):', e.message);
    db = null;
    return false;
  }
}

export async function saveSearch(search, meta = {}) {
  if (!db) return;
  const now = nowIso();
  try {
    db.exec('BEGIN');
    db.prepare(
      `INSERT OR IGNORE INTO searches (id, niche, city, lat, lng, radius_km, found, created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(search.id, meta.niche ?? '', meta.city ?? null, meta.lat ?? null, meta.lng ?? null, meta.radiusKm ?? null, meta.found ?? null, now);
    const ins = db.prepare(
      `INSERT OR IGNORE INTO leads (search_id, lead_id, name, address, phone, phone_digits, lat, lng, has_website, source, niche, rating, reviews_count, enrichment, enrichment_status, stage, wa_invalid, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    for (const l of search.leads.values()) {
      ins.run(
        search.id, l.id, l.name ?? null, l.address ?? null, l.phone ?? null, digits(l.phone),
        l.lat ?? null, l.lng ?? null, b(l.hasWebsite), l.source ?? null, l.niche ?? null,
        l.rating ?? null, l.reviewsCount ?? null, j(l.enrichment), l.enrichmentStatus, l.stage,
        b(l.waInvalid), now, now
      );
    }
    db.exec('COMMIT');
  } catch (e) {
    try { db.exec('ROLLBACK'); } catch {}
    console.error('[db] saveSearch:', e.message);
  }
}

export async function saveEnrichment(searchId, lead) {
  if (!db) return;
  try {
    db.prepare(`UPDATE leads SET enrichment=?, enrichment_status=?, updated_at=? WHERE search_id=? AND lead_id=?`)
      .run(j(lead.enrichment), lead.enrichmentStatus, nowIso(), searchId, lead.id);
  } catch (e) { console.error('[db] saveEnrichment:', e.message); }
}

export async function saveStage(searchId, leadId, stage) {
  if (!db) return;
  try {
    db.prepare(`UPDATE leads SET stage=?, updated_at=? WHERE search_id=? AND lead_id=?`)
      .run(stage, nowIso(), searchId, leadId);
  } catch (e) { console.error('[db] saveStage:', e.message); }
}

export async function saveLeadFields(searchId, leadId, fields = {}) {
  if (!db) return;
  // Mesmo mapa do postgres.js; valores convertidos pros tipos do SQLite.
  const map = {
    stage: ['stage', (v) => v],
    notes: ['notes', (v) => v],
    followUpAt: ['follow_up_at', (v) => v],
    tags: ['tags', j],
    estimatedValue: ['estimated_value', (v) => v],
    phone: ['phone', (v) => v],
    enrichment: ['enrichment', j],
    waInvalid: ['wa_invalid', b],
  };
  const sets = []; const vals = [];
  for (const [k, [col, conv]] of Object.entries(map)) {
    if (fields[k] !== undefined) { sets.push(`${col}=?`); vals.push(conv(fields[k])); }
  }
  if (fields.phone !== undefined) { sets.push('phone_digits=?'); vals.push(digits(fields.phone)); }
  if (!sets.length) return;
  vals.push(nowIso(), searchId, leadId);
  try {
    db.prepare(`UPDATE leads SET ${sets.join(', ')}, updated_at=? WHERE search_id=? AND lead_id=?`).run(...vals);
  } catch (e) { console.error('[db] saveLeadFields:', e.message); }
}

function rowToLead(r) {
  const lead = {
    id: r.lead_id, name: r.name, address: r.address, phone: r.phone,
    lat: r.lat, lng: r.lng, hasWebsite: Boolean(r.has_website), source: r.source, niche: r.niche,
    rating: r.rating, reviewsCount: r.reviews_count,
    enrichment: pj(r.enrichment), enrichmentStatus: r.enrichment_status, stage: r.stage,
    notes: r.notes ?? '', followUpAt: r.follow_up_at ?? null,
    tags: pj(r.tags) ?? [], estimatedValue: r.estimated_value != null ? Number(r.estimated_value) : null,
    waInvalid: Boolean(r.wa_invalid),
  };
  lead.score = scoreLead(lead, lead.enrichment);
  return lead;
}

export async function loadSearch(searchId) {
  if (!db) return null;
  try {
    const r = db.prepare('SELECT * FROM searches WHERE id=?').get(searchId);
    if (!r) return null;
    const leads = db.prepare('SELECT * FROM leads WHERE search_id=? ORDER BY created_at').all(searchId);
    return {
      city: r.city, niche: r.niche, found: r.found,
      query: { niche: r.niche, city: r.city, lat: r.lat, lng: r.lng, radiusKm: r.radius_km },
      leads: leads.map(rowToLead),
    };
  } catch (e) { console.error('[db] loadSearch:', e.message); return null; }
}

export async function statsConversao() {
  if (!db) return null;
  const agg = `count(l.lead_id) total,
               count(*) FILTER (WHERE l.stage='ganho') ganho,
               count(*) FILTER (WHERE l.stage='contatado') contatado,
               count(*) FILTER (WHERE l.stage='qualificado') qualificado`;
  try {
    const geral = db.prepare(
      `SELECT count(l.lead_id) total,
              count(*) FILTER (WHERE l.stage='ganho') ganho,
              count(*) FILTER (WHERE l.stage='contatado') contatado,
              count(*) FILTER (WHERE l.stage='qualificado') qualificado,
              count(*) FILTER (WHERE l.stage='descartado') descartado,
              count(DISTINCT l.search_id) buscas,
              COALESCE(sum(l.estimated_value) FILTER (WHERE l.stage NOT IN ('descartado','ganho')), 0) pipeline_value,
              COALESCE(sum(l.estimated_value) FILTER (WHERE l.stage='ganho'), 0) won_value
       FROM leads l`
    ).get();
    const porNicho = db.prepare(
      `SELECT s.niche AS chave, ${agg}
       FROM leads l JOIN searches s ON s.id = l.search_id
       GROUP BY s.niche ORDER BY ganho DESC, total DESC LIMIT 20`
    ).all();
    const porCidade = db.prepare(
      `SELECT s.city AS chave, ${agg}
       FROM leads l JOIN searches s ON s.id = l.search_id
       GROUP BY s.city ORDER BY ganho DESC, total DESC LIMIT 20`
    ).all();
    return { geral, porNicho, porCidade };
  } catch (e) { console.error('[db] statsConversao:', e.message); return null; }
}

export async function findDupLeads(searchId, leads) {
  if (!db || !leads.length) return new Map();
  const dedup = new Map();
  try {
    const byPhoneStmt = db.prepare(`SELECT stage FROM leads WHERE phone_digits = ? AND search_id != ? LIMIT 1`);
    const byCoordStmt = db.prepare(
      `SELECT stage FROM leads WHERE name = ? AND lat IS NOT NULL AND ABS(lat - ?) < 0.0005 AND ABS(lng - ?) < 0.0005 AND search_id != ? LIMIT 1`
    );
    for (const l of leads) {
      const cleanPhone = digits(l.phone);
      const byPhone = cleanPhone ? byPhoneStmt.get(cleanPhone, searchId) : null;
      if (byPhone) { dedup.set(l.id, { stage: byPhone.stage }); continue; }
      if (l.name && l.lat != null && l.lng != null) {
        const byCoord = byCoordStmt.get(l.name, l.lat, l.lng, searchId);
        if (byCoord) dedup.set(l.id, { stage: byCoord.stage });
      }
    }
  } catch (e) { console.error('[db] findDupLeads:', e.message); }
  return dedup;
}

export async function listSearches(limit = 50) {
  if (!db) return [];
  try {
    return db.prepare(
      `SELECT s.id, s.niche, s.city, s.found, s.created_at,
              count(l.lead_id) AS leads,
              count(*) FILTER (WHERE l.enrichment_status <> 'pending') AS enriched
       FROM searches s LEFT JOIN leads l ON l.search_id = s.id
       GROUP BY s.id ORDER BY s.created_at DESC LIMIT ?`
    ).all(limit);
  } catch (e) { console.error('[db] listSearches:', e.message); return []; }
}
