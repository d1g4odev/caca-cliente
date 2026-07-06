// Endpoint de geração de mensagens de abordagem (Manual Mestre Prospector).
// Motor puro em ../prospector/ — custo zero, offline. Provider de LLM opcional
// via PROSPECTOR_LLM_PROVIDER.
//
// POST /api/leads/:leadId/message?searchId=...&tipo=...
// Body (opcional): campos do lead — sobrescrevem os persistidos.
//
// Resolução do lead:
//   1. Se vier searchId, reabre a sessão (memória ou banco) e pega o lead.
//   2. Se não achar, usa o body do request como lead hipotético.
//   3. Campos do body têm PRIORIDADE sobre os persistidos (merge).

import { Router } from 'express';
import { gerarMensagem, TIPOS_MENSAGEM } from '../prospector/index.js';
import { reopenSearch, getSearchLeads } from '../enrichment/enricher.js';

const router = Router();

const TIPOS_VALIDOS = new Set(Object.values(TIPOS_MENSAGEM));

// Monta o shape esperado pelo motor a partir de um lead persistido.
// O lead da sessão tem campos em snake/camel misturados; normalizamos aqui.
function leadFromSession(l, searchCity, searchNiche) {
  if (!l) return null;
  const e = l.enrichment ?? {};
  return {
    nome: l.name ?? '',
    nicho: l.niche ?? searchNiche ?? '',
    cidade: searchCity ?? '',
    temSite: l.hasWebsite ?? Boolean(e.discoveredWebsite),
    temInstagram: Boolean(e.instagram),
    linkQuebrado: false,
    estagio: l.stage ?? 'novo',
    instagram: e.instagram ?? '',
  };
}

// Merge: body sobrescreve lead persistido. Só campos conhecidos do motor.
function mergeLead(persisted, body) {
  const base = persisted ?? {};
  const pick = (k) => (body?.[k] !== undefined ? body[k] : base[k]);
  return {
    nome: pick('nome') ?? pick('name') ?? '',
    nicho: pick('nicho') ?? '',
    cidade: pick('cidade') ?? pick('city') ?? '',
    temSite: pick('temSite') ?? pick('hasWebsite') ?? null,
    temInstagram: pick('temInstagram') ?? null,
    linkQuebrado: pick('linkQuebrado') ?? false,
    estagio: pick('estagio') ?? pick('stage') ?? 'novo',
    instagram: pick('instagram') ?? '',
  };
}

router.post('/api/leads/:leadId/message', async (req, res) => {
  const { leadId } = req.params;
  if (!leadId) {
    return res.status(400).json({ error: 'leadId é obrigatório.' });
  }

  const searchId = (req.query.searchId ?? req.body?.searchId ?? '').toString();
  const tipoParam = (req.query.tipo ?? req.body?.tipo ?? '').toString().trim();
  const tipo = TIPOS_VALIDOS.has(tipoParam) ? tipoParam : '';

  const body = req.body ?? {};

  // Tenta resolver o lead persistido (se vier searchId).
  let persisted = null;
  let searchCity = '';
  let searchNiche = '';
  if (searchId) {
    try {
      const data = await reopenSearch(searchId);
      if (data) {
        searchCity = data.city ?? '';
        searchNiche = data.niche ?? '';
        persisted = data.leads.find((l) => l.id === leadId) ?? null;
      }
    } catch (e) {
      console.error('[messages] falha ao reabrir busca:', e.message);
    }
  }

  // Se não achou persistido e não tem body útil -> 404.
  const hasBody = body && Object.keys(body).length > 0;
  if (!persisted && !hasBody) {
    return res.status(404).json({
      error: 'Lead não encontrado (sessão expirou?). Envie os campos no body para gerar uma mensagem para um lead hipotético.',
    });
  }

  const leadPersistido = leadFromSession(persisted, searchCity, searchNiche);
  const lead = mergeLead(leadPersistido, body);

  try {
    const resultado = await gerarMensagem(lead, tipo);
    return res.json(resultado);
  } catch (e) {
    console.error('[messages] falha no engine:', e);
    return res.status(500).json({
      error: 'Não consegui gerar a mensagem agora. Tente novamente em instantes.',
    });
  }
});

