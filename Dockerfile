# =========================
# Backend OlaChat Pro CRM
# Dockerfile NA RAIZ do repositório.
# Builder context = RAIZ DO REPO; acesso a ./backend e ./frontend é via subpasta.
#
# Layout SIMBIONTE no runtime (a mesma estratégia do backend/Dockerfile):
#   • /app/backend  ← diretório REAL (WORKDIR aqui)
#   • /app          ← symlink APONTANDO para /app/backend
# Com isso qualquer startCommand (seja "cd /app && node ..." ou "cd /app/backend && node ...")
# funciona independentemente de qual Dockerfile foi usado no build.
# =========================

# -------- Stage 1: builder (instala deps dev + compila TypeScript) --------
FROM node:20-alpine AS builder

WORKDIR /app

# 1) Copiar apenas arquivos de package + npmrc para cachear camadas
COPY backend/package.json backend/package-lock.json* backend/.npmrc* ./backend/
COPY backend/ ./backend/

# 2) npm ci e build (tsc) DENTRO da pasta /app/backend
RUN cd /app/backend && \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi && \
    mkdir -p public && \
    echo "[builder-raiz] Rodando tsc build em $(pwd)..." && \
    npm run build

# -------- Stage 2: runtime (só deps de produção + dist/) --------
FROM node:20-alpine

WORKDIR /app/backend

# Dependências produção
COPY backend/package.json backend/package-lock.json* backend/.npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

# Artefatos do builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/public ./public
COPY --from=builder /app/backend/src/database/migrations ./src/database/migrations
COPY --from=builder /app/backend/scripts ./scripts
COPY --from=builder /app/backend/config ./config
COPY --from=builder /app/backend/.sequelizerc ./.sequelizerc

# =============================================================================
# LAYOUT SIMBIONTE: /app ↔ /app/backend sempre existem e apontam pro mesmo lugar.
# =============================================================================
RUN set -eu; \
  # Como WORKDIR = /app/backend, criamos um symlink /app -> /app/backend caso /app não seja o mesmo dir.
  if [ ! -e /app/dist ] || [ ! -f /app/package.json ]; then \
    # /app não tem arquivos do app → transforma em symlink -> /app/backend
    rm -rf /app 2>/dev/null || true; \
    ln -sfn /app/backend /app; \
  fi; \
  echo "[runtime] Layout simbionte montado:"; \
  ls -la /app; \
  ls -la /app/backend 2>/dev/null || true; \
  echo "[runtime] dist/server.js existe em /app?  $(test -f /app/dist/server.js && echo SIM || echo NAO)"; \
  echo "[runtime] dist/server.js existe em /app/backend?  $(test -f /app/backend/dist/server.js && echo SIM || echo NAO)"; \
  echo "[runtime] scripts/start-production.js em /app?  $(test -f /app/scripts/start-production.js && echo SIM || echo NAO)"; \
  echo "[runtime] scripts/start-production.js em /app/backend?  $(test -f /app/backend/scripts/start-production.js && echo SIM || echo NAO)";

# Permissão de execução do entrypoint
RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# Executa migrations (com timeout) + sobe a API
# (startCommand no railway.toml se existir SOBRESCREVE este CMD, mas o layout simbionte garante ambos)
CMD ["./scripts/docker-entrypoint.sh"]
