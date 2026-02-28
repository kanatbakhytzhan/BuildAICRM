FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate && npx nest build

FROM node:22-bookworm-slim

WORKDIR /app

# Prisma schema engine requires OpenSSL at runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "if [ -f /app/uploads/.schema-done ]; then exec node dist/main.js; fi; for i in 1 2 3 4 5; do npx prisma db push && touch /app/uploads/.schema-done && exec node dist/main.js; sleep 5; done; echo 'db push failed'; exit 1"]
