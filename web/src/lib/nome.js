// Detector de nome (espelho frontend de server/src/prospector/nome.js).
// Decide se o nome do lead é PESSOA ou EMPRESA e extrai o primeiro nome,
// preservando Dr./Dra. quando presente. Não infere gênero nem inventa título.
//
// Mantido em paridade com o motor do servidor — se a API do motor falhar,
// o fallback do DispatchMode usa esta lógica para gerar uma saudação
// compatível com o Manual Mestre Prospector (sem "áudio curto", sem nome completo).

const KEYWORDS_EMPRESA = [
  'clinica', 'clínica',
  'salao', 'salão',
  'studio', 'studío', 'estudio', 'estúdio',
  'barbearia',
  'restaurante',
  'pizzaria',
  'hotel',
  'pousada',
  'mercado',
  'farmacia', 'farmácia',
  'otica', 'ótica',
  'petshop', 'pet shop', 'pet', 'shop',
  'oficina',
  'auto',
  'imobiliaria', 'imobiliária',
  'advocacia',
  'escritorio', 'escritório',
  'consultorio', 'consultório',
  'academia',
  'instituto',
  'centro',
  'espaco', 'espaço',
  'loja',
  'boutique',
  'ltda',
  'eireli',
  'mei',
  'cia',
  'drogaria',
  'supermercado',
  'padaria',
  'cafeteria',
  'lanchonete',
  'estetica', 'estética',
  'agencia', 'agência',
  'construtora',
  'distribuidora',
  'representacoes', 'representações',
  'comercio', 'comércio',
  'acai', 'açaí',
];

const TITULOS = ['dr', 'dra', 'dr.', 'dra.', 'sr', 'sra', 'srta', 'prof', 'profa'];

const normalize = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .trim();

const apenasLetras = (s) => /^[a-zà-ÿ.\s]+$/i.test((s || '').trim());

const capitalizar = (s) => {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Converte nome inteiro em caixa alta para title case.
// "DRA MARIA SOUZA" → "Dra. Maria Souza". Títulos (dr, dra, sr, sra)
// ganham ponto final automaticamente.
const titleCase = (s) => {
  return s.split(/\s+/).map(w => {
    const limpo = w.toLowerCase().replace(/[.,]/g, '');
    const cap = capitalizar(limpo);
    return TITULOS.includes(limpo) ? cap + '.' : cap;
  }).join(' ');
};

export function detectarTipoNome(nome) {
  let original = (nome || '').trim();
  if (!original) return { tipo: 'desconhecido', primeiroNome: '' };

  // BUG QA #2: nome inteiro em CAIXA ALTA → normalizar pra title case
  // antes de classificar, para evitar que o teste de sigla (\b[A-Z]{2,}\b)
  // capture nomes como ANA PAULA, MARIA DAS DORES, DRA MARIA.
  // Siglas reais em caixa mista (ex: IMB Consultoria) continuam detectadas.
  if (original.length >= 2 && original === original.toUpperCase()) {
    original = titleCase(original);
  }

  const lower = original.toLowerCase();

  if (/\b(ltda|eireli|mei|cia|s\/a|s\/r|ltda\.?)\b/i.test(lower)) {
    return { tipo: 'empresa', primeiroNome: original };
  }
  if (/&/.test(original)) return { tipo: 'empresa', primeiroNome: original };
  if (/\d/.test(original)) return { tipo: 'empresa', primeiroNome: original };

  const tokens = normalize(original).split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    const limpo = t.replace(/[.,]/g, '');
    if (KEYWORDS_EMPRESA.includes(limpo)) {
      return { tipo: 'empresa', primeiroNome: original };
    }
  }

  if (/\b[A-Z]{2,}\b/.test(original)) {
    return { tipo: 'empresa', primeiroNome: original };
  }

  if (!apenasLetras(original)) {
    return { tipo: 'empresa', primeiroNome: original };
  }

  const palavras = original.split(/\s+/).filter(Boolean);
  if (palavras.length < 2) {
    const unicaLower = palavras[0].toLowerCase().replace(/[.,]/g, '');
    if (TITULOS.includes(unicaLower)) {
      return { tipo: 'desconhecido', primeiroNome: '' };
    }
    return { tipo: 'pessoa', primeiroNome: capitalizar(palavras[0]) };
  }
  if (palavras.length > 5) {
    return { tipo: 'empresa', primeiroNome: original };
  }

  return { tipo: 'pessoa', primeiroNome: extrairPrimeiroNomePessoa(original) };
}

export function extrairPrimeiroNomePessoa(nome) {
  const palavras = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return '';

  const primeiraLower = palavras[0].toLowerCase().replace(/[.,]/g, '');
  if (TITULOS.includes(primeiraLower)) {
    const tituloFormatado = capitalizar(palavras[0]);
    if (palavras.length < 2) return '';
    const segundo = capitalizar(palavras[1]);
    return `${tituloFormatado} ${segundo}`;
  }

  return capitalizar(palavras[0]);
}

// Saudação pronta para usar nos templates. Pessoa -> "Oi, <primeiroNome>!
// Tudo bem?". Empresa -> "Oi, tudo bem?" (neutro, manual seção 4).
export function saudacao(nome) {
  const { tipo, primeiroNome } = detectarTipoNome(nome);
  if (tipo === 'pessoa' && primeiroNome) {
    return `Oi, ${primeiroNome}! Tudo bem?`;
  }
  return 'Oi, tudo bem?';
}

// Mensagem de fallback quando o motor (API) falha — segue a abordagem do PDF
// mestre: elogio verdadeiro (avaliações no Google) + gancho concreto (procurei
// o site e não encontrei) + quem sou e o que faço amarrado ao nicho + CTA sem
// compromisso. Saudação por primeiro nome (pessoa) ou abertura neutra (empresa).
//
// Esta é a mensagem que o aluno vê quando o endpoint do motor está offline.
// Curta, natural, sem "crio sites com IA". O aluno pode editar antes de enviar.
export function mensagemFallbackManual(nome, nicho) {
  const abertura = saudacao(nome);
  const busca = nicho ? `quando alguém buscar ${nicho} na região` : 'quando alguém buscar o serviço de vocês na região';
  return [
    `${abertura} Vi as avaliações de vocês no Google, são ótimas. Procurei o site de vocês e não encontrei.`,
    `Me chamo [Seu nome], crio sites profissionais pra vocês aparecerem no Google ${busca}.`,
    'Posso te mostrar alguns exemplos do meu trabalho, sem compromisso?',
  ].join('\n');
}

