FROM node:20-alpine AS base
WORKDIR /app

# Prisma на Alpine нужен openssl
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

COPY docker-entrypoint.sh /docker-entrypoint.sh
# Убираем CRLF (Windows) чтобы скрипт работал в Linux
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
