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
COPY --from=builder /app/scripts/prepare-and-migrate.js ./scripts/prepare-and-migrate.js
COPY --from=builder /app/config ./config
COPY --from=builder /app/.sequelizerc ./.sequelizerc

EXPOSE 8080

CMD ["sh", "-c", "node scripts/prepare-and-migrate.js && node dist/server.js"]
