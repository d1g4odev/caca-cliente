// Worker de enriquecimento — 100% gratuito, sem chaves de API e sem cobrança.
// Port JS fiel do workers/enrich.py (removido para facilitar empacotamento Electron).
//
// Entrada : enrichLead({name, city, phone}) -> {email,instagram,facebook,linkedin,
//           whatsapp,confidence,partial,discoveredWebsite,linkBroken}
// Saída   : sempre um objeto válido (nunca lança), mesmo em erro/bloqueio.
//
// Estratégia de performance (o usuário não espera demais):
//   1. UMA consulta SERP por lead no caminho quente: pega redes sociais E e-mails do
//      mesmo HTML (menos requests = mais rápido e menor risco de bloqueio).
//   2. 2ª consulta só dispara se o e-mail não apareceu na primeira.
//   3. Orçamento de tempo rígido (9s): estourou, devolve parcial — nunca trava.
//
// SERP: DuckDuckGo HTML (gratuito, sem JS, sem cadastro). Em escala troque por
// Brave Search API (free tier) ou Serper.dev.

// ── Constantes (espelham enrich.py) ──────────────────────────────────────────
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const DDG = 'https://html.duckduckgo.com/html/';
const TIMEOUT_LEAD = 9000; // ms, orçamento total por lead
const REQ_TIMEOUT = 6000;  // ms, timeout individual SERP
const SERP_RETRIES = 2;    // tentativas após 1ª falha (total 3)
const SERP_BASE_MS = 600;  // backoff base

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const HREF_RE = /href="(https?:\/\/[^"]+)"/gi;
const EMAIL_BLOCK = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];
const DOMAIN_BLOCK = ['duckduckgo.com', 'example.com', 'w3.org', 'sentry', 'wixpress.com', '@2x'];
const LINKTREE_DOMAINS = ['linktr.ee', 'bio.link', 'beacons.ai', 'lnk.bio'];

const NON_WEBSITE_HOSTS = [
  // Redes sociais e mensageiros
  'facebook.com', 'fb.com', 'instagram.com', 'linkedin.com',
  'twitter.com', 'x.com', 'youtube.com', 'tiktok.com', 'pinterest.com',
  'wa.me', 'api.whatsapp.com', 't.me', 'threads.net',
  // Mapas e listagens de negócios
  'google.com', 'google.com.br', 'goo.gl', 'maps.app.goo.gl', 'waze.com',
  'foursquare.com', 'yelp.com',
  // Agregadores BR
  'jusbrasil.com.br', 'oab.org.br', 'advogados.com.br',
  'doctoralia.com.br', 'consultaremedios.com.br', 'boaconsulta.com',
  'guiamais.com.br', 'telelistas.net', 'apontador.com.br', 'solutudo.com.br',
  'olx.com.br', 'mercadolivre.com.br', 'ifood.com.br', 'rappi.com.br',
  // Diretórios e plataformas
  'wikipedia.org', 'yellowpages.com', 'tripadvisor.com', 'booking.com',
  'reclameaqui.com.br', 'econodata.com.br', 'cnpj.biz',
  // Domínios genéricos
  'wixsite.com', 'wordpress.com', 'blogspot.com',
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function unescapeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

// ── SERP ─────────────────────────────────────────────────────────────────────
async function serp(query) {
  let lastErr;
  for (let attempt = 0; attempt <= SERP_RETRIES; attempt++) {
    if (attempt > 0) await sleep(SERP_BASE_MS * Math.pow(2, attempt - 1));
    try {
      const res = await fetch(DDG, {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ q: query }),
        signal: AbortSignal.timeout(REQ_TIMEOUT),
      });
      // 202/418/429 = rate limit / anti-bot — retry with backoff
      if ([202, 418, 429].includes(res.status) && attempt < SERP_RETRIES) {
        lastErr = new Error(`DDG HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) throw new Error(`DDG HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < SERP_RETRIES) {
        await sleep(SERP_BASE_MS * Math.pow(2, attempt - 1));
        continue;
      }
      throw lastErr;
    }
  }
  throw lastErr || new Error('DDG indisponível');
}

function decodeLinks(html) {
  const links = [];
  for (const m of html.matchAll(HREF_RE)) {
    const url = unescapeHtml(m[1]);
    if (!url.toLowerCase().includes('duckduckgo.com')) links.push(url);
  }
  return links;
}

