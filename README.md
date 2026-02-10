# BuildCRM + AI Manager

CRM с воронкой продаж и AI-менеджером для WhatsApp.

## Структура

- `apps/api` — backend (NestJS, Prisma, PostgreSQL)
- `apps/crm` — фронт CRM (Next.js, PWA)
- `apps/admin` — Global Admin (Next.js, порт 3001)

## Требования

- Node.js 18+
- pnpm
- PostgreSQL

## Запуск (Этап 0)

### 1. Установка

```bash
pnpm install
```

### 2. База данных

В `apps/api` создайте `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/buildcrm?schema=public"
JWT_SECRET="your-secret"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
```

Создайте БД и примените схему:

```bash
cd apps/api
pnpm exec prisma db push
pnpm run db:seed
```

### 3. API и CRM

В корне:

```bash
pnpm run dev:api   # в одном терминале — API на :4000
pnpm run dev:crm   # в другом — CRM на :3000
```

Или только CRM (если API уже запущен):

```bash
pnpm run dev:crm
```

### 4. Вход

После seed: **owner@demo.com** / **demo123**. Tenant: **Demo Company** (id из списка на странице логина).

---

## Запуск через Docker (PostgreSQL + API)

```bash
# Поднять PostgreSQL и API
docker-compose up -d

# Один раз применить схему и seed (из контейнера с сетью)
docker run --rm -v "%cd%\apps\api\prisma:/app/prisma" -w /app -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/buildcrm --network buildcrm_default node:20 sh -c "npm init -y && npm install prisma@5.22.0 && npx prisma db push"

docker run --rm -v "%cd%\apps\api:/app" -w /app -e DATABASE_URL=postgresql://postgres:postgres@postgres:5432/buildcrm --network buildcrm_default node:20 sh -c "npm install && npx ts-node prisma/seed.ts"
```

После этого API доступен на **http://localhost:4000**. CRM запускайте локально: `cd apps/crm && npm run dev` (http://localhost:3000).

## Global Admin (Фаза 1)

После seed глобальный админ: **admin@buildcrm.io** / **admin123**.

Запуск админки: `cd apps/admin && npm run dev` (http://localhost:3001).

В админке: дашборд, список клиентов (тенантов), карточка клиента (общая информация, WhatsApp, AI-настройки, логи), интеграция WhatsApp (ChatFlow: instance, токен, webhook), AI-настройки (промпт, поведение, ночной режим, follow-up), управление шаблонами Follow-up, логи системы, системные настройки.

Если API в Docker, для запросов с localhost:3001 задайте в `docker-compose` для сервиса `api`: `CORS_ORIGIN: "http://localhost:3000"` и при необходимости добавьте `http://localhost:3001` или используйте прокси.

## Этапы по плану

- **Этап 0** — основа: монорепо, схема БД, API, CRM, PWA.
- **Фаза 1** — Global Admin: вход супер-админа, клиенты, настройки (ChatFlow, AI, follow-up), логи, системные настройки.
- Дальше: WhatsApp (ChatFlow) webhook, AI Manager, follow-up воркеры, handoff.
