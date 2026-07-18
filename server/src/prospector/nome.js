// Detector de nome: decide se o nome do lead é PESSOA ou EMPRESA e extrai o
// primeiro nome (preservando Dr./Dra. quando presente). Espelha a heurística
// pedida pelo Rodrigo: keywords de negócio, números ou siglas indicam EMPRESA;
// 2 a 5 palavras alfabéticas sem keyword indicam PESSOA.
//
// Não inferimos gênero nem inventamos título. Se vier "Dr."/"Dra." no nome,
// preservamos o título + primeiro nome ("Dra. Ana"). Se vier só nome, usamos
// o primeiro ("Carmem"). Se for empresa, a saudação é neutra (manual seção 4).

// Capitaliza a primeira letra de uma palavra (preservando o resto). Usado pra
// normalizar títulos e nomes que vêm lowercase do scraping ("dra. ana").
const capitalizar = (s) => {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
};

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

const normalize = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .trim();

const apenasLetras = (s) => /^[a-zà-ÿ.\s]+$/i.test((s || '').trim());

// Detecta se o nome tem indicadores de empresa: keyword de negócio, número,
// sigla mista (letras+números), sufixo jurídico (LTDA/EIRELI/MEI/CIA) ou &.
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
  const norm = normalize(original);

  // Sufixo jurídico — forte indicador de empresa.
  if (/\b(ltda|eireli|mei|cia|s\/a|s\/r|ltda\.?)\b/i.test(lower)) {
    return { tipo: 'empresa', primeiroNome: original };
  }

  // & comercial (ex: "João & Maria Lanches") — empresa.
  if (/&/.test(original)) {
    return { tipo: 'empresa', primeiroNome: original };
  }

  // Números no nome — provável empresa (CNPJ, telefone, filial).
  if (/\d/.test(original)) {
    return { tipo: 'empresa', primeiroNome: original };
  }

  // Keyword de negócio — empresa.
  const tokens = norm.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    const limpo = t.replace(/[.,]/g, '');
    if (KEYWORDS_EMPRESA.includes(limpo)) {
      return { tipo: 'empresa', primeiroNome: original };
    }
  }

  // Sigla toda em maiúsculas com 2+ letras (ex: "IMB Consultoria") — empresa.
  if (/\b[A-Z]{2,}\b/.test(original)) {
    return { tipo: 'empresa', primeiroNome: original };
  }

  // Só letras? Conta palavras alfabéticas.
  if (!apenasLetras(original)) {
    // Tem caracteres estranhos — assume empresa por segurança.
    return { tipo: 'empresa', primeiroNome: original };
  }

  const palavras = original.split(/\s+/).filter(Boolean);
  if (palavras.length < 2) {
    // Uma palavra só. Se for título (Dr./Dra./Sr./Sra.) sozinho, é input
    // incompleto — trata como desconhecido (abertura neutra) pra evitar
    // saudação quebrada tipo "Oi, Dra.! Tudo bem?".
    const unicaLower = palavras[0].toLowerCase().replace(/[.,]/g, '');
    if (TITULOS.includes(unicaLower)) {
      return { tipo: 'desconhecido', primeiroNome: '' };
    }
    // Senão, é apelido ou primeiro nome — pessoa.
    return { tipo: 'pessoa', primeiroNome: capitalizar(palavras[0]) };
  }
  if (palavras.length > 5) {
    // Mais de 5 palavras sem keyword — provável empresa com nome longo.
    return { tipo: 'empresa', primeiroNome: original };
  }

  // 2 a 5 palavras alfabéticas sem keyword — pessoa.
  return { tipo: 'pessoa', primeiroNome: extrairPrimeiroNomePessoa(original) };
}

// Extrai o primeiro nome de uma PESSOA, preservando título Dr./Dra. quando
// presente. NÃO infere gênero nem inventa título.
export function extrairPrimeiroNomePessoa(nome) {
  const palavras = (nome || '').trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return '';

  const primeiraLower = palavras[0].toLowerCase().replace(/[.,]/g, '');
  if (TITULOS.includes(primeiraLower)) {
    // "Dr." / "Dra." / "Sr." etc — preserva título (com ponto original) + próximo nome.
    // Normaliza capitalização: "dra." -> "Dra.", "ana" -> "Ana".
    const tituloOriginal = palavras[0]; // "Dra." ou "dra."
    const tituloFormatado = capitalizar(tituloOriginal);
    // Se não tem segundo nome, devolve só o título (saudacao() trata o caso
    // de título sozinho como empresa/neutro pra evitar "Oi, Dra.! Tudo bem?").
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
  if (tipo === 'empresa') {
    return 'Oi, tudo bem?';
  }
  // Desconhecido — neutro.
  return 'Oi, tudo bem?';
}
