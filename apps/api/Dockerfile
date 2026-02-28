FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

COPY . .
RUN npx prisma generate && npx nest build

FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
