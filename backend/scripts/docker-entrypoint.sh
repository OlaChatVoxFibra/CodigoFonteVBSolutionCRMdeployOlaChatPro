#!/bin/sh
# Entrypoint: garante PORT + bind e sobe a API sem migrate bloqueando.
set -eu
export LISTEN_HOST="${LISTEN_HOST:-0.0.0.0}"
export PORT="${PORT:-8080}"
echo "[entrypoint] NODE_ENV=${NODE_ENV:-} PORT=${PORT} LISTEN_HOST=${LISTEN_HOST}"
exec node dist/server.js
