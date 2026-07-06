// Engine principal do gerador de mensagens de abordagem do Captação.
// Implementa o fluxo do Manual Mestre Prospector do Juninho (seções 3 a 9).
//
// Entrada (lead): { nome, nicho, cidade, temSite, temInstagram, linkQuebrado,
//   estagio, tipoMensagem, instagram }
// Saída: { mensagem, angulo, proximaAcao }
//
// Funciona 100% offline (templates parametrizados, custo zero pro aluno).
// Um provider opcional de LLM pode ser plugado via PROSPECTOR_LLM_PROVIDER
// — quem quiser variação com IA configura a variável de ambiente.

import { ANGULOS, PROXIMAS_ACOES } from './angulos.js';
import { selecionarAnguloAbordagem, TEMPLATES_ABORDAGEM } from './seletor.js';
import {
  portfolio,
  precoPadrao,
  precoCurto,
  objecaoAgoraNao,
  objecaoVouPensar,
  objecaoMandaInstagram,
  objecaoSecretariaAnalisa,
  reuniaoOnline,
  reuniaoPresencial,
  fechamentoLeve,
  followUp,
} from './templates.js';

// Estágios do Kanban (espelham enrichment/enricher.js STAGES).
const ESTAGIOS = ['novo', 'qualificado', 'contatado', 'ganho', 'descartado'];

// Tipos de mensagem que o sistema sabe gerar. O tipoMensagem entra no request
// e decide qual bloco do manual usar. Quando omitido, infere pelo estágio.
export const TIPOS_MENSAGEM = {
  ABORDAGEM: 'abordagem',
  FOLLOW_UP: 'follow_up',
  PORTFOLIO: 'portfolio',
  PRECO: 'preco',
  OBJECAO_AGORA_NAO: 'objecao_agora_nao',
  OBJECAO_VO_PENSAR: 'objecao_vo_pensar',
  OBJECAO_MANDA_INSTAGRAM: 'objecao_manda_instagram',
  OBJECAO_SECRETARIA: 'objecao_secretaria',
  REUNIAO_ONLINE: 'reuniao_online',
  REUNIAO_PRESENCIAL: 'reuniao_presencial',
  FECHAMENTO: 'fechamento',
};

// Mapa tipoMensagem -> { template, angulo, acao }.
// Manter declarativo facilita o Vitral plugar novos tipos sem tocar no engine.
const ROTAS = {
  [TIPOS_MENSAGEM.ABORDAGEM]: { angulo: null, acao: PROXIMAS_ACOES.ABORDAGEM, resolve: (lead) => {
    const angulo = selecionarAnguloAbordagem(lead);
    return { angulo, mensagem: TEMPLATES_ABORDAGEM[angulo](lead) };
  } },
  [TIPOS_MENSAGEM.FOLLOW_UP]: { angulo: ANGULOS.FOLLOW_UP, acao: PROXIMAS_ACOES.FOLLOW_UP, resolve: (lead) => followUp(lead) },
  [TIPOS_MENSAGEM.PORTFOLIO]: { angulo: ANGULOS.PORTFOLIO, acao: PROXIMAS_ACOES.PORTFOLIO, resolve: (lead) => portfolio(lead) },
  [TIPOS_MENSAGEM.PRECO]: { angulo: ANGULOS.PRECO_PADRAO, acao: PROXIMAS_ACOES.PRECO, resolve: (lead) => precoPadrao(lead) },
  [TIPOS_MENSAGEM.OBJECAO_AGORA_NAO]: { angulo: ANGULOS.OBJECAO_AGORA_NAO, acao: PROXIMAS_ACOES.OBJECAO, resolve: (lead) => objecaoAgoraNao(lead) },
  [TIPOS_MENSAGEM.OBJECAO_VO_PENSAR]: { angulo: ANGULOS.OBJECAO_VO_PENSAR, acao: PROXIMAS_ACOES.OBJECAO, resolve: (lead) => objecaoVouPensar(lead) },
  [TIPOS_MENSAGEM.OBJECAO_MANDA_INSTAGRAM]: { angulo: ANGULOS.OBJECAO_MANDA_INSTAGRAM, acao: PROXIMAS_ACOES.REUNIAO, resolve: (lead) => objecaoMandaInstagram(lead) },
  [TIPOS_MENSAGEM.OBJECAO_SECRETARIA]: { angulo: ANGULOS.OBJECAO_SECRETARIA_ANALISA, acao: PROXIMAS_ACOES.OBJECAO, resolve: (lead) => objecaoSecretariaAnalisa(lead) },
  [TIPOS_MENSAGEM.REUNIAO_ONLINE]: { angulo: ANGULOS.REUNIAO_ONLINE, acao: PROXIMAS_ACOES.REUNIAO, resolve: (lead) => reuniaoOnline(lead) },
  [TIPOS_MENSAGEM.REUNIAO_PRESENCIAL]: { angulo: ANGULOS.REUNIAO_PRESENCIAL, acao: PROXIMAS_ACOES.REUNIAO, resolve: (lead) => reuniaoPresencial(lead) },
  [TIPOS_MENSAGEM.FECHAMENTO]: { angulo: ANGULOS.FECHAMENTO_LEVE, acao: PROXIMAS_ACOES.FECHAMENTO, resolve: (lead) => fechamentoLeve(lead) },
};

