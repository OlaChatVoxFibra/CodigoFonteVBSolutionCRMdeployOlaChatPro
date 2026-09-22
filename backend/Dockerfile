# Dockerfile do backend — funciona com DOIS contextos de build:
#  A) build context = ./backend  (pasta backend como root — Railway rootDirectory = backend)
#  B) build context = ./        (raiz do monorepo — Railway padrão, Dockerfile Path = /backend/Dockerfile)
#
# Estratégia de layout UNIFICADO no runtime (IMPORTANTE):
#  • O app sempre estará DISPONÍVEL EM DOIS LOCAIS ao mesmo tempo, via symlink:
#      /app            ← runtime principal (WORKDIR)
#      /app/backend    ← symlink APONTANDO para /app
#  Com isso, QUALQUER startCommand funcionará:
#      • "cd /app/backend && node scripts/start-production.js"  ← vem do railway.toml da raiz
#      • "cd /app && node scripts/start-production.js"          ← vem deste Dockerfile

FROM node:20-alpine AS builder

# Copia TUDO para /context (tanto raiz monorepo quanto só pasta backend chegam aqui).
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
RUN echo "[builder] Rodando tsc build em $(pwd)..." && npm run build

# ---- Stage 2: runtime
FROM node:20-alpine

WORKDIR /app

# Runtime stage: copia do builder (está sempre em /appsrc graças ao symlink acima).
COPY --from=builder /appsrc/package.json /appsrc/package-lock.json* /appsrc/.npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi

COPY --from=builder /appsrc/dist ./dist
COPY --from=builder /appsrc/public ./public
COPY --from=builder /appsrc/src/database/migrations ./src/database/migrations
COPY --from=builder /appsrc/scripts ./scripts
COPY --from=builder /appsrc/config ./config
COPY --from=builder /appsrc/.sequelizerc ./.sequelizerc

# =============================================================================
# LAYOUT SIMBIONTE (o pulo do gato):
#   Garante que TANTO /app quanto /app/backend apontem para MESMO lugar.
#   Com isso qualquer startCommand / CMD que use qualquer dos dois caminhos funciona.
# =============================================================================
RUN set -eu; \
  # Se /app/backend não existir, cria como symlink para /app.
  if [ ! -e /app/backend ]; then \
    ln -sfn /app /app/backend; \
  fi; \
  # Verifica que a estrutura está ok.
  echo "[runtime] Layout montado:"; \
  ls -la /app; \
  ls -la /app/backend/ || true; \
  echo "[runtime] dist/server.js existe em /app?  $(test -f /app/dist/server.js && echo SIM || echo NAO)"; \
  echo "[runtime] dist/server.js existe em /app/backend?  $(test -f /app/backend/dist/server.js && echo SIM || echo NAO)"; \
  echo "[runtime] scripts/start-production.js existe em /app?  $(test -f /app/scripts/start-production.js && echo SIM || echo NAO)"; \
  echo "[runtime] scripts/start-production.js existe em /app/backend?  $(test -f /app/backend/scripts/start-production.js && echo SIM || echo NAO)";

RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

# Dockerfile CMD (executado APENAS se startCommand no railway.toml NÃO for definido).
# Caso o railway.toml defina startCommand, o CMD é ignorado — mas o layout simbionte
# garante que qualquer um dos dois comandos inicie a API corretamente.
CMD ["./scripts/docker-entrypoint.sh"]
