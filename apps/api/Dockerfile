FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --include=dev

COPY . .
RUN npx nest build

EXPOSE 4000
CMD ["node", "dist/main.js"]
