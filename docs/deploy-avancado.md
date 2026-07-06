# Deploy avançado — rodar 24/7 em casa (Docker + PostgreSQL)

> **Para quem é este guia:** aluno que já usou a ferramenta localmente (`npm run dev`) e quer deixá-la **sempre ligada** num servidor caseiro (home server) para acessar de qualquer máquina, sem depender de terminal aberto. **Não é obrigatório para usar a ferramenta** — o modo `npm run dev` no seu próprio computador já basta para prospectar.

Este guia cobre a stack **Docker + PostgreSQL + VPN privada (Tailscale)** rodando num home server (ex.: ZimaOS). É a mesma stack usada pelo autor original; você pode adaptar para qualquer host com Docker (Raspberry Pi, mini PC, VPS, etc.).

---

## 🐳 Rodar 24/7 com Docker

Quando você quiser que o sistema fique **sempre ligado** (sem depender de abrir terminal e sem você ter que rodar `npm run dev`), suba os containers no seu home server. O `docker-compose.yml` na raiz monta tudo:

- **`api`** — Node + worker Python no mesmo container (porque o enrich.py é spawnado em processo filho)
- **`web`** — build estático servido por **nginx** (mais leve e seguro que rodar Vite em produção); o nginx faz proxy `/api/*` pro container da API, **com SSE preservado** (`proxy_buffering off`)

Postgres **não** entra no compose — ele já roda como container separado no servidor (veja abaixo). Os apps conversam com ele via `host.docker.internal:5432`.

### Setup (uma vez)

```bash
git clone <repo-do-curso>.git
cd Captacao
cp .env.example .env       # edite com a DATABASE_URL real
docker compose up -d --build
```

Pronto. Acesse pelo IP do servidor na sua VPN privada (ex.: `http://100.74.62.35`). O nginx escuta na **80** — não precisa de porta no URL.

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

### Setup escolhido: PostgreSQL no Docker + home server + VPN privada

A combinação é gratuita, autônoma (zero dependência de nuvem) e acessível de qualquer máquina sua via VPN privada:

```
[Seu PC] ──── VPN privada (Tailscale) ──── [Home server] ──── [Container PostgreSQL]
```

- **Home server (ZimaOS ou similar)** = sistema operacional do servidor caseiro (gerencia containers Docker pela UI).
- **PostgreSQL** = banco de dados (roda como container no servidor).
- **Tailscale** = rede privada que dá ao seu PC um IP `100.x.y.z` pra falar com o servidor de qualquer lugar.

> 💡 **Você não precisa usar Tailscale nem ZimaOS.** Qualquer VPN privada (WireGuard, Tailnet, ZeroTier) e qualquer host com Docker servem. Tailscale/ZimaOS são só a stack de referência.

### Passo a passo (uma vez)

**1. Suba o Postgres no servidor** (App Store → Docker → `postgres:15`). Configure as variáveis do container:

| Variável | Sugestão |
|---|---|
| `POSTGRES_USER` | um nome dedicado, ex.: `captacao` |
| `POSTGRES_PASSWORD` | **senha forte gerada por gerenciador** (Bitwarden/1Password, 20+ chars aleatórios) |
| `POSTGRES_DB` | `captacao` (banco dedicado pro projeto) |
| Porta | `5432:5432` (mapeada pro host) |

> ⚠️ **Nunca commite a senha em lugar nenhum.** Ela mora só no container e no seu `.env` local (que está no `.gitignore`).

**2. Instale o Tailscale** no servidor e em cada PC que vai acessar. Anote o IP do servidor na rede privada (algo como `100.74.x.x`) em [tailscale.com/admin/machines](https://login.tailscale.com/admin/machines).

**3. (Opcional) Crie um banco dedicado** se ainda não fez via `POSTGRES_DB`. Conecte no Postgres como superuser e rode:
```sql
CREATE DATABASE captacao OWNER captacao;
```

**4. Configure o `.env`** no seu PC, dentro de `server/`:
```bash
cp .env.example .env
```

Edite o `.env` com a sua connection string:
```
DATABASE_URL=postgresql://captacao:SUA_SENHA@100.x.y.z:5432/captacao
```

**5. Reinicie a API.** No log você deve ver:
```
[db] schema pronto — persistência ATIVADA.
```

As tabelas são criadas automaticamente no primeiro boot — não precisa rodar migration nenhuma.

### Como testar a conexão (antes de subir a API)

```bash
psql "postgresql://captacao:SUA_SENHA@100.x.y.z:5432/captacao" -c "\l"
```

| Erro | Causa provável |
|---|---|
| `connection refused` | VPN offline, IP errado, container fora do ar, ou porta não exposta |
| `password authentication failed` | Senha errada ou usuário não criado |
| Lista de databases aparece | ✅ Tudo OK, pode subir a API |

### Compartilhar com o sócio

No admin da VPN (Tailscale) → 3 pontinhos da máquina do servidor → **Share...** → coloca o email dele. Ele cria conta grátis do Tailscale (até 100 dispositivos), instala o app, e acessa a **mesma URL**. Ele só enxerga essa máquina compartilhada — não tem acesso ao resto da sua rede privada.

### Boas práticas

- 🔒 **Senha forte e exclusiva** — use gerador, não reaproveite de outros serviços
- 🚫 **Não exponha a porta 5432 na internet** — a VPN privada resolve sem precisar abrir nada no roteador
- 💾 **Backup periódico** do volume Docker (ou `pg_dump` semanal pra um arquivo)
- 🏷️ **Banco dedicado por projeto** — evita misturar `captacao` com outros projetos seus no mesmo Postgres

---

## ⚙️ Variáveis de ambiente (todas opcionais)

| Variável | Padrão | Função |
|---|---|---|
| `DATA_PROVIDER` | `osm` | `mock` usa dados fictícios offline (demo sem rede) |
| `ENRICH_PROVIDER` | `python` | `mock` gera contatos fictícios sem chamar o DuckDuckGo |
| `ENRICH_CONCURRENCY` | `2` | leads enriquecidos em paralelo (educado com o DDG) |
| `ENRICH_BACKGROUND` | `true` | `false` = só enriquece quando o usuário clica no lead |
| `PYTHON_BIN` | `py` / `python3` | binário do Python para os workers |
| `DATABASE_URL` | _(vazio)_ | Postgres p/ persistir buscas, leads, enriquecimento e estágios. **Vazio = só memória.** Ex.: `postgresql://user:senha@host:5432/captacao` (veja `server/.env.example`) |

---

## 🔌 Principais endpoints (referência)

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

<div align="center">
<sub>Guia de deploy avançado — para aluno que quer deixar a ferramenta 24/7 em casa.</sub>
</div>
