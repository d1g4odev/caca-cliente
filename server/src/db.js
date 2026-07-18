// Persistência opcional em PostgreSQL. Se DATABASE_URL não estiver definida (ou
// o banco estiver fora do ar), TODAS as funções viram no-op e o app segue 100%
// em memória, exatamente como antes — persistência é aditiva, nunca bloqueante.
//
// O banco mora no home server (ZimaOS) e é acessado via Tailscale. A connection
// string fica em server/.env (DATABASE_URL=postgresql://user:senha@100.x:5432/db).
import pg from 'pg';
import { scoreLead } from './utils/score.js';

const { Pool } = pg;
const url = process.env.DATABASE_URL;
export const dbEnabled = Boolean(url);

const pool = dbEnabled
  ? new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000 })
  : null;
// Erro assíncrono de um cliente ocioso não pode derrubar o processo.
if (pool) pool.on('error', (e) => console.error('[db] erro no pool:', e.message));

const DDL = `
CREATE TABLE IF NOT EXISTS searches (
  id         uuid PRIMARY KEY,
  niche      text NOT NULL,
  city       text,
  lat        double precision,
  lng        double precision,
  radius_km  double precision,
  found      integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leads (
  search_id         uuid NOT NULL REFERENCES searches(id) ON DELETE CASCADE,
  lead_id           text NOT NULL,
  name              text,
  address           text,
  phone             text,
  lat               double precision,
  lng               double precision,
  has_website       boolean,
  source            text,
  niche             text,
  rating            double precision,
  reviews_count     integer,
  enrichment        jsonb,
  enrichment_status text NOT NULL DEFAULT 'pending',
  stage             text NOT NULL DEFAULT 'novo',
  notes             text,
  follow_up_at      text,
  tags              text[] DEFAULT '{}',
  estimated_value   numeric,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (search_id, lead_id)
);
CREATE INDEX IF NOT EXISTS idx_leads_lead_id ON leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_search_stage ON leads(search_id, stage);
-- Migração idempotente: adiciona as colunas de CRM em bancos criados antes.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_at text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_value numeric;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS wa_invalid BOOLEAN DEFAULT false;
`;

export async function initDb() {
  if (!pool) {
    console.log('[db] DATABASE_URL ausente — rodando em memória (sem persistência).');
    return false;
  }
  try {
    await pool.query(DDL);
    console.log('[db] schema pronto — persistência ATIVADA.');
    return true;
  } catch (e) {
    console.error('[db] falha ao preparar o schema (seguindo em memória):', e.message);
    return false;
  }
}

// Grava a busca e todos os leads de uma vez (transação). Devolve a Promise para
// que updates posteriores (enriquecimento/estágio) esperem o INSERT terminar.
export async function saveSearch(search, meta = {}) {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO searches (id, niche, city, lat, lng, radius_km, found)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
      [search.id, meta.niche ?? '', meta.city ?? null, meta.lat ?? null, meta.lng ?? null, meta.radiusKm ?? null, meta.found ?? null]
    );
    for (const l of search.leads.values()) {
      await client.query(
        `INSERT INTO leads (search_id, lead_id, name, address, phone, lat, lng, has_website, source, niche, rating, reviews_count, enrichment, enrichment_status, stage, wa_invalid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (search_id, lead_id) DO NOTHING`,
        [search.id, l.id, l.name, l.address, l.phone, l.lat, l.lng, l.hasWebsite ?? false, l.source ?? null, l.niche ?? null, l.rating ?? null, l.reviewsCount ?? null, l.enrichment ?? null, l.enrichmentStatus, l.stage, l.waInvalid ?? false]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error('[db] saveSearch:', e.message);
  } finally {
    client.release();
  }
}

export async function saveEnrichment(searchId, lead) {
  if (!pool) return;
  try {
    await pool.query(
      `UPDATE leads SET enrichment=$3, enrichment_status=$4, updated_at=now() WHERE search_id=$1 AND lead_id=$2`,
      [searchId, lead.id, lead.enrichment ?? null, lead.enrichmentStatus]
    );
  } catch (e) { console.error('[db] saveEnrichment:', e.message); }
}

export async function saveStage(searchId, leadId, stage) {
  if (!pool) return;
  try {
    await pool.query(`UPDATE leads SET stage=$3, updated_at=now() WHERE search_id=$1 AND lead_id=$2`, [searchId, leadId, stage]);
  } catch (e) { console.error('[db] saveStage:', e.message); }
}

// Atualiza os campos editáveis do lead (CRM): stage, notas, follow-up, tags, valor.
export async function saveLeadFields(searchId, leadId, fields = {}) {
  if (!pool) return;
  const map = { stage: 'stage', notes: 'notes', followUpAt: 'follow_up_at', tags: 'tags', estimatedValue: 'estimated_value', phone: 'phone', enrichment: 'enrichment', waInvalid: 'wa_invalid' };
  const sets = []; const vals = []; let i = 1;
  for (const [k, col] of Object.entries(map)) {
    if (fields[k] !== undefined) { sets.push(`${col}=$${i++}`); vals.push(fields[k]); }
  }
  if (!sets.length) return;
  vals.push(searchId, leadId);
  try {
    await pool.query(`UPDATE leads SET ${sets.join(', ')}, updated_at=now() WHERE search_id=$${i++} AND lead_id=$${i}`, vals);
  } catch (e) { console.error('[db] saveLeadFields:', e.message); }
}

