// Detector de nome: decide se o nome do lead é PESSOA ou EMPRESA e extrai o
// primeiro nome (preservando Dr./Dra. quando presente). Espelha a heurística
// pedida pelo Rodrigo: keywords de negócio, números ou siglas indicam EMPRESA;
// 2 a 5 palavras alfabéticas sem keyword indicam PESSOA.
//
// Não inferimos gênero nem inventamos título. Se vier "Dr."/"Dra." no nome,
// preservamos o título + primeiro nome ("Dra. Ana"). Se vier só nome, usamos
// o primeiro ("Carmem"). Se for empresa, a saudação é neutra (manual seção 4).

const KEYWORDS_EMPRESA = [
  'clinica', 'clínica',
  'salao', 'salão',
  'studio', 'studío',
  'barbearia',
  'restaurante',
  'pizzaria',
  'hotel',
  'pousada',
  'mercado',
  'farmacia', 'farmácia',
  'otica', 'ótica',
  'petshop', 'pet shop',
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
  'estudio', 'estúdio',
  'agencia', 'agência',
  'construtora',
  'distribuidora',
  'representacoes', 'representações',
  'comercio', 'comércio',
];

const TITULOS = ['dr', 'dra', 'dr.', 'dra.', 'sr', 'sra', 'srta', 'prof', 'profa'];

const normalize = (s) => (s || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .trim();

const apenasLetras = (s) => /^[a-zà-ÿ.\s]+$/i.test((s || '').trim());

// Detecta se o nome tem indicadores de empresa: keyword de negócio, número,
// sigla mista (letras+números), sufixo jurídico (LTDA/EIRELI/MEI/CIA) ou &.
export function detectarTipoNome(nome) {
  const original = (nome || '').trim();
  if (!original) return { tipo: 'desconhecido', primeiroNome: '' };

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
    // Uma palavra só — provável pessoa (ou apelido).
    return { tipo: 'pessoa', primeiroNome: palavras[0] };
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
    const tituloOriginal = palavras[0]; // "Dra." ou "dra."
    const tituloFormatado = /^[A-Z]/.test(tituloOriginal)
      ? tituloOriginal
      : tituloOriginal.charAt(0).toUpperCase() + tituloOriginal.slice(1);
    const segundo = palavras[1] || '';
    return segundo ? `${tituloFormatado} ${segundo}` : tituloFormatado;
  }

  return palavras[0];
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
