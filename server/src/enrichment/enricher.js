import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import path from 'node:path';
import * as db from '../db.js';
import { scoreLead } from '../utils/score.js';

// Gerencia as sessões SSE E executa o enriquecimento real chamando o worker
// Python (workers/enrich.py — DuckDuckGo, gratuito). Uma fila com concorrência
// limitada mantém o ritmo educado com o DDG (menos bloqueio) sem travar a UI.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(__dirname, '../../../workers/enrich.py');
// Prioridade: PYTHON_BIN > venv criado pelo `npm run setup` > python do sistema.
const VENV_PY = path.resolve(
  __dirname,
  '../../../workers/.venv',
  process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'
);
const PY =
  process.env.PYTHON_BIN ||
  (existsSync(VENV_PY) ? VENV_PY : process.platform === 'win32' ? 'py' : 'python3');

const MAX_CONCURRENCY = Number(process.env.ENRICH_CONCURRENCY ?? 2);
const BACKGROUND = process.env.ENRICH_BACKGROUND !== 'false'; // pré-aquece todos por padrão
const USE_MOCK = process.env.ENRICH_PROVIDER === 'mock'; // demo offline sem rede
const TTL_MS = 30 * 60 * 1000;

const searches = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

export function createSearch(leads, meta = {}) {
  const { city, niche } = meta;
  const id = crypto.randomUUID();
  const session = {
    id,
    city: city ?? '',
    niche: niche ?? '',
    query: { niche: niche ?? '', city: city ?? '', lat: meta.lat, lng: meta.lng, radiusKm: meta.radiusKm },
    found: meta.found ?? null,
    leads: new Map(leads.map((l) => [l.id, { ...l, enrichment: null, enrichmentStatus: 'pending', stage: 'novo', notes: '', followUpAt: null, tags: [], estimatedValue: null }])),
    clients: new Set(),
    queue: [],
    inFlight: new Set(),
    running: 0,
  };
  searches.set(id, session);

  // Persiste a busca + leads em background (não bloqueia a resposta). dbReady
  // garante que os UPDATEs de enriquecimento/estágio só rodem após o INSERT.
  session.dbReady = db.saveSearch(session, meta).catch((e) => console.error('[db]', e.message));

  if (BACKGROUND) {
    session.queue = [...session.leads.keys()];
    pump(session);
  }
  setTimeout(() => destroySearch(id), TTL_MS);
  return id;
}

// Snapshot dos leads (com enriquecimento atual) p/ exportação/webhook.
export async function getSearchLeads(searchId) {
  const s = searches.get(searchId);
  if (s) return { city: s.city, niche: s.niche, leads: withScore([...s.leads.values()]) };
  const data = await db.loadSearch(searchId); // sessão expirou/servidor reiniciou: tenta o banco
  if (data) data.leads = withScore(data.leads);
  return data;
}

// Anexa o score calculado a cada lead antes de expor (snapshot imutável).
// O score é derivado, nunca persistido como fonte da verdade.
const withScore = (leads) => leads.map((l) => ({ ...l, score: scoreLead(l, l.enrichment) }));

// Estágio do funil (Kanban). Fonte da verdade na sessão -> sai no export.
export const STAGES = ['novo', 'qualificado', 'contatado', 'ganho', 'descartado'];

// Atualiza campos editáveis do lead (CRM): stage, notes, followUpAt, tags, estimatedValue.
// Aceita um patch parcial; só os campos presentes são alterados.
export function updateLead(searchId, leadId, patch = {}) {
  const s = searches.get(searchId);
  const lead = s?.leads.get(leadId);
  if (!lead) return false;
  const fields = {};
  if (patch.stage !== undefined) {
    if (!STAGES.includes(patch.stage)) return false;
    lead.stage = patch.stage; fields.stage = patch.stage;
  }
  if (patch.notes !== undefined) { lead.notes = String(patch.notes); fields.notes = lead.notes; }
  if (patch.followUpAt !== undefined) { lead.followUpAt = patch.followUpAt || null; fields.followUpAt = lead.followUpAt; }
  if (patch.tags !== undefined) { lead.tags = Array.isArray(patch.tags) ? patch.tags : []; fields.tags = lead.tags; }
  if (patch.estimatedValue !== undefined) {
    const v = patch.estimatedValue === null || patch.estimatedValue === '' ? null : Number(patch.estimatedValue);
    lead.estimatedValue = Number.isFinite(v) ? v : null; fields.estimatedValue = lead.estimatedValue;
  }
  if (Object.keys(fields).length && db.dbEnabled && s.dbReady) {
    s.dbReady.then(() => db.saveLeadFields(searchId, leadId, fields)).catch(() => {});
  }
  return true;
}

