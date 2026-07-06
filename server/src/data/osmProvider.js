// Provedor de dados REAL e 100% GRATUITO — OpenStreetMap via Overpass API.
// Sem chave, sem cartão, sem cobrança. Dados sob licença ODbL (exige atribuição,
// já presente no mapa). É a alternativa free à Google Places API.
//
// Limitações honestas vs. Google: cobertura varia por região/nicho e NÃO há
// avaliações/reviews (rating fica null). Em compensação, expõe a tag `website`,
// que é exatamente o filtro do produto ("negócios sem site").

import https from 'node:https';
import { withRetry, RetryError, isTransientHttpError } from '../utils/retry.js';

const ENDPOINTS = [
  // Mirrors públicos do Overpass — se o primeiro estiver enfileirado/lento,
  // tentamos o próximo. Multiplica as chances de pegar uma instância livre.
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
// Etiqueta do OSM: identifique a aplicação e um contato.
const UA = 'CacaCliente/0.1 (prospeccao de negocios sem site; curso Sites com IA do Zero)';

// Mapa nicho (PT-BR) -> tags OSM. `kw` são radicais SEM acento (casamos por
// substring contra o nicho normalizado). Vários grupos podem casar e somar tags.
const NICHE_GROUPS = [
  { kw: ['estetic', 'beleza', 'salao', 'manicure', 'depila', 'sobrancelha', 'cabelei', 'barbear', 'barbeiro', 'spa', 'maquia', 'unha'], tags: ['shop=beauty', 'shop=hairdresser', 'shop=massage', 'leisure=spa', 'shop=cosmetics'] },
  { kw: ['advog', 'advocacia', 'jurid'], tags: ['office=lawyer'] },
  { kw: ['nutri'], tags: ['healthcare=nutrition', 'amenity=doctors'] },
  { kw: ['dent', 'odonto'], tags: ['amenity=dentist', 'healthcare=dentist'] },
  { kw: ['clinic', 'consultor', 'medic', 'saude'], tags: ['amenity=clinic', 'healthcare=clinic', 'amenity=doctors'] },
  { kw: ['academia', 'fitness', 'crossfit', 'pilates', 'muscula'], tags: ['leisure=fitness_centre', 'leisure=sports_centre'] },
  { kw: ['restaurante', 'lanchonete', 'pizz', 'hamburg', 'cafe', 'bistro', 'padaria', 'comida'], tags: ['amenity=restaurant', 'amenity=fast_food', 'amenity=cafe', 'shop=bakery'] },
  { kw: ['pet', 'veterin'], tags: ['amenity=veterinary', 'shop=pet'] },
  { kw: ['contab', 'contador'], tags: ['office=accountant'] },
  { kw: ['imobili', 'corretor', 'imovel'], tags: ['office=estate_agent'] },
  { kw: ['arquitet'], tags: ['office=architect'] },
  { kw: ['psicol', 'terapeut', 'terapia'], tags: ['healthcare=psychotherapist', 'office=therapist'] },
  { kw: ['fisio'], tags: ['healthcare=physiotherapist'] },
  { kw: ['otica', 'oculos'], tags: ['shop=optician'] },
  { kw: ['mecanic', 'funilaria', 'oficina', 'autocenter'], tags: ['shop=car_repair', 'craft=car_repair'] },
  // Construção civil: empreiteiras, construtoras, reformas. Cobre vários
  // crafts comuns no OSM brasileiro (pedreiros, eletricistas, marceneiros…).
  { kw: ['empreit', 'construt', 'reform', 'pedreir', 'engenh'], tags: [
      'office=construction_company', 'craft=builder', 'craft=carpenter',
      'craft=electrician', 'craft=plumber', 'craft=painter',
      'craft=tiler', 'craft=roofer', 'shop=trade',
  ] },
  { kw: ['floricult', 'flor'], tags: ['shop=florist'] },
];

const normalize = (s) => (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function resolveTags(niche) {
  const n = normalize(niche);
  const tags = new Set();
  for (const g of NICHE_GROUPS) {
    if (g.kw.some((k) => n.includes(k))) g.tags.forEach((t) => tags.add(t));
  }
  return [...tags];
}

function buildQuery({ tags, niche, lat, lng, radiusKm }) {
  const R = Math.round(radiusKm * 1000);
  const center = `${lat},${lng}`;
  let body;
  if (tags.length) {
    body = tags
      .map((t) => {
        const [k, v] = t.split('=');
        return `nwr["${k}"="${v}"](around:${R},${center});`;
      })
      .join('');
  } else {
    // Nicho desconhecido -> busca por nome (mais ruidosa, mas funciona)
    const safe = niche.replace(/["\\]/g, ' ').trim();
    body = `nwr["name"~"${safe}",i](around:${R},${center});`;
  }
  return `[out:json][timeout:25];(${body});out center 150;`;
}

// node:https com `agent: false` (socket novo a cada chamada) + `family: 4`.
// Por que não usar fetch(): em processo longo, um request abortado durante uma
// fila do Overpass "envenena" o socket keep-alive do undici e TODOS os requests
// seguintes travam até o timeout. Conexão nova por chamada é imune a isso.
function overpassPost(url, query, timeoutMs) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = 'data=' + encodeURIComponent(query);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname,
        method: 'POST',
        agent: false,
        family: 4,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': UA,
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`Overpass HTTP ${res.statusCode}`));
        }
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data).elements ?? []);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    // Overpass enfileira a RESPOSTA por IP quando está sob carga (pode levar
    // vários segundos). 20s tolera picos; o cache evita repetir a consulta.
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Overpass timeout (servidor ocupado)')));
    req.on('error', reject);
    req.end(body);
  });
}

