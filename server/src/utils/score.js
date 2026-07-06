// Score de lead (0-100) — calculado no backend a partir dos dados do lead +
// enriquecimento. Quanto mais contatos e menor presença online própria, maior
// o score (lead mais "frio" para prospecção B2B).
//
// Pesos (soma máx 100):
//   - tem telefone (qualquer) ............ +30
//   - tem Instagram ...................... +20
//   - tem e-mail ......................... +15
//   - sem site confirmado (próprio) ..... +25
//   - nicho com boa cobertura OSM ....... +10
//
// "Sem site confirmado" = lead não tem hasWebsite E o enriquecimento não
// achou um site oficial (discoveredWebsite). É exatamente o filtro do produto.
//
// "Nicho com boa cobertura" = nicho que casa com algum grupo do mapa de tags
// OSM (osmProvider.js). Nichos genéricos ("comércio", "serviços") não pontuam.

import { isValidWhatsApp } from './phone.js';

// Espelha os radicais do osmProvider.js — se o nicho casa, é um nicho "quente"
// (tem volume no OSM e portanto mais leads para prospectar).
const NICHE_KEYWORDS = [
  'estetic', 'beleza', 'salao', 'manicure', 'depila', 'sobrancelha', 'cabelei',
  'barbear', 'barbeiro', 'spa', 'maquia', 'unha',
  'advog', 'advocacia', 'jurid',
  'nutri',
  'dent', 'odonto',
  'clinic', 'consultor', 'medic', 'saude',
  'academia', 'fitness', 'crossfit', 'pilates', 'muscula',
  'restaurante', 'lanchonete', 'pizz', 'hamburg', 'cafe', 'bistro', 'padaria', 'comida',
  'pet', 'veterin',
  'contab', 'contador',
  'imobili', 'corretor', 'imovel',
  'arquitet',
  'psicol', 'terapeut', 'terapia',
  'fisio',
  'otica', 'oculos',
  'mecanic', 'funilaria', 'oficina', 'autocenter',
  'empreit', 'construt', 'reform', 'pedreir', 'engenh',
  'floricult', 'flor',
];

const normalize = (s) => (s ?? '').toString().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function hasPhone(lead, enrichment) {
  // Telefone do OSM (lead.phone) OU whatsapp do enriquecimento.
  if (lead?.phone && isValidWhatsApp(lead.phone)) return true;
  if (enrichment?.whatsapp && isValidWhatsApp(enrichment.whatsapp)) return true;
  // Telefone "sujo" (não normalizou, mas existe) conta como meia-presença.
  if (lead?.phone && lead.phone.replace(/\D/g, '').length >= 8) return true;
  return false;
}

function hasInstagram(enrichment) {
  const ig = enrichment?.instagram;
  return Boolean(ig && typeof ig === 'string' && ig.trim());
}

function hasEmail(enrichment) {
  const e = enrichment?.email;
  return Boolean(e && typeof e === 'string' && e.includes('@'));
}

function hasConfirmedWebsite(lead, enrichment) {
  // Site confirmado = OSM disse que tem (hasWebsite) OU enriquecimento achou oficial.
  if (lead?.hasWebsite) return true;
  if (enrichment?.discoveredWebsite) return true;
  return false;
}

function isHotNiche(niche) {
  if (!niche) return false;
  const n = normalize(niche);
  return NICHE_KEYWORDS.some((k) => n.includes(k));
}

export function scoreLead(lead = {}, enrichment = null) {
  let score = 0;

  if (hasPhone(lead, enrichment)) score += 30;
  if (hasInstagram(enrichment)) score += 20;
  if (hasEmail(enrichment)) score += 15;
  if (!hasConfirmedWebsite(lead, enrichment)) score += 25;
  if (isHotNiche(lead?.niche)) score += 10;

  return Math.min(100, Math.max(0, score));
}

// Rótulo humano para o score (útil para o front exibir selos).
export function scoreLabel(score) {
  if (score >= 80) return 'quente';
  if (score >= 50) return 'morno';
  if (score >= 25) return 'frio';
  return 'gelo';
}
