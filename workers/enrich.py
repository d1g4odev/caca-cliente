"""
Worker de enriquecimento — 100% gratuito, sem chaves de API e sem cobrança.

Entrada : 1 argumento argv com JSON do lead -> {"name","city","phone","place_id"}
Saída   : 1 linha JSON no stdout -> {email,instagram,facebook,linkedin,whatsapp,confidence,partial}
          (sempre imprime JSON válido e sai com código 0, mesmo em erro/bloqueio)

Estratégia de performance (o usuário não espera demais):
  1. UMA consulta SERP por lead no caminho quente: pega redes sociais E e-mails do
     mesmo HTML (menos requests = mais rápido e menor risco de bloqueio).
  2. 2ª consulta só dispara se o e-mail não apareceu na primeira.
  3. Orçamento de tempo rígido (TIMEOUT_LEAD): estourou, devolve parcial — nunca trava.

SERP: DuckDuckGo HTML (gratuito, sem JS, sem cadastro). Em escala troque por
Brave Search API (free tier) ou Serper.dev. A Bing Web Search API foi aposentada
pela Microsoft em ago/2025.
"""

import asyncio
import json
import re
import sys
from html import unescape

import httpx

UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
}
DDG = "https://html.duckduckgo.com/html/"
TIMEOUT_LEAD = 9.0  # orçamento total por lead, em segundos

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
# Resultados do DDG HTML usam <a class="result__a" href="https://destino-real">.
# (Em 2024 deixaram de usar o redirect /l/?uddg=, então lemos a href direta.)
HREF_RE = re.compile(r'href="(https?://[^"]+)"', re.I)
EMAIL_BLOCK = (".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif")
DOMAIN_BLOCK = ("duckduckgo.com", "example.com", "w3.org", "sentry", "wixpress.com", "@2x")

# Domínios que NÃO contam como "site próprio" — o OSM nos disse que o lead não
# tem site, mas a tag pode estar desatualizada. Aqui filtramos para evitar
# falsos negativos: redes sociais, agregadores, marketplaces, mapas, etc.
NON_WEBSITE_HOSTS = (
    # Redes sociais
    "instagram.com", "facebook.com", "linkedin.com", "twitter.com", "x.com",
    "tiktok.com", "youtube.com", "youtu.be", "pinterest.com", "whatsapp.com",
    "wa.me", "t.me", "threads.net",
    # Mapas e listagens de negócios
    "google.com", "google.com.br", "goo.gl", "maps.app.goo.gl", "waze.com",
    "foursquare.com", "yelp.com",
    # Agregadores BR (advocacia, saúde, comércio, etc.)
    "jusbrasil.com.br", "oab.org.br", "advogados.com.br",
    "doctoralia.com.br", "consultaremedios.com.br", "boaconsulta.com",
    "guiamais.com.br", "telelistas.net", "apontador.com.br", "solutudo.com.br",
    "olx.com.br", "mercadolivre.com.br", "ifood.com.br", "rappi.com.br",
    # Diretórios e plataformas
    "wikipedia.org", "yellowpages.com", "tripadvisor.com", "booking.com",
    "reclameaqui.com.br", "econodata.com.br", "cnpj.biz",
    # Domínios genéricos que não servem
    "wixsite.com", "wordpress.com", "blogspot.com",
)


def _is_official_website(url: str, lead_name: str) -> bool:
    """Decide se um link na SERP parece o site OFICIAL do negócio.

    Heurística (todos precisam bater):
      1. Não é rede social/agregador/maps (NON_WEBSITE_HOSTS).
      2. É um domínio raiz/quase-raiz (path curto), não uma página interna
         num site de terceiros.
      3. O domínio carrega pelo menos um pedaço do nome do negócio
         (cruza com slug do nome, ignorando palavras genéricas).
    """
    low = url.lower()
    if any(h in low for h in NON_WEBSITE_HOSTS):
        return False
    # Extrai o host (sem protocolo nem path)
    host = low.split("//", 1)[-1].split("/", 1)[0].split("?", 1)[0]
    if host.startswith("www."):
        host = host[4:]  # ignora prefixo www. p/ pegar o domínio real
    if not host or "." not in host:
        return False
    # Slug do nome: só letras minúsculas, ignora artigos e palavras genéricas
    GENERIC = {"de", "do", "da", "dos", "das", "e", "&", "associados", "advogados",
               "advocacia", "studio", "salao", "clinica", "consultorio",
               "instituto", "centro", "espaco", "ateliê", "atelie", "casa", "vila", "ltda"}
    base = re.sub(r"[^a-z0-9 ]", "", lead_name.lower())
    tokens = [t for t in base.split() if t and t not in GENERIC and len(t) >= 3]
    if not tokens:
        return False
    host_clean = re.sub(r"[^a-z0-9]", "", host.split(".", 1)[0])
    return any(t in host_clean for t in tokens)


