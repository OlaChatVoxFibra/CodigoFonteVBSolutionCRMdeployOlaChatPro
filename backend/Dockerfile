# Dockerfile do backend — funciona com DOIS contextos de build:
#  A) build context = ./backend  (pasta backend como root — UI do Railway pode ter esse rootDirectory)
#  B) build context = ./        (raiz do monorepo — UI do Railway usa esse por padrão)
#
# Não importa qual contexto: o resultado final sempre terá o backend em WORKDIR /app e rodando
# com node scripts/docker-entrypoint.sh.

FROM node:20-alpine AS builder

# Determina onde está o código fonte conforme contexto de build.
# Se existir /context/backend/package.json → contexto é RAIZ; senão é a própria pasta.
WORKDIR /context
COPY . /context/

RUN set -eu; \
  if [ -f /context/backend/package.json ]; then \
    echo "[builder] Contexto = RAIZ do monorepo — usando /context/backend"; \
    ln -sfn /context/backend /appsrc; \
  elif [ -f /context/package.json ]; then \
    echo "[builder] Contexto = pasta backend — usando /context"; \
    ln -sfn /context /appsrc; \
  else \
    echo "[builder] ERRO: não encontrei backend/package.json nem package.json"; \
    ls -la /context; \
    exit 1; \
  fi

WORKDIR /appsrc
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
RUN mkdir -p public
RUN npm run build

# ---- Stage 2: runtime
FROM node:20-alpine

WORKDIR /app

# Reaproveita o build do stage anterior (sempre estará em /appsrc graças ao symlink)
COPY --from=builder /appsrc/package.json /appsrc/package-lock.json* /appsrc/.npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

COPY --from=builder /appsrc/dist ./dist
COPY --from=builder /appsrc/public ./public
COPY --from=builder /appsrc/src/database/migrations ./src/database/migrations
COPY --from=builder /appsrc/scripts ./scripts
COPY --from=builder /appsrc/config ./config
COPY --from=builder /appsrc/.sequelizerc ./.sequelizerc

RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["./scripts/docker-entrypoint.sh"]
