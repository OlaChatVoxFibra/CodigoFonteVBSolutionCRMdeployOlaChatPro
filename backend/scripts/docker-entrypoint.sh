#!/bin/sh
set -eu

if [ -f /app/backend/dist/server.js ]; then
  APP_DIR="/app/backend"
elif [ -f /app/dist/server.js ]; then
  APP_DIR="/app"
else
  echo "[entrypoint] ERRO: não encontrei dist/server.js"
  exit 1
fi

echo "[entrypoint] Diretório do app: ${APP_DIR}"
cd "${APP_DIR}"

export LISTEN_HOST="${LISTEN_HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
echo "[entrypoint] NODE_ENV=${NODE_ENV:-} PORT=${PORT} LISTEN_HOST=${LISTEN_HOST} PWD=$(pwd)"

# Migrações em background (sem bloquear boot)
node ./scripts/prepare-and-migrate.js 2>&1 || true

echo "[entrypoint] Executando servidor Express real (dist/server.js)..."
exec node ./dist/server.js