function isOfficialWebsite(url, leadName) {
  const low = url.toLowerCase();
  if (NON_WEBSITE_HOSTS.some((h) => low.includes(h))) return false;

  let host = low.split('//')[1]?.split('/')[0]?.split('?')[0] || '';
  if (host.startsWith('www.')) host = host.slice(4);
  if (!host || !host.includes('.')) return false;

  const GENERIC = new Set([
    'de', 'do', 'da', 'dos', 'das', 'e', '&', 'associados', 'advogados',
    'advocacia', 'studio', 'salao', 'clinica', 'consultorio',
    'instituto', 'centro', 'espaco', 'ateliê', 'atelie', 'casa', 'vila', 'ltda',
  ]);

  const base = leadName.toLowerCase().replace(/[^a-z0-9 ]/g, '');
  const tokens = base.split(' ').filter((t) => t && !GENERIC.has(t) && t.length >= 3);
  if (!tokens.length) return false;

  const hostClean = host.split('.')[0].replace(/[^a-z0-9]/g, '');
  return tokens.some((t) => hostClean.includes(t));
}

function firstSocial(links, domain, bad) {
  for (const url of links) {
    const low = url.toLowerCase();
    if (low.includes(domain) && !bad.some((b) => low.includes(b))) {
      return url.split('?')[0].replace(/\/$/, '');
    }
  }
  return null;
}

function firstEmail(html) {
  if (!html) return null;
  const seen = new Set();
  for (const m of html.matchAll(EMAIL_RE)) {
    const email = m[0];
    const low = email.toLowerCase();
    if (EMAIL_BLOCK.some((ext) => low.endsWith(ext))) continue;
    if (DOMAIN_BLOCK.some((b) => low.includes(b))) continue;
    if (seen.has(low)) continue;
    seen.add(low);
    return email;
  }
  return null;
}

// ── Lead principal ──────────────────────────────────────────────────────────
export async function enrichLead(input) {
  const { name, city, phone } = input ?? {};
  const start = performance.now();

  const out = {
    email: null, instagram: null, facebook: null, linkedin: null,
    whatsapp: phone || null, confidence: 0.0, partial: false,
    discoveredWebsite: null, linkBroken: null,
  };

  try {
    const budgetOk = () => performance.now() - start < TIMEOUT_LEAD - 1500;

    // ── 1ª SERP ───────────────────────────────────────────────────────
    const html = await serp(`"${name}" ${city}`);
    const links = decodeLinks(html);

    // Redes sociais (com bad-filters iguais ao Python)
    out.instagram = firstSocial(links, 'instagram.com', ['/p/', '/reel/', '/explore', '/accounts']);
    out.facebook = firstSocial(links, 'facebook.com', ['/sharer', '/tr?', '/events', '/groups']);
    out.linkedin = firstSocial(links, 'linkedin.com', ['/posts/', '/feed/']);

    // E-mail
    out.email = firstEmail(html);

    // Website oficial (1º que casar)
    for (const url of links) {
      if (isOfficialWebsite(url, name)) {
        out.discoveredWebsite = url.split('?')[0].replace(/\/$/, '');
        break;
      }
    }

    // ── 2ª SERP (só se faltou e-mail) ─────────────────────────────────
    if (!out.email && budgetOk()) {
      try {
        const html2 = await serp(`"${name}" ${city} email contato`);
        out.email = firstEmail(html2);
      } catch {
        // Timeout na 2ª não quebra o resultado parcial
      }
    }

    // ── Link quebrado ─────────────────────────────────────────────────
    if (budgetOk()) {
      const linktreeUrl = links.find((url) =>
        LINKTREE_DOMAINS.some((d) => url.toLowerCase().includes(d))
      );
      if (linktreeUrl) {
        try {
          const r = await fetch(linktreeUrl, {
            method: 'GET',
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(3000),
            redirect: 'follow',
          });
          out.linkBroken = r.status >= 400;
        } catch {
          // Erro de rede/timeout → desconhecido, nunca assume quebrado
          out.linkBroken = null;
        }
      }
    }

    const found = [out.email, out.instagram, out.facebook, out.linkedin].filter(Boolean).length;
    out.confidence = found ? Math.round(Math.min(1, 0.55 + 0.15 * found) * 100) / 100 : 0.0;
  } catch {
    out.partial = true;
  }

  return out;
}
