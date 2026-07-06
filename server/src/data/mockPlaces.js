import crypto from 'node:crypto';

// Gerador de estabelecimentos FICTÍCIOS para o scaffold.
// Na versão real, este módulo é substituído pela Places API (searchText +
// Place Details com field mask) ou por um agregador (Outscraper/Apify).
// O contrato de saída (shape do objeto) permanece o mesmo.

const PREFIXOS = ['Espaço', 'Studio', 'Clínica', 'Ateliê', 'Casa', 'Instituto', 'Centro', 'Vila'];
const NOMES = ['Bella', 'Essência', 'Vida Leve', 'Harmonia', 'Lumina', 'Prime', 'Renova', 'Aurora', 'Jardins', 'Alecrim', 'Horizonte', 'Mariposa'];
const SOBRENOMES = ['Almeida', 'Castro', 'Nogueira', 'Ferraz', 'Sampaio', 'Duarte', 'Linhares', 'Rocha'];
const RUAS = ['Rua das Acácias', 'Av. Central', 'Rua dos Ipês', 'Al. das Palmeiras', 'Travessa do Sol', 'Rua Sete de Abril', 'Av. Brasil', 'Rua das Hortênsias'];

const DDD_POR_CIDADE = [
  ['são paulo', '11'],
  ['rio de janeiro', '21'],
  ['belo horizonte', '31'],
  ['curitiba', '41'],
  ['porto alegre', '51'],
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand4 = () => String(1000 + Math.floor(Math.random() * 9000));

function nomeFicticio(niche) {
  const n = niche.toLowerCase();
  if (n.includes('advo')) return `${pick(SOBRENOMES)} & ${pick(SOBRENOMES)} Advogados`;
  if (n.includes('nutri')) return `${pick(['Consultório', 'Clínica', 'Espaço'])} ${pick(NOMES)} Nutrição`;
  return `${pick(PREFIXOS)} ${pick(NOMES)}`;
}

// Ponto uniforme dentro de um disco de raioKm em volta de (lat, lng)
function pontoNoRaio(lat, lng, raioKm) {
  const r = raioKm * Math.sqrt(Math.random());
  const theta = Math.random() * 2 * Math.PI;
  const dLat = (r * Math.cos(theta)) / 111.32;
  const dLng = (r * Math.sin(theta)) / (111.32 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

export function gerarEstabelecimentos({ niche, city, lat, lng, radiusKm, count = 26 }) {
  const ddd = DDD_POR_CIDADE.find(([nome]) => city.toLowerCase().includes(nome))?.[1] ?? '11';
  return Array.from({ length: count }, () => {
    const pos = pontoNoRaio(lat, lng, radiusKm);
    return {
      id: crypto.randomUUID(),
      name: nomeFicticio(niche),
      niche,
      address: `${pick(RUAS)}, ${100 + Math.floor(Math.random() * 1900)} – ${city}`,
      phone: `(${ddd}) 9${rand4()}-${rand4()}`,
      rating: Math.round((3.4 + Math.random() * 1.6) * 10) / 10,
      reviewsCount: 3 + Math.floor(Math.random() * 180),
      hasWebsite: Math.random() < 0.35, // ~35% têm site e serão descartados pelo filtro
      lat: pos.lat,
      lng: pos.lng,
    };
  });
}
