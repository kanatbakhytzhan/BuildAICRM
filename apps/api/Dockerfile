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
COPY --from=builder /app/scripts/fly-start.sh ./scripts/fly-start.sh
RUN chmod +x ./scripts/fly-start.sh

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "/app/scripts/fly-start.sh"]
