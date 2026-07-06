// Seletor de ângulo: dado o contexto do lead, decide qual template da seção
// 3 ou 4 do manual usar na PRIMEIRA abordagem. Prioriza oportunidades concretas
// (link quebrado, sem site) antes de cair no ângulo genérico do nicho.

import { ANGULOS } from './angulos.js';
import {
  perfilBonitoSemSite,
  linktreeForaDoAr,
  linkSoWhatsapp,
  odontopediatra,
  esteticaProcedimentos,
  institutoClinica,
} from './templates.js';

// Detecta o nicho a partir de palavras-chave (case-insensitive, sem acento).
const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

const ehOdontopediatra = (nicho) => normalize(nicho).includes('odontopedi');
const ehEstetica = (nicho) => {
  const n = normalize(nicho);
  return n.includes('estetica') || n.includes('estética') || n.includes('harmoniz') || n.includes('procedimento');
};
const ehInstituto = (nicho) => {
  const n = normalize(nicho);
  return n.includes('instituto') || n.includes('clinica') || n.includes('clínica');
};

// Ordem de prioridade (manual seção 2 + seção 4):
// 1. Link quebrado — oportunidade concreta, ganha de tudo.
// 2. Nicho com template próprio (odontopediatra, estética, instituto) — o
//    manual tem abordagem específica que aproveita o vocabulário do nicho.
// 3. Sem site mas com Instagram — ângulo genérico "perfil bonito sem site".
// 4. Sem site e sem Instagram — link só WhatsApp.
// 5. Fallback — profissional da saúde genérico.
export function selecionarAnguloAbordagem(lead) {
  if (lead.linkQuebrado) return ANGULOS.LINKTREE_FORA_DO_AR;
  if (ehOdontopediatra(lead.nicho)) return ANGULOS.ODONTOPEDIATRA;
  if (ehEstetica(lead.nicho)) return ANGULOS.ESTETICA_PROCEDIMENTOS;
  if (ehInstituto(lead.nicho)) return ANGULOS.INSTITUTO_CLINICA;
  if (lead.temSite === false && lead.temInstagram) return ANGULOS.PERFIL_BONITO_SEM_SITE;
  if (lead.temSite === false && !lead.temInstagram) return ANGULOS.LINK_SO_WHATSAPP;
  return ANGULOS.SAUDE_GERAL;
}

// Mapa ângulo -> template. Centralizado pra o engine ficar declarativo.
export const TEMPLATES_ABORDAGEM = {
  [ANGULOS.PERFIL_BONITO_SEM_SITE]: perfilBonitoSemSite,
  [ANGULOS.LINKTREE_FORA_DO_AR]: linktreeForaDoAr,
  [ANGULOS.LINK_SO_WHATSAPP]: linkSoWhatsapp,
  [ANGULOS.SAUDE_GERAL]: perfilBonitoSemSite, // profissional da saúde genérico usa o mesmo base
  [ANGULOS.ODONTOPEDIATRA]: odontopediatra,
  [ANGULOS.ESTETICA_PROCEDIMENTOS]: esteticaProcedimentos,
  [ANGULOS.INSTITUTO_CLINICA]: institutoClinica,
};