// Quando tipoMensagem não vem no request, infere pelo estágio do Kanban.
// Espelha o fluxo da seção 5 do manual: cada estágio tem a próxima ação natural.
function inferirTipoPorEstagio(estagio) {
  switch (estagio) {
    case 'novo': return TIPOS_MENSAGEM.ABORDAGEM;
    case 'qualificado': return TIPOS_MENSAGEM.PORTFOLIO;
    case 'contatado': return TIPOS_MENSAGEM.FOLLOW_UP;
    case 'ganho': return TIPOS_MENSAGEM.FECHAMENTO;
    case 'descartado': return TIPOS_MENSAGEM.FOLLOW_UP;
    default: return TIPOS_MENSAGEM.ABORDAGEM;
  }
}

// Validação mínima do lead. Não levanta — preenche defaults pra não quebrar
// templates que dependem de nome/instagram.
function normalizarLead(input) {
  const lead = {
    nome: (input.nome || 'tudo bem').toString().trim(),
    nicho: (input.nicho || '').toString().trim(),
    cidade: (input.cidade || '').toString().trim(),
    temSite: input.temSite ?? null,
    temInstagram: input.temInstagram ?? null,
    linkQuebrado: Boolean(input.linkQuebrado),
    estagio: ESTAGIOS.includes(input.estagio) ? input.estagio : 'novo',
    instagram: (input.instagram || '').toString().replace(/^@/, '').trim(),
  };
  return lead;
}

// Ponto de entrada único. Recebe o lead bruto e o tipo desejado, devolve
// { mensagem, angulo, proximaAcao }. Provider de LLM opcional entra aqui.
export async function gerarMensagem(inputLead, inputTipo) {
  const lead = normalizarLead(inputLead);
  const tipo = inputTipo || inferirTipoPorEstagio(lead.estagio);
  const rota = ROTAS[tipo];
  if (!rota) {
    return {
      mensagem: '',
      angulo: null,
      proximaAcao: 'Tipo de mensagem desconhecido. Consulte docs/manual-prospector.md.',
      tipo,
    };
  }

  // Provider de LLM opcional (custo zero por padrão — só templates).
  // Quem quiser variação com IA seta PROSPECTOR_LLM_PROVIDER=openai etc.
  if (process.env.PROSPECTOR_LLM_PROVIDER) {
    try {
      const { gerarComLLM } = await import('./llm.js');
      const llm = await gerarComLLM(lead, tipo);
      if (llm?.mensagem) {
        return { mensagem: llm.mensagem, angulo: rota.angulo ?? tipo, proximaAcao: rota.acao, tipo };
      }
    } catch (e) {
      console.error('[prospector] LLM falhou, caindo p/ template:', e.message);
    }
  }

  const resultado = rota.resolve(lead);
  // ABORDAGEM devolve { angulo, mensagem }; os demais devolvem só a string.
  if (typeof resultado === 'string') {
    return { mensagem: resultado, angulo: rota.angulo, proximaAcao: rota.acao, tipo };
  }
  return { mensagem: resultado.mensagem, angulo: resultado.angulo, proximaAcao: rota.acao, tipo };
}

// Exporta os catálogos pra o Vitral/Turbina montarem a UI e o endpoint.
export { ANGULOS, PROXIMAS_ACOES };
