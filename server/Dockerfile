# API + worker de enriquecimento no mesmo container.
# O Node spawna o worker Python via child_process, então preciso dos dois runtimes.
FROM node:20-bookworm-slim

# Python + dependências do worker (httpx). slim não traz pip por padrão.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Camadas de cache: instala dependências antes de copiar o código (rebuilds rápidos).
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev

COPY workers/requirements.txt ./workers/
RUN pip3 install --no-cache-dir --break-system-packages -r workers/requirements.txt

# Código da app
COPY server ./server
COPY workers ./workers

WORKDIR /app/server

# enricher.js usa PYTHON_BIN; aqui é "python3" do Debian
ENV PYTHON_BIN=python3
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001
CMD ["node", "src/index.js"]