// ── Lote (Modo Disparo) ────────────────────────────────────────────────────
// POST /api/search/:searchId/messages/batch
// Body: { "tipo": "abordagem", "leadIds": ["id1", "id2"] }
//   - tipo: opcional (default: "abordagem"). Se omitido, infere pelo estágio.
//   - leadIds: opcional. Se omitido, gera para TODOS os leads da busca.
//
// Limite: 50 leads por chamada (protege o event loop e o provider de LLM).
// Paralelismo: chunk de 5 (Promise.all por chunk) — não estoura o event loop.
// Respostas parciais: cada geração é independente. Falha em um lead vai para
// o array `falhas` e não derruba o lote.
//
// Resposta 200:
//   { searchId, tipo, geracoes: [{leadId, mensagem, angulo, proximaAcao}], falhas: [{leadId, erro}] }
//   207 não é usado — mantemos 200 mesmo com falhas parciais (o front decide
//   como tratar via o array `falhas`).
const BATCH_LIMIT = 50;
const BATCH_CHUNK = 5;

router.post('/api/search/:searchId/messages/batch', async (req, res) => {
  const { searchId } = req.params;
  if (!searchId) {
    return res.status(400).json({ error: 'searchId é obrigatório.' });
  }

  const body = req.body ?? {};
  const tipoParam = (body.tipo ?? req.query.tipo ?? '').toString().trim();
  const tipo = TIPOS_VALIDOS.has(tipoParam) ? tipoParam : '';
  const leadIdsReq = Array.isArray(body.leadIds) ? body.leadIds : null;

  // Reabre a sessão e pega os leads (snapshot com score).
  let data;
  try {
    data = await getSearchLeads(searchId);
  } catch (e) {
    console.error('[messages/batch] falha ao carregar busca:', e);
    return res.status(502).json({
      error: 'Não consegui carregar a busca agora. Tente novamente em instantes.',
    });
  }

  if (!data) {
    return res.status(404).json({
      error: 'Busca não encontrada (sessão expirou?).',
    });
  }

  // Filtra leads por leadIds (se vieram) ou pega todos.
  let leads = data.leads ?? [];
  const notFound = [];
  if (leadIdsReq && leadIdsReq.length > 0) {
    const set = new Set(leadIdsReq.map(String));
    leads = leads.filter((l) => set.has(String(l.id)));
    // Reporta leadIds pedidos mas não encontrados na busca (visibilidade pro front).
    const found = new Set(leads.map((l) => String(l.id)));
    for (const id of leadIdsReq.map(String)) {
      if (!found.has(id)) notFound.push(id);
    }
  }

  // Limite de leads por chamada — protege o servidor.
  if (leads.length > BATCH_LIMIT) {
    return res.status(413).json({
      error: `Lote grande demais: ${leads.length} leads. Limite de ${BATCH_LIMIT} por chamada. Use leadIds para paginar.`,
    });
  }

  if (leads.length === 0) {
    return res.json({
      searchId,
      tipo: tipo || 'inferido',
      geracoes: [],
      falhas: [],
    });
  }

  // Monta o shape do lead esperado pelo motor.
  const toEngineLead = (l) => {
    const e = l.enrichment ?? {};
    return {
      nome: l.name ?? '',
      nicho: l.niche ?? data.niche ?? '',
      cidade: data.city ?? '',
      temSite: l.hasWebsite ?? Boolean(e.discoveredWebsite),
      temInstagram: Boolean(e.instagram),
      linkQuebrado: false,
      estagio: l.stage ?? 'novo',
      instagram: e.instagram ?? '',
    };
  };

  // Processa em chunks de 5 para não estourar o event loop nem o provider de LLM.
  const geracoes = [];
  const falhas = [];

  for (let i = 0; i < leads.length; i += BATCH_CHUNK) {
    const chunk = leads.slice(i, i + BATCH_CHUNK);
    const results = await Promise.all(
      chunk.map(async (l) => {
        try {
          const r = await gerarMensagem(toEngineLead(l), tipo);
          return { leadId: l.id, ok: true, data: r };
        } catch (e) {
          return { leadId: l.id, ok: false, erro: e?.message ?? String(e) };
        }
      })
    );
    for (const r of results) {
      if (r.ok) {
        geracoes.push({
          leadId: r.leadId,
          mensagem: r.data.mensagem,
          angulo: r.data.angulo,
          tipo: r.data.tipo,
          proximaAcao: r.data.proximaAcao,
        });
      } else {
        falhas.push({ leadId: r.leadId, erro: r.erro });
      }
    }
  }

  // leadIds pedidos mas não encontrados na busca viram falhas (visibilidade pro front).
  const falhasComNotFound = [
    ...falhas,
    ...notFound.map((id) => ({ leadId: id, erro: 'Lead não encontrado nesta busca.' })),
  ];

  return res.json({
    searchId,
    tipo: tipo || 'inferido',
    geracoes,
    falhas: falhasComNotFound,
  });
});

export default router;
