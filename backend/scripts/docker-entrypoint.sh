#!/bin/sh
# Entrypoint: roda migrate com timeout (start-production.js) depois sobe a API.
set -eu
export LISTEN_HOST="${LISTEN_HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
echo "[entrypoint] NODE_ENV=${NODE_ENV:-} PORT=${PORT} LISTEN_HOST=${LISTEN_HOST}"
# start-production.js: roda db:migrate (com timeout) e depois executa dist/server.js
exec node scripts/start-production.js
