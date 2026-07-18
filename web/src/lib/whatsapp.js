// Monta o link wa.me com a mensagem de abordagem já preenchida e personalizada
// por nicho. A mensagem é EDITÁVEL pela tela (componente MessageSettings) e fica
// salva no navegador (localStorage); aqui mora o conteúdo padrão de fábrica.
// Limite de leads por disparo em massa (evita derrubar/bloquear o número).
export const WA_LIMIT = 10;

const norm = (s) => (s || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

// ── Conteúdo padrão (usado enquanto o usuário não personaliza) ──
// O template aceita as variáveis {nome} e {beneficio}.
// IMPORTANTE: o aluno deve editar o template em "✏️ Editar mensagem do WhatsApp"
// e colocar o próprio nome no lugar de [Seu nome] antes de começar a abordar.
const DEFAULT_TEMPLATE = `Oi, {nome}, tudo bem? Aqui é o [Seu nome]!

Crio sites com IA e ajudo negócios a aparecerem mais na internet. Estava olhando o perfil de vocês e tive uma ideia: {beneficio}.

Faz sentido conversarmos rapidinho sobre isso? Posso te mandar um áudio curto explicando melhor a ideia? 😉`;

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
};

// Substitui os placeholders de identidade ([Seu nome] e [seu-instagram]) pelo
// perfil salvo na config. Sem perfil preenchido, mantém o placeholder — que
// serve de lembrete visual pro aluno editar antes de enviar.
export function aplicarPerfil(texto, cfg = loadMsgConfig()) {
  if (!texto) return texto;
  let out = texto;
  if (cfg.seuNome) out = out.replaceAll('[Seu nome]', cfg.seuNome);
  if (cfg.seuInstagram) out = out.replaceAll('[seu-instagram]', cfg.seuInstagram.replace(/^@/, ''));
  return out;
}

// ── Persistência da config no navegador ──
const STORAGE_KEY = 'captacao.msgConfig';

export function loadMsgConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_MSG_CONFIG, ...JSON.parse(raw) };
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

// Monta a mensagem final aplicando a config (personalizada ou padrão).
export function montarMensagem(nome, niche, cfg = loadMsgConfig()) {
  const msg = (cfg.template || DEFAULT_TEMPLATE)
    .replaceAll('{nome}', nome ?? '')
    .replaceAll('{beneficio}', beneficio(niche, cfg));
  return aplicarPerfil(msg, cfg);
}

// Normaliza telefone BR para o formato do wa.me (DDI 55 + DDD + número, só dígitos).
export function normalizePhoneBR(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '').replace(/^0+/, '');
  if (d.length < 10) return null; // sem DDD não dá pra montar
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) return d;
  return '55' + d;
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
