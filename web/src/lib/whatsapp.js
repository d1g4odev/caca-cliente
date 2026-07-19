// Monta o link wa.me com a mensagem de abordagem já preenchida e personalizada
// por nicho. A mensagem é EDITÁVEL pela tela (componente MessageSettings) e fica
// salva no navegador (localStorage); aqui mora o conteúdo padrão de fábrica.
// Limite de leads por disparo em massa (evita derrubar/bloquear o número).
export const WA_LIMIT = 10;

import { saudacao } from './nome.js';

const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// ── Modelos de abordagem (PDF mestre) ──
// Os 3 seguem a mesma espinha ensinada no manual: elogio específico e
// verdadeiro → oportunidade leve (nunca criticar o lead) → quem sou e o que
// faço amarrado ao nicho/cidade → pedido de permissão, sem compromisso.
// Sem textão, sem prometer milagre, sem mencionar IA.
// Variáveis aceitas: {saudacao}, {nome}, {nicho}, {cidade} e {beneficio}.
// O [Seu nome] é preenchido automaticamente pelo perfil (onboarding / tela ✏️).
export const MODELOS_ABORDAGEM = [
  {
    id: 'avaliacoes-google',
    nome: '⭐ Avaliações no Google',
    dica: 'Gancho: avaliações ótimas, mas sem site. O mais direto — confira as avaliações antes de enviar.',
    template: `{saudacao} Vi as avaliações de vocês no Google, são ótimas. Procurei o site de vocês e não encontrei.

Me chamo [Seu nome], crio sites profissionais pra vocês aparecerem no Google quando alguém buscar {nicho} em {cidade}.

Posso te mostrar alguns exemplos do meu trabalho, sem compromisso?`,
  },
  {
    id: 'pesquisa-local',
    nome: '📍 Achei na pesquisa',
    dica: 'Gancho: encontrei vocês pesquisando o nicho na cidade. Usa o benefício por nicho.',
    template: `{saudacao}

Conheci o trabalho de vocês pesquisando por {nicho} em {cidade} e achei muito bacana o que fazem. Procurei um site pra conhecer melhor e não encontrei.

Me chamo [Seu nome], sou desenvolvedor e trabalho com sites pra negócios locais. Acredito que {beneficio}.

Posso te mostrar uma ideia rápida?`,
  },
  {
    id: 'elogio-perfil',
    nome: '💬 Elogio ao perfil',
    dica: 'Gancho: o perfil já é profissional; um site deixaria a presença no mesmo nível. Bom pra quem tem Instagram ativo.',
    template: `{saudacao}

Vi o perfil de vocês e achei muito profissional. Dá pra perceber o cuidado que vocês têm com o trabalho.

Me chamo [Seu nome], sou desenvolvedor e faço sites personalizados. Acredito que um site próprio poderia apresentar melhor os serviços de vocês e passar ainda mais confiança pra quem chega pelo Google ou pelo Instagram.

Posso te mostrar alguns trabalhos que já desenvolvi?`,
  },
];

const DEFAULT_TEMPLATE = MODELOS_ABORDAGEM[0].template;

