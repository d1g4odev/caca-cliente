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
  'petshop',
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

export function detectarTipoNome(nome) {
  const original = (nome || '').trim();
  if (!original) return { tipo: 'desconhecido', primeiroNome: '' };

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

// Mensagem de fallback quando o motor (API) falha — segue o Manual Mestre
// Prospector: saudação por primeiro nome (pessoa) ou abertura neutra (empresa),
// sem "áudio curto", sem nome completo. NÃO usa o template legado de
// whatsapp.js (que tem "posso te mandar um áudio curto" e saudação por nome
// completo — proibido pelo manual).
//
// Esta é a mensagem que o aluno vê quando o endpoint do motor está offline.
// Curta, neutra, respeita o manual. O aluno pode editar antes de enviar.
export function mensagemFallbackManual(nome, nicho) {
  const abertura = saudacao(nome);
  const nichoTxt = nicho ? ` de ${nicho}` : '';
  return `${abertura} Vi seu perfil${nichoTxt} e achei muito profissional. Posso te mostrar uma ideia rápida de como atrair mais clientes? É só um minuto.`;
}