function rowToLead(r) {
  const lead = {
    id: r.lead_id, name: r.name, address: r.address, phone: r.phone,
    lat: r.lat, lng: r.lng, hasWebsite: r.has_website, source: r.source, niche: r.niche,
    rating: r.rating, reviewsCount: r.reviews_count,
    enrichment: r.enrichment, enrichmentStatus: r.enrichment_status, stage: r.stage,
    notes: r.notes ?? '', followUpAt: r.follow_up_at ?? null,
    tags: r.tags ?? [], estimatedValue: r.estimated_value != null ? Number(r.estimated_value) : null,
    waInvalid: r.wa_invalid ?? false,
  };
  lead.score = scoreLead(lead, lead.enrichment);
  return lead;
}

// Fallback para export/webhook quando a sessão já saiu da memória (TTL/restart).
export async function loadSearch(searchId) {
  if (!pool) return null;
  try {
    const s = await pool.query('SELECT * FROM searches WHERE id=$1', [searchId]);
    if (!s.rowCount) return null;
    const r = s.rows[0];
    const leads = await pool.query('SELECT * FROM leads WHERE search_id=$1 ORDER BY created_at', [searchId]);
    return {
      city: r.city, niche: r.niche, found: r.found,
      query: { niche: r.niche, city: r.city, lat: r.lat, lng: r.lng, radiusKm: r.radius_km },
      leads: leads.rows.map(rowToLead),
    };
  } catch (e) { console.error('[db] loadSearch:', e.message); return null; }
}

// Estatísticas de conversão (geral + por nicho + por cidade) para o dashboard.
export async function statsConversao() {
  if (!pool) return null;
  const agg = `count(l.*)::int total,
               count(*) FILTER (WHERE l.stage='ganho')::int ganho,
               count(*) FILTER (WHERE l.stage='contatado')::int contatado,
               count(*) FILTER (WHERE l.stage='qualificado')::int qualificado`;
  try {
    const geral = await pool.query(
      `SELECT count(l.*)::int total,
              count(*) FILTER (WHERE l.stage='ganho')::int ganho,
              count(*) FILTER (WHERE l.stage='contatado')::int contatado,
              count(*) FILTER (WHERE l.stage='qualificado')::int qualificado,
              count(*) FILTER (WHERE l.stage='descartado')::int descartado,
              count(DISTINCT l.search_id)::int buscas,
              COALESCE(sum(l.estimated_value) FILTER (WHERE l.stage NOT IN ('descartado','ganho')), 0)::float pipeline_value,
              COALESCE(sum(l.estimated_value) FILTER (WHERE l.stage='ganho'), 0)::float won_value
       FROM leads l`
    );
    const porNicho = await pool.query(
      `SELECT s.niche AS chave, ${agg}
       FROM leads l JOIN searches s ON s.id = l.search_id
       GROUP BY s.niche ORDER BY ganho DESC, total DESC LIMIT 20`
    );
    const porCidade = await pool.query(
      `SELECT s.city AS chave, ${agg}
       FROM leads l JOIN searches s ON s.id = l.search_id
       GROUP BY s.city ORDER BY ganho DESC, total DESC LIMIT 20`
    );
    return { geral: geral.rows[0], porNicho: porNicho.rows, porCidade: porCidade.rows };
  } catch (e) { console.error('[db] statsConversao:', e.message); return null; }
}

// Histórico de buscas (com contagem de leads e enriquecidos).
// Busca leads duplicados entre buscas — mesmo telefone normalizado (só dígitos)
// OU mesmo nome + coordenada (~50m). Só roda com Postgres ativo.
// Retorna Map<lead_id, {stage}> dos leads ANTERIORES que casam.
export async function findDupLeads(searchId, leads) {
  if (!pool || !leads.length) return new Map();
  const dedup = new Map();
  for (const l of leads) {
    const cleanPhone = l.phone?.replace(/\D/g, '');
    const byPhone = cleanPhone
      ? await pool.query(`SELECT stage FROM leads WHERE regexp_replace(phone, '\\D', '', 'g') = $1 AND search_id != $2 LIMIT 1`, [cleanPhone, searchId])
      : null;
    if (byPhone?.rows.length) {
      dedup.set(l.id, { stage: byPhone.rows[0].stage });
      continue;
    }
    if (l.name && l.lat != null && l.lng != null) {
      const byCoord = await pool.query(
        `SELECT stage FROM leads WHERE name = $1 AND lat IS NOT NULL AND ABS(lat - $2) < 0.0005 AND ABS(lng - $3) < 0.0005 AND search_id != $4 LIMIT 1`,
        [l.name, l.lat, l.lng, searchId]
      );
      if (byCoord.rows.length) dedup.set(l.id, { stage: byCoord.rows[0].stage });
    }
  }
  return dedup;
}

export async function listSearches(limit = 50) {
  if (!pool) return [];
  try {
    const r = await pool.query(
      `SELECT s.id, s.niche, s.city, s.found, s.created_at,
              count(l.*)::int AS leads,
              count(*) FILTER (WHERE l.enrichment_status <> 'pending')::int AS enriched
       FROM searches s LEFT JOIN leads l ON l.search_id = s.id
       GROUP BY s.id ORDER BY s.created_at DESC LIMIT $1`, [limit]
    );
    return r.rows;
  } catch (e) { console.error('[db] listSearches:', e.message); return []; }
}
