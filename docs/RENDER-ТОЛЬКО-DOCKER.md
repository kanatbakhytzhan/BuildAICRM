# Render: этот API нужно деплоить ТОЛЬКО через Docker

На Node-рантайме у Render папка `dist/` не попадает в среду запуска (или она read-only). **Работает только Docker.**

## Что сделать (один раз)

### 1. Новый сервис

- **Dashboard** → **New** → **Web Service**
- Репозиторий: `kanatbakhytzhan/BuildAICRM`, ветка `main`

### 2. Настройки при создании

- **Name:** `buildcrm-api` (или как хочешь)
- **Region:** свой
- **Runtime:** выбери **Docker** (не Node)
- **Dockerfile Path:** `apps/api/Dockerfile`
- **Docker Context:** `apps/api` (или Root Directory: `apps/api` — как в интерфейсе)

### 3. Переменные окружения

Добавь те же, что были у старого сервиса:

- `DATABASE_URL` — External Database URL из твоей PostgreSQL в Render
- `JWT_SECRET` — секрет для JWT
- Остальные по необходимости (`NODE_ENV=production` и т.д.)

### 4. Создать и задеплоить

- **Create Web Service**
- Дождаться зелёного деплоя

### 5. Переключить фронт/клиентов на новый URL

- В настройках CRM/админки заменить старый URL API на новый (типа `https://buildcrm-api-xxx.onrender.com`).

### 6. Удалить старый Node-сервис

- В Render удали старый Web Service (Node), чтобы не платить за два.

---

**Build Command и Start Command при Docker не задаются** — всё делает Dockerfile. После этого ошибка с `dist/main` больше не должна появляться.