async function fetchOverpass(query) {
  // Cada endpoint ganha retry com backoff (transient errors: rede, 429, 5xx).
  // Falha em todos os endpoints -> RetryError amigável para o front.
  let lastErr;
  for (const url of ENDPOINTS) {
    try {
      return await withRetry(
        (attempt) => overpassPost(url, query, 25000),
        {
          label: 'Overpass',
          retries: 2,
          baseMs: 700,
          shouldRetry: isTransientHttpError,
        }
      );
    } catch (e) {
      lastErr = e; // tenta o próximo endpoint
    }
  }
  if (lastErr instanceof RetryError) throw lastErr;
  throw new RetryError('Overpass', ENDPOINTS.length, lastErr);
}

function assembleAddress(t) {
  const parts = [];
  const street = t['addr:street'];
  const num = t['addr:housenumber'];
  if (street) parts.push(num ? `${street}, ${num}` : street);
  const area = t['addr:suburb'] || t['addr:neighbourhood'] || t['addr:district'];
  if (area) parts.push(area);
  const city = t['addr:city'] || t['addr:town'];
  if (city) parts.push(city);
  return parts.join(' – ') || city || area || 'Endereço não informado no OSM';
}

function mapElement(el) {
  const t = el.tags ?? {};
  const name = t.name || t['name:pt'] || t.brand;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!name || lat == null || lng == null) return null;

  const website = t.website || t['contact:website'] || t.url || t['website:official'] || t['contact:url'];
  const phone = t.phone || t['contact:phone'] || t['contact:mobile'] || null;
  return {
    id: `osm:${el.type}/${el.id}`,
    source: 'osm', // rastreabilidade da origem do dado (boa prática LGPD)
    name,
    address: assembleAddress(t),
    phone,
    rating: null, // OSM não tem avaliações
    reviewsCount: null,
    hasWebsite: Boolean(website),
    lat,
    lng,
  };
}

// Cache em memória: buscas idênticas não re-batem no Overpass (que limita a
// 2 slots por IP). Mantém o app rápido e dentro da etiqueta do serviço gratuito.
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function buscarEstabelecimentos({ niche, city, lat, lng, radiusKm }) {
  const cacheKey = `${normalize(niche)}|${lat.toFixed(3)}|${lng.toFixed(3)}|${radiusKm}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.result;

  const tags = resolveTags(niche);
  const query = buildQuery({ tags, niche, lat, lng, radiusKm });
  const elements = await fetchOverpass(query);

  const seen = new Set();
  const all = [];
  for (const el of elements) {
    const lead = mapElement(el);
    if (!lead) continue;
    const key = `${lead.name.toLowerCase()}|${lead.lat.toFixed(4)}|${lead.lng.toFixed(4)}`;
    if (seen.has(key)) continue; // dedup node/way do mesmo local
    seen.add(key);
    lead.niche = niche;
    all.push(lead);
  }
  const result = { found: all.length, leads: all.filter((l) => !l.hasWebsite) };
  cache.set(cacheKey, { ts: Date.now(), result });
  return result;
}