// Gancho de valor por ramo. `kw` são radicais SEM acento (casam por substring).
// A oferta é SEMPRE site / landing page / site institucional pra apresentar o
// trabalho — nunca sistema, agendamento, pedidos online ou automação.
const DEFAULT_BENEFICIOS = [
  { kw: ['estetic', 'beleza', 'salao', 'barbear', 'manicure', 'sobrancelha', 'cabelei', 'spa', 'unha', 'depila'], txt: 'um site pra mostrar o trabalho de vocês, com fotos dos resultados, os serviços e o botão direto pro WhatsApp, poderia atrair muito mais clientes' },
  { kw: ['restaurante', 'lanchonete', 'pizz', 'hamburg', 'cafe', 'bar', 'bistro', 'padaria', 'comida', 'gastr'], txt: 'um site institucional pra apresentar o cardápio, o espaço e a história de vocês poderia trazer mais clientes de quem procura no Google' },
  { kw: ['advog', 'advocacia', 'jurid'], txt: 'um site institucional pra apresentar o escritório e as áreas de atuação poderia passar mais credibilidade e captar mais clientes' },
  { kw: ['clinic', 'consultor', 'medic', 'saude', 'dent', 'odonto', 'fisio', 'psicol'], txt: 'um site profissional pra apresentar os atendimentos e a estrutura de vocês poderia passar mais confiança pra quem procura no Google' },
  { kw: ['nutri'], txt: 'um site pra apresentar seu trabalho e seus atendimentos poderia te dar mais autoridade e atrair mais pacientes' },
  { kw: ['academia', 'fitness', 'pilates', 'crossfit', 'muscula'], txt: 'um site pra apresentar a estrutura, as modalidades e os planos poderia atrair muito mais alunos' },
  { kw: ['pet', 'veterin'], txt: 'um site pra apresentar os serviços e o cuidado de vocês com os pets poderia passar mais confiança e atrair mais clientes' },
  { kw: ['contab', 'contador'], txt: 'um site institucional pra apresentar os serviços do escritório poderia passar mais credibilidade e captar mais clientes' },
  { kw: ['imobili', 'corretor', 'imovel'], txt: 'um site pra apresentar a imobiliária e os imóveis em destaque poderia gerar mais contatos e passar mais profissionalismo' },
];
const DEFAULT_BENEFICIO_PADRAO = 'um site profissional (uma landing page bem feita) pra apresentar o trabalho de vocês poderia passar mais confiança e atrair mais clientes de quem procura no Google';

export const DEFAULT_MSG_CONFIG = {
  template: DEFAULT_TEMPLATE,
  beneficios: DEFAULT_BENEFICIOS,
  beneficioPadrao: DEFAULT_BENEFICIO_PADRAO,
  seuNome: '',
  seuInstagram: '',
  portfolio1: '',
  portfolio2: '',
};

// Substitui os placeholders de identidade ([Seu nome] e [seu-instagram]) pelo
// perfil salvo na config. Sem perfil preenchido, mantém o placeholder — que
// serve de lembrete visual pro aluno editar antes de enviar.
// Também substitui [link-1]/[link-2] pelos portfólios, quando preenchidos.
export function aplicarPerfil(texto, cfg = loadMsgConfig()) {
  if (!texto) return texto;
  let out = texto;
  if (cfg.seuNome) out = out.replaceAll('[Seu nome]', cfg.seuNome);
  if (cfg.seuInstagram) out = out.replaceAll('[seu-instagram]', cfg.seuInstagram.replace(/^@/, ''));
  if (cfg.portfolio1) out = out.replaceAll('[link-1]', cfg.portfolio1);
  if (cfg.portfolio2) out = out.replaceAll('[link-2]', cfg.portfolio2);
  return out;
}

// ── Persistência da config no navegador ──
const STORAGE_KEY = 'captacao.msgConfig';

export function loadMsgConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const cfg = { ...DEFAULT_MSG_CONFIG, ...JSON.parse(raw) };
      // Migração: templates de fábrica antigos tinham "posso te mandar um áudio
      // curto" (proibido pelo manual) ou "Crio sites com IA" (fora da abordagem
      // do PDF mestre). Se o aluno salvou a config antes da troca e NÃO
      // personalizou o texto (ainda contém a frase de fábrica), atualiza pro
      // default novo. Template genuinamente customizado é preservado.
      if (cfg.template && (cfg.template.includes('áudio curto') || cfg.template.includes('Crio sites com IA'))) {
        cfg.template = DEFAULT_TEMPLATE;
        saveMsgConfig(cfg);
      }
      return cfg;
    }
  } catch { /* localStorage indisponível: usa o padrão */ }
  return DEFAULT_MSG_CONFIG;
}

export function saveMsgConfig(cfg) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch { /* ignora */ }
}