def _decode_links(html: str) -> list[str]:
    links = []
    for m in HREF_RE.finditer(html):
        url = unescape(m.group(1))  # &amp; -> &
        if "duckduckgo.com" not in url.lower():
            links.append(url)
    return links


def _first_social(links: list[str], domain: str, bad: tuple[str, ...]) -> str | None:
    for url in links:
        low = url.lower()
        if domain in low and not any(b in low for b in bad):
            return url.split("?")[0].rstrip("/")
    return None


def _first_email(html: str) -> str | None:
    for e in EMAIL_RE.findall(html):
        low = e.lower()
        if not low.endswith(EMAIL_BLOCK) and not any(b in low for b in DOMAIN_BLOCK):
            return e
    return None


async def _serp(client: httpx.AsyncClient, query: str) -> str:
    r = await client.post(DDG, data={"q": query}, headers=UA)
    return r.text


async def _enrich(lead: dict) -> dict:
    name, city = lead.get("name", ""), lead.get("city", "")
    out = {
        "email": None, "instagram": None, "facebook": None, "linkedin": None,
        "whatsapp": lead.get("phone") or None, "confidence": 0.0, "partial": False,
        "discoveredWebsite": None,  # site oficial achado na SERP (rebaixa o lead)
    }
    async with httpx.AsyncClient(timeout=6, follow_redirects=True) as client:
        # Caminho quente: 1 consulta, extrai tudo
        html = await _serp(client, f'"{name}" {city}')
        links = _decode_links(html)
        out["instagram"] = _first_social(links, "instagram.com", ("/p/", "/reel/", "/explore", "/accounts"))
        out["facebook"] = _first_social(links, "facebook.com", ("/sharer", "/tr?", "/events", "/groups"))
        out["linkedin"] = _first_social(links, "linkedin.com", ("/posts/", "/feed/"))
        out["email"] = _first_email(html)
        # Pega o 1º link que pareça o site OFICIAL do negócio (corrige o falso
        # positivo do OSM, em que a tag `website` não foi preenchida).
        for url in links:
            if _is_official_website(url, name):
                out["discoveredWebsite"] = url.split("?")[0].rstrip("/")
                break

        # 2ª consulta só se faltou e-mail
        if not out["email"]:
            html2 = await _serp(client, f'"{name}" {city} email contato')
            out["email"] = _first_email(html2)

    found = sum(1 for k in ("email", "instagram", "facebook", "linkedin") if out[k])
    out["confidence"] = round(min(1.0, 0.55 + 0.15 * found), 2) if found else 0.0
    return out


def enrich_sync(lead: dict) -> dict:
    async def runner():
        try:
            return await asyncio.wait_for(_enrich(lead), timeout=TIMEOUT_LEAD)
        except (asyncio.TimeoutError, httpx.HTTPError):
            return {
                "email": None, "instagram": None, "facebook": None, "linkedin": None,
                "whatsapp": lead.get("phone") or None, "confidence": 0.0, "partial": True,
                "discoveredWebsite": None,
            }

    return asyncio.run(runner())


if __name__ == "__main__":
    try:
        lead = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {"name": "Studio Aurora", "city": "São Paulo"}
    except (json.JSONDecodeError, IndexError):
        lead = {"name": sys.argv[1] if len(sys.argv) > 1 else "Studio Aurora", "city": "São Paulo"}

    try:
        result = enrich_sync(lead)
    except Exception:  # nunca derruba o processo — o Node depende do JSON
        result = {"email": None, "instagram": None, "facebook": None,
                  "linkedin": None, "whatsapp": lead.get("phone"), "confidence": 0.0, "partial": True,
                  "discoveredWebsite": None}

    # ensure_ascii evita qualquer problema de encoding no stdout do Windows
    sys.stdout.write(json.dumps(result, ensure_ascii=True))
