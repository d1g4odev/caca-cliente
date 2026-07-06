<div align="center">

# 🎯 Captação

### Prospecção B2B inteligente — encontre negócios **sem site**, enriqueça os contatos e gerencie tudo num funil visual.

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Leaflet](https://img.shields.io/badge/Leaflet-OpenStreetMap-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Custo](https://img.shields.io/badge/custo-R$%200-2ea44f)](#-100-gratuito)
[![Status](https://img.shields.io/badge/status-MVP-1f6feb)](#-roadmap)

</div>

---

Um SaaS estilo **busca imobiliária**: de um lado um mapa interativo, do outro a lista de leads. Você define **nicho + cidade + raio**, e o sistema encontra os estabelecimentos comerciais da região que **não têm website cadastrado** — exatamente o público que mais precisa de presença digital. Para cada lead, um worker busca **e-mail, Instagram, Facebook e LinkedIn** na web, em tempo real.

> 💸 **100% gratuito, sem chaves de API e sem cartão de crédito.** Os dados vêm do **OpenStreetMap** e o enriquecimento do **DuckDuckGo**. 

---

## ✨ Destaques

- 🗺️ **Mapa interativo** com pinos coloridos por status (Leaflet + tiles OpenStreetMap)
- 🔍 **Filtro "sem website" nativo** — descarta automaticamente quem já tem site
- 🧩 **Enriquecimento sob demanda** — e-mail, Instagram, Facebook e LinkedIn via busca cruzada
- ⚡ **Tempo real (SSE)** — os contatos pingam na tela conforme são encontrados, sem travar
- 🗂️ **Funil Kanban** — arraste leads entre `Novo · Qualificado · Contatado · Ganho · Descartado`
- 🏙️ **Autocomplete de cidade** com geocoding gratuito (Nominatim)
- 📤 **Exportação CSV / Excel** + **webhook** para integrar com seu CRM
- 🗄️ **Persistência opcional** em PostgreSQL (roda em memória por padrão; ativa com `DATABASE_URL`)

---

## 🧱 Stack

| Camada | Tecnologia |
|---|---|
| **Front-end** | React + Vite + react-leaflet |
| **Back-end / API** | Node.js + Express (SSE) |
| **Worker de extração** | Python (httpx, asyncio) |
| **Dados de negócios** | OpenStreetMap — Overpass API |
| **Geocoding** | OpenStreetMap — Nominatim |
| **Enriquecimento** | DuckDuckGo (busca cruzada) |
| **Exportação** | exceljs (CSV / XLSX) |

---

## 🏗️ Arquitetura

```mermaid
flowchart LR
    subgraph FE["🖥️ Front-end · React"]
        UI["Dashboard<br/>Mapa · Lista · Kanban"]
    end
    subgraph BE["⚙️ Back-end · Node.js"]
        API["API REST + SSE"]
        Q["Fila + enriquecimento<br/>(concorrência limitada)"]
    end
    subgraph PY["🐍 Worker · Python"]
        ENR["enrich.py"]
    end
    OSM[("🗺️ OpenStreetMap<br/>Overpass + Nominatim")]
    DDG[("🔎 DuckDuckGo")]
    OUT["📤 CSV · XLSX · Webhook CRM"]

    UI -->|"POST /api/search"| API
    API -->|"busca + filtro sem-site"| OSM
    API --> Q --> ENR
    ENR -->|"e-mail · redes sociais"| DDG
    ENR -.->|"SSE: evento enrichment"| UI
    API --> OUT
```

**Fluxo em duas fases:** a busca (`POST /api/search`) é **síncrona e rápida** — devolve os negócios sem site e os pinos aparecem na hora. O enriquecimento roda **em segundo plano** e cada lead pronto é empurrado para a tela via **Server-Sent Events**, sem recarregar nada.

---

## 🚀 Rodando localmente

**Pré-requisitos:** Node.js 18+, Python 3.10+

### Atalho — um comando (recomendado)

```bash
npm run setup   # 1ª vez: instala raiz, server, web e o worker Python
npm run dev     # sobe API (3001) + front (5173) juntos, com logs [api]/[web]
```

> 💡 **Sem rede / demo:** `npm run dev:mock` desliga Overpass/DuckDuckGo e usa negócios e contatos fictícios — ótimo pra testar o fluxo na hora.

### Manual (3 terminais)

```bash
# 1) Worker Python (uma vez)
pip install -r workers/requirements.txt

# 2) API  →  http://localhost:3001
cd server && npm install && npm run dev

# 3) Front  →  http://localhost:5173
cd web && npm install && npm run dev
```

Abra **http://localhost:5173**, digite um nicho (ex: _"salão de estética"_), escolha a cidade/raio e clique em **Buscar leads sem site**. Alterne entre **🗺️ Mapa** e **🗂️ Kanban** na barra lateral.

---

## ⚙️ Configuração (variáveis de ambiente, todas opcionais)

| Variável | Padrão | Função |
|---|---|---|
| `DATA_PROVIDER` | `osm` | `mock` usa dados fictícios offline (demo sem rede) |
| `ENRICH_PROVIDER` | `python` | `mock` gera contatos fictícios sem chamar o DuckDuckGo |
| `ENRICH_CONCURRENCY` | `2` | leads enriquecidos em paralelo (educado com o DDG) |
| `ENRICH_BACKGROUND` | `true` | `false` = só enriquece quando o usuário clica no lead |
| `PYTHON_BIN` | `py` / `python3` | binário do Python para os workers |
| `DATABASE_URL` | _(vazio)_ | Postgres p/ persistir buscas, leads, enriquecimento e estágios. **Vazio = só memória.** Ex.: `postgresql://user:senha@host:5432/captacao` (veja `server/.env.example`) |

---

## 🐳 Rodar 24/7 em casa (Docker no ZimaOS)

Quando você quiser que o sistema fique **sempre ligado** (sem depender de abrir terminal e sem você ter que rodar `npm run dev`), suba os containers no seu home server. O `docker-compose.yml` na raiz monta tudo:

- **`api`** — Node + worker Python no mesmo container (porque o enrich.py é spawnado em processo filho)
- **`web`** — build estático servido por **nginx** (mais leve e seguro que rodar Vite em produção); o nginx faz proxy `/api/*` pro container da API, **com SSE preservado** (`proxy_buffering off`)

Postgres **não** entra no compose — ele já roda como container separado no Zima. Os apps conversam com ele via `host.docker.internal:5432`.

### Setup (uma vez, no ZimaOS)

```bash
git clone https://github.com/LorenzoCorrea/Captacao.git
cd Captacao
cp .env.example .env       # edite com a DATABASE_URL real
docker compose up -d --build
```

Pronto. Acesse pelo IP do Zima na Tailscale (ex.: `http://100.74.62.35`). O nginx escuta na **80** — não precisa de porta no URL.

### Compartilhar com o sócio

No admin do Tailscale → 3 pontinhos da máquina `zimaos` → **Share...** → coloca o email dele. Ele cria conta grátis do Tailscale (até 100 dispositivos), instala o app, e acessa a **mesma URL**. Ele só enxerga essa máquina compartilhada — não tem acesso ao resto do seu tailnet.

### Atualizando depois de mudar o código

```bash
cd Captacao
git pull
docker compose up -d --build
```

O Docker rebuilda só o que mudou (cache de camadas) e reinicia em segundos.

---

## 🗄️ Persistência com PostgreSQL (opcional, recomendada)

Sem `DATABASE_URL`, o app roda em memória — buscas duram 30 min e somem no F5/reinício. Com Postgres configurado, **tudo fica salvo**: buscas, leads, enriquecimento, estágios do Kanban, notas, follow-ups, tags e valor estimado.

### Setup escolhido: PostgreSQL no Docker + ZimaOS + Tailscale

A combinação é gratuita, autônoma (zero dependência de nuvem) e acessível de qualquer máquina sua via VPN privada:

```
[Seu PC] ──── Tailscale (VPN) ──── [ZimaOS] ──── [Container PostgreSQL]
```

- **ZimaOS** = sistema operacional do home server (gerencia containers Docker pela UI).
- **PostgreSQL** = banco de dados (roda como container no ZimaOS).
- **Tailscale** = rede privada que dá ao seu PC um IP `100.x.y.z` pra falar com o Zima de qualquer lugar.

### Passo a passo (uma vez)

**1. Suba o Postgres no ZimaOS** (App Store → Docker → `postgres:15`). Configure as variáveis do container:

| Variável | Sugestão |
|---|---|
| `POSTGRES_USER` | um nome dedicado, ex.: `lorenzo` |
| `POSTGRES_PASSWORD` | **senha forte gerada por gerenciador** (Bitwarden/1Password, 20+ chars aleatórios) |
| `POSTGRES_DB` | `captacao` (banco dedicado pro projeto) |
| Porta | `5432:5432` (mapeada pro host) |

> ⚠️ **Nunca commite a senha em lugar nenhum.** Ela mora só no container e no seu `.env` local (que está no `.gitignore`).

**2. Instale o Tailscale** no ZimaOS e em cada PC que vai acessar. Anote o IP do Zima na rede privada (algo como `100.74.x.x`) em [tailscale.com/admin/machines](https://login.tailscale.com/admin/machines).

**3. (Opcional) Crie um banco dedicado** se ainda não fez via `POSTGRES_DB`. Conecte no Postgres como superuser e rode:
```sql
CREATE DATABASE captacao OWNER lorenzo;
```

**4. Configure o `.env`** no seu PC, dentro de `server/`:
```bash
cp .env.example .env   # Windows: copy .env.example .env
```

Edite o `.env` com a sua connection string:
```
DATABASE_URL=postgresql://lorenzo:SUA_SENHA@100.x.y.z:5432/captacao
```

**5. Reinicie a API.** No log você deve ver:
```
[db] schema pronto — persistência ATIVADA.
```

As tabelas são criadas automaticamente no primeiro boot — não precisa rodar migration nenhuma.

### Como testar a conexão (antes de subir a API)

```bash
psql "postgresql://lorenzo:SUA_SENHA@100.x.y.z:5432/captacao" -c "\l"
```

| Erro | Causa provável |
|---|---|
| `connection refused` | Tailscale offline, IP errado, container fora do ar, ou porta não exposta |
| `password authentication failed` | Senha errada ou usuário não criado |
| Lista de databases aparece | ✅ Tudo OK, pode subir a API |

### Boas práticas

- 🔒 **Senha forte e exclusiva** — use gerador, não reaproveite de outros serviços
- 🚫 **Não exponha a porta 5432 na internet** — Tailscale resolve sem precisar abrir nada no roteador
- 💾 **Backup periódico** do volume Docker (ou `pg_dump` semanal pra um arquivo)
- 🏷️ **Banco dedicado por projeto** — evita misturar `captacao` com outros projetos seus no mesmo Postgres

---

## 🔌 Principais endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/search` | Busca + filtro "sem site"; abre uma sessão |
| `GET` | `/api/search/:id/stream` | Stream SSE do enriquecimento |
| `GET` | `/api/geocode?q=` | Autocomplete de cidade (Nominatim) |
| `POST` | `/api/search/:id/leads/:leadId/prioritize` | Enriquece um lead sob demanda |
| `PATCH` | `/api/search/:id/leads/:leadId` | Move o lead de estágio no Kanban |
| `GET` | `/api/search/:id/export?format=csv\|xlsx` | Baixa a planilha de leads |
| `POST` | `/api/search/:id/webhook` | Envia os leads (JSON) para um CRM |

---

## ⚠️ Limites dos serviços gratuitos

- **Overpass** limita ~2 consultas simultâneas por IP e enfileira a resposta sob carga (alguns segundos). Há **cache de 10 min** por busca. Se vier "Overpass ocupado", espere um pouco ou reduza o raio.
- **DuckDuckGo** pode limitar buscas em rajada — por isso a concorrência é baixa e há _jitter_ entre as chamadas. Em escala, troque por **Brave Search API** (free tier) ou Serper.dev.
- **Nominatim** permite no máx. 1 req/seg — o back-end serializa as chamadas e há debounce no front.
- **Cobertura do OSM** varia por região/nicho e **não traz avaliações**. Nichos bem mapeados (restaurantes, beleza, clínicas, dentistas) rendem mais resultados.

---

## 🗺️ Roadmap

- [x] Busca de negócios sem site (Overpass) + filtro
- [x] Enriquecimento de contatos (Python + DuckDuckGo)
- [x] Tempo real via SSE + mapa Leaflet
- [x] Autocomplete de cidade (Nominatim)
- [x] Exportação CSV / Excel + webhook
- [x] Funil Kanban (drag-and-drop)
- [x] **Persistência em PostgreSQL** (buscas, leads, enriquecimento e estágios) — opcional via `DATABASE_URL`
- [ ] Autenticação e multi-tenant
- [ ] Fila distribuída (BullMQ/Redis) para múltiplos workers
- [ ] Proxies rotativos para enriquecimento em escala

---

## 📌 Observações

- Projeto em estágio **MVP**. Sem `DATABASE_URL`, as sessões ficam em memória e somem ao reiniciar; com Postgres configurado, buscas/leads/estágios são persistidos (a fila e o stream SSE seguem em memória, por serem estado de runtime).
- Tiles do OSM são gratuitos mas têm política de uso justo; em produção use um provedor de tiles (MapTiler) ou self-host.
- Coleta de contatos para prospecção: registre a origem do dado (campo `source`), ofereça _opt-out_ e trate apenas o necessário (**LGPD**).

---

<div align="center">
<sub>Feito com ☕ e dados abertos do OpenStreetMap · contribuições ODbL</sub>
</div>
