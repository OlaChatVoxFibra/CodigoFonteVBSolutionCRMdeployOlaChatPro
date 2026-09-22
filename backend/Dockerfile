# Build sem usar secrets no build (FACEBOOK_APP_SECRET etc. só em runtime no Railway)
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* .npmrc ./
RUN npm ci

RUN mkdir -p public
COPY . .
RUN npm run build

# Imagem final: dist + public (logo, fotos de perfil que estiverem no repo)
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* .npmrc ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/database/migrations ./src/database/migrations
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/config ./config
COPY --from=builder /app/.sequelizerc ./.sequelizerc

ENV NODE_ENV=production
ENV LISTEN_HOST=0.0.0.0

EXPOSE 8080

# Sobe a API na hora (sem migrate bloqueando). Schema já está no Postgres.
CMD ["node", "dist/server.js"]
