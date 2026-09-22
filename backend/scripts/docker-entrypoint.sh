#!/bin/sh
# Entrypoint resiliente para os DOIS layouts simbiontes:
#   • Layout A (Dockerfile raiz):    WORKDIR=/app/backend, /app -> /app/backend
#   • Layout B (backend/Dockerfile): WORKDIR=/app,         /app/backend -> /app
#
# Garante que scripts/start-production.js será executado do diretório correto,
# independentemente de qual CMD ou startCommand invocou esse entrypoint.
set -eu

# 1) Escolhe o diretório base correto
if [ -f /app/backend/scripts/start-production.js ] && [ -f /app/backend/dist/server.js ]; then
  APP_DIR="/app/backend"
elif [ -f /app/scripts/start-production.js ] && [ -f /app/dist/server.js ]; then
  APP_DIR="/app"
else
  echo "[entrypoint] ERRO: não encontrei scripts/start-production.js + dist/server.js nem em /app nem em /app/backend"
  echo "[entrypoint] Listing /app:"
  ls -la /app 2>/dev/null || true
  echo "[entrypoint] Listing /app/backend:"
  ls -la /app/backend 2>/dev/null || true
  exit 1
fi

echo "[entrypoint] Diretório do app detectado: ${APP_DIR}"
cd "${APP_DIR}"

export LISTEN_HOST="${LISTEN_HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
echo "[entrypoint] NODE_ENV=${NODE_ENV:-} PORT=${PORT} LISTEN_HOST=${LISTEN_HOST} PWD=$(pwd)"

# start-production.js: roda db:migrate (com timeout) e depois executa dist/server.js
# Se start-production.js não existir (fallback último), cai direto em dist/server.js
if [ -f ./scripts/start-production.js ]; then
  exec node ./scripts/start-production.js
else
  echo "[entrypoint] start-production.js não encontrado — fallback p/ node dist/server.js"
  exec node ./dist/server.js
fi