export function resetMsgConfig() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignora */ }
}

// Conversões entre o array de benefícios e o texto editável (1 regra por linha:
// "palavra1, palavra2 => texto do benefício").
export function beneficiosToText(beneficios) {
  return beneficios.map((b) => `${b.kw.join(', ')} => ${b.txt}`).join('\n');
}
export function beneficiosFromText(text) {
  return (text || '')
    .split('\n')
    .map((line) => {
      const i = line.indexOf('=>');
      if (i < 0) return null;
      const kw = line.slice(0, i).split(',').map((s) => norm(s.trim())).filter(Boolean);
      const txt = line.slice(i + 2).trim();
      return kw.length && txt ? { kw, txt } : null;
    })
    .filter(Boolean);
}

function beneficio(niche, cfg) {
  const n = norm(niche);
  return (cfg.beneficios.find((b) => b.kw.some((k) => n.includes(k))) || {}).txt || cfg.beneficioPadrao;
}

// ── Cidade da última busca ──
// O template padrão usa {cidade} ("...quando alguém buscar {nicho} em {cidade}").
// A cidade não vem no lead individual — vem da busca. O App chama lembrarCidade()
// a cada busca e o montarMensagem lê daqui. Guarda só o nome ("Caxias do Sul",
// sem ", Rio Grande do Sul, Brasil" do geocode).
const CITY_KEY = 'captacao.lastCity';
export function lembrarCidade(city) {
  const c = (city || '').split(',')[0].trim();
  try { if (c) localStorage.setItem(CITY_KEY, c); } catch { /* ignora */ }
}
function cidadeLembrada() {
  try { return localStorage.getItem(CITY_KEY) || ''; } catch { return ''; }
}

// Monta a mensagem final aplicando a config (personalizada ou padrão).
export function montarMensagem(nome, niche, cfg = loadMsgConfig()) {
  const msg = (cfg.template || DEFAULT_TEMPLATE)
    .replaceAll('{saudacao}', saudacao(nome))
    .replaceAll('{nome}', nome ?? '')
    .replaceAll('{beneficio}', beneficio(niche, cfg))
    .replaceAll('{nicho}', (niche || '').trim() || 'o serviço de vocês')
    .replaceAll('{cidade}', cidadeLembrada() || 'sua cidade');
  return aplicarPerfil(msg, cfg);
}

// Normaliza telefone BR para o formato do wa.me (DDI 55 + DDD + número, só dígitos).
// Mantido em paridade com server/src/utils/phone.js (regras estritas).
const SPECIAL_PREFIXES = ['0800', '0300', '0500', '0900', '100', '190', '192', '193', '197', '198', '199'];
export function normalizePhoneBR(phone) {
  if (!phone) return null;
  const raw = String(phone).replace(/\D/g, '');
  if (!raw) return null;
  // Rejeita serviços especiais/emergência (checar antes de tirar zero à esquerda)
  if (SPECIAL_PREFIXES.some((p) => raw.startsWith(p))) return null;
  const digits = raw.replace(/^0+/, '');
  if (!digits) return null;
  let n = digits;
  // Se já veio com código do Brasil (55) e comprimento certo (12 fixo / 13 cel), mantém
  if (!(n.startsWith('55') && (n.length === 12 || n.length === 13))) {
    // Sem 55: precisa ter 10 (fixo) ou 11 (celular) dígitos
    if (n.length !== 10 && n.length !== 11) return null;
    n = '55' + n;
  }
  // DDD válido: 11 a 99
  const ddd = Number(n.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;
  return n;
}

export function waLink(phone, nome, niche) {
  const d = normalizePhoneBR(phone);
  if (!d) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(montarMensagem(nome, niche))}`;
}

// Monta link wa.me com mensagem personalizada (ex: mensagem gerada pela IA).
// Usado pelo botão "Gerar mensagem" no LeadDetails.
export function waLinkWithMessage(phone, message) {
  const d = normalizePhoneBR(phone);
  if (!d || !message) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}
