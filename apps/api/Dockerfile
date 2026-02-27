FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

COPY . .
# Только generate + сборка, без подключения к БД (избегаем P1001 на Render).
RUN npx prisma generate && npx nest build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4000
# Миграции при старте (БД доступна только в runtime, не при build — избегаем P1001).
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