// Reabre uma busca: se já saiu da memória (TTL/restart), re-hidrata do banco
// (sem re-enriquecer — o que já foi achado fica como está).
export async function reopenSearch(searchId) {
  let s = searches.get(searchId);
  if (!s) {
    const data = await db.loadSearch(searchId);
    if (!data) return null;
    s = {
      id: searchId, city: data.city ?? '', niche: data.niche ?? '',
      query: data.query, found: data.found ?? null,
      leads: new Map(data.leads.map((l) => [l.id, l])),
      clients: new Set(), queue: [], inFlight: new Set(), running: 0,
      dbReady: Promise.resolve(),
    };
    searches.set(searchId, s);
    setTimeout(() => destroySearch(searchId), TTL_MS);
  }
  return {
    searchId,
    query: s.query ?? { niche: s.niche, city: s.city },
    stats: { found: s.found, withoutWebsite: s.leads.size },
    leads: withScore([...s.leads.values()]),
  };
}

// Usuário interagiu com o lead -> fura a fila (não recomeça se já está pronto)
export function prioritizeLead(searchId, leadId) {
  const s = searches.get(searchId);
  const lead = s?.leads.get(leadId);
  if (!lead) return false;
  if (lead.enrichmentStatus !== 'pending' || s.inFlight.has(leadId)) return true; // já tratado/em curso

  s.queue = s.queue.filter((id) => id !== leadId);
  s.queue.unshift(leadId); // topo da fila
  pump(s);
  return true;
}

export function attachStream(searchId, req, res) {
  const s = searches.get(searchId);
  if (!s) return res.status(404).json({ error: 'Busca não encontrada (sessão expirada?)' });

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n');

  // Replay: quem (re)conecta recebe na hora tudo que já foi enriquecido.
  for (const lead of s.leads.values()) {
    if (lead.enrichmentStatus !== 'pending') res.write(frame('enrichment', payloadOf(lead)));
  }
  if (allSettled(s)) res.write(frame('done', { searchId: s.id }));

  s.clients.add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15000);
  req.on('close', () => {
    clearInterval(heartbeat);
    s.clients.delete(res);
  });
}

// ── Fila com concorrência limitada ──────────────────────────────────────────
function pump(session) {
  while (session.running < MAX_CONCURRENCY && session.queue.length) {
    const leadId = session.queue.shift();
    const lead = session.leads.get(leadId);
    if (!lead || lead.enrichmentStatus !== 'pending' || session.inFlight.has(leadId)) continue;
    session.running++;
    session.inFlight.add(leadId);
    runOne(session, lead).finally(() => {
      session.running--;
      session.inFlight.delete(leadId);
      pump(session);
    });
  }
}

async function runOne(session, lead) {
  await sleep(200 + Math.random() * 800); // jitter: educado com o DuckDuckGo
  const enrichment = USE_MOCK ? mockEnrichment(lead) : await spawnPython(lead, session.city);

  lead.enrichment = enrichment;
  const achou = enrichment && (enrichment.email || enrichment.instagram || enrichment.facebook || enrichment.linkedin);
  lead.enrichmentStatus = achou ? 'done' : 'not_found';

  broadcast(session, 'enrichment', payloadOf(lead));
  if (db.dbEnabled) session.dbReady.then(() => db.saveEnrichment(session.id, lead)).catch(() => {});
  if (allSettled(session)) broadcast(session, 'done', { searchId: session.id });
}

function spawnPython(lead, city) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ name: lead.name, city, phone: lead.phone, place_id: lead.id });
    const child = spawn(PY, [SCRIPT, payload], {
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8' },
      windowsHide: true,
    });
    let out = '';
    const kill = setTimeout(() => child.kill(), 20000); // rede travada não trava a fila
    child.stdout.on('data', (d) => (out += d));
    child.on('error', () => (clearTimeout(kill), resolve(null))); // py ausente etc.
    child.on('close', () => {
      clearTimeout(kill);
      try {
        resolve(JSON.parse(out.trim().split(/\r?\n/).pop()));
      } catch {
        resolve(null);
      }
    });
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const payloadOf = (lead) => ({
  leadId: lead.id,
  status: lead.enrichmentStatus,
  enrichment: lead.enrichment,
  score: scoreLead(lead, lead.enrichment),
});
const allSettled = (s) => [...s.leads.values()].every((l) => l.enrichmentStatus !== 'pending');

function broadcast(session, event, data) {
  const f = frame(event, data);
  for (const res of session.clients) res.write(f);
}

function destroySearch(id) {
  const s = searches.get(id);
  if (!s) return;
  for (const res of s.clients) res.end();
  searches.delete(id);
}

// Fallback offline (ENRICH_PROVIDER=mock): contatos fictícios, sem rede.
function mockEnrichment(lead) {
  if (Math.random() < 0.15) return null;
  const slug = lead.name.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '');
  return {
    email: Math.random() < 0.6 ? `contato@${slug}.com.br` : null,
    instagram: Math.random() < 0.8 ? `https://instagram.com/${slug}` : null,
    facebook: Math.random() < 0.4 ? `https://facebook.com/${slug}` : null,
    linkedin: null,
    whatsapp: lead.phone,
    confidence: 0.7,
    partial: false,
  };
}
