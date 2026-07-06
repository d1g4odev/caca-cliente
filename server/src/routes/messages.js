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
import { reopenSearch } from '../enrichment/enricher.js';

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

export default router;
