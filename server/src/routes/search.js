import { Router } from 'express';
import { buscarEstabelecimentos } from '../data/osmProvider.js';
import { gerarEstabelecimentos } from '../data/mockPlaces.js';
import { geocodeCidade } from '../data/geocode.js';
import { createSearch, attachStream, prioritizeLead, getSearchLeads, updateLead, reopenSearch } from '../enrichment/enricher.js';
import { toCSV, toXLSX } from '../export/exporter.js';
import { listSearches, statsConversao, dbEnabled } from '../db.js';
import { scoreLead } from '../utils/score.js';

const router = Router();
const slug = (s) =>
  (s || 'leads')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'leads';
const USE_MOCK = process.env.DATA_PROVIDER === 'mock'; // demo offline sem rede
const clamp = (n, lo, hi) => Math.min(Math.max(Number(n) || lo, lo), hi);

// ─── FASE 1 — síncrona: pinos no mapa em ~1–2s ──────────────────────────────
router.post('/api/search', async (req, res) => {
  const { niche, city = 'São Paulo', lat = -23.5505, lng = -46.6333, radiusKm = 5 } = req.body ?? {};
  if (!niche?.trim()) {
    return res.status(400).json({ error: 'Informe o nicho (ex: "salão de estética").' });
  }
  const radius = clamp(radiusKm, 0.5, 30);
  const params = { niche: niche.trim(), city, lat: +lat, lng: +lng, radiusKm: radius };

  try {
    let found, leads;
    if (USE_MOCK) {
      const todos = gerarEstabelecimentos(params);
      leads = todos.filter((p) => !p.hasWebsite);
      found = todos.length;
    } else {
      // OpenStreetMap / Overpass — gratuito, filtra quem TEM a tag website
      ({ found, leads } = await buscarEstabelecimentos(params));
    }

    const searchId = createSearch(leads, { city, niche: params.niche, lat: params.lat, lng: params.lng, radiusKm: params.radiusKm, found });
    res.json({
      searchId,
      query: params,
      stats: { found, withoutWebsite: leads.length },
      leads: leads.map((l) => ({
        ...l,
        enrichmentStatus: 'pending',
        enrichment: null,
        stage: 'novo',
        score: scoreLead(l, null),
      })),
    });
  } catch (e) {
    console.error('Falha na busca OSM:', e);
    res.status(502).json({
      error: 'Não consegui consultar o mapa agora (Overpass ocupado). Tente de novo em instantes ou reduza o raio.',
    });
  }
});

// ─── Autocomplete de cidade (Nominatim/OSM, gratuito) ──────────────────────
router.get('/api/geocode', async (req, res) => {
  const q = (req.query.q ?? '').toString().trim();
  if (q.length < 3) return res.json({ results: [] });
  try {
    res.json({ results: await geocodeCidade(q) });
  } catch (e) {
    console.error('Falha no geocode:', e);
    res.status(502).json({ error: 'Geocoding indisponível agora.' });
  }
});

// ─── FASE 2 — stream SSE: o enriquecimento pinga aqui conforme fica pronto ──
router.get('/api/search/:searchId/stream', (req, res) => attachStream(req.params.searchId, req, res));

// Enriquecimento sob demanda: o usuário clicou no lead → fura a fila
router.post('/api/search/:searchId/leads/:leadId/prioritize', (req, res) => {
  const ok = prioritizeLead(req.params.searchId, req.params.leadId);
  res.status(ok ? 202 : 404).json({ accepted: ok });
});

// Atualiza um lead: estágio do Kanban + campos de CRM (notas, follow-up, tags, valor)
router.patch('/api/search/:searchId/leads/:leadId', (req, res) => {
  const ok = updateLead(req.params.searchId, req.params.leadId, req.body ?? {});
  res.status(ok ? 200 : 400).json({ ok });
});

// Reabre uma busca salva (re-hidrata do banco se já saiu da memória) — usado pelo histórico
router.get('/api/search/:searchId/leads', async (req, res) => {
  const data = await reopenSearch(req.params.searchId);
  if (!data) return res.status(404).json({ error: 'Busca não encontrada.' });
  res.json(data);
});

// ─── Exportação CSV / XLSX ──────────────────────────────────────────────────
router.get('/api/search/:searchId/export', async (req, res) => {
  const data = await getSearchLeads(req.params.searchId);
  if (!data) return res.status(404).json({ error: 'Busca não encontrada (sessão expirada?).' });

  const format = (req.query.format ?? 'csv').toString().toLowerCase();
  const base = `leads-${slug(data.niche)}-${new Date().toISOString().slice(0, 10)}`;
  try {
    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${base}.xlsx"`);
      return res.send(await toXLSX(data.leads));
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${base}.csv"`);
    return res.send(toCSV(data.leads));
  } catch (e) {
    console.error('Falha no export:', e);
    res.status(500).json({ error: 'Falha ao gerar o arquivo.' });
  }
});

// ─── Webhook: envia os leads (JSON) para um CRM/URL do usuário ──────────────
router.post('/api/search/:searchId/webhook', async (req, res) => {
  const data = await getSearchLeads(req.params.searchId);
  if (!data) return res.status(404).json({ error: 'Busca não encontrada (sessão expirada?).' });

  const url = (req.body?.url ?? '').toString().trim();
  // NB: produção deve barrar IPs internos (proteção SSRF) antes de postar.
  if (!/^https?:\/\/.+/i.test(url)) return res.status(400).json({ error: 'Informe uma URL http(s) válida.' });

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { niche: data.niche, city: data.city }, count: data.leads.length, leads: data.leads }),
      signal: AbortSignal.timeout(10000),
    });
    res.json({ delivered: r.ok, status: r.status });
  } catch (e) {
    console.error('Webhook falhou:', e);
    res.status(502).json({ error: 'Não consegui entregar ao webhook (URL inacessível ou lenta).' });
  }
});

// Histórico de buscas persistidas (lista vazia se o banco estiver desligado).
// dbEnabled vai junto pra o front distinguir "banco off" de "banco on sem buscas".
router.get('/api/searches', async (_req, res) => {
  res.json({ dbEnabled, searches: await listSearches() });
});

// Diz se a persistência está ativa (DATABASE_URL configurada e pool aberto).
router.get('/api/status', (_req, res) => res.json({ dbEnabled }));

// Estatísticas de conversão para o dashboard (null se o banco estiver desligado).
router.get('/api/stats', async (_req, res) => {
  res.json({ stats: await statsConversao() });
});

export default router;
