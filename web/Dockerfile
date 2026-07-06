# Multi-stage: build com Node, depois serve só os estáticos via nginx.
# Imagem final ~30MB; sem Node em produção = menos superfície de ataque.

# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . ./
RUN npm run build

# ── Stage 2: serve com nginx ────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
