# Dockerfile BACKUP para builds com contexto = ./backend (pasta backend como root).
# Se Railway estiver usando context=raiz, use o Dockerfile na raiz do repositório (./Dockerfile).
# Este existe apenas como fallback.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
RUN mkdir -p public
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --no-audit --no-fund; else npm install --omit=dev --no-audit --no-fund; fi
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/database/migrations ./src/database/migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/config ./config
COPY --from=builder /app/.sequelizerc ./.sequelizerc
RUN chmod +x ./scripts/docker-entrypoint.sh
ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080
CMD ["./scripts/docker-entrypoint.sh"]
