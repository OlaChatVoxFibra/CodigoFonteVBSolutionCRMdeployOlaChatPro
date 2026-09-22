# =========================
# Backend OlaChat Pro CRM
# Dockerfile NA RAIZ do repositório.
# Builder context = RAIZ DO REPO; acesso a ./backend e ./frontend é via subpasta.
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

# Permissão de execução do entrypoint
RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# Executa migrations (com timeout) + sobe a API
CMD ["./scripts/docker-entrypoint.sh"]
