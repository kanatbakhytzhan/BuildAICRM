# Деплой BuildCRM на Fly.io

## Структура проекта

```
apps/
├── api/          # NestJS API (порт 8080)
├── crm/          # Next.js CRM Frontend (порт 8080)
└── admin/        # Next.js Admin Panel (порт 8080)
```

## Предварительные требования

1. Установи flyctl: https://fly.io/docs/hands-on/install-flyctl/
2. Зарегистрируйся на Fly.io (нужна карта для верификации, но есть бесплатный tier)

---

## Шаг 1: Установка и авторизация

```bash
# Windows (PowerShell)
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Авторизация
fly auth login
```

---

## Шаг 2: Создание PostgreSQL базы данных

```bash
# Создаём Postgres кластер (1GB бесплатно)
fly postgres create --name buildcrm-db --region ams --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1

# Сохрани DATABASE_URL который выведется!
# Формат: postgres://postgres:PASSWORD@buildcrm-db.internal:5432/postgres
```

**Важно:** Сохрани `DATABASE_URL` — он понадобится для API.

---

## Шаг 3: Деплой API

```bash
cd apps/api

# Создаём приложение (первый раз)
fly apps create buildcrm-api --org personal

# Создаём volume для uploads (1GB)
fly volumes create uploads_data --size 1 --region ams --app buildcrm-api

# Устанавливаем секреты
fly secrets set DATABASE_URL="postgres://postgres:PASSWORD@buildcrm-db.internal:5432/postgres" --app buildcrm-api
fly secrets set JWT_SECRET="твой-секретный-ключ-минимум-32-символа" --app buildcrm-api
fly secrets set API_URL="https://buildcrm-api.fly.dev" --app buildcrm-api
fly secrets set CORS_ORIGIN="https://buildcrm-crm.fly.dev,https://buildcrm-admin.fly.dev" --app buildcrm-api

# Опционально: Cloudinary для медиа
fly secrets set CLOUDINARY_CLOUD_NAME="твой_cloud_name" --app buildcrm-api
fly secrets set CLOUDINARY_API_KEY="твой_api_key" --app buildcrm-api
fly secrets set CLOUDINARY_API_SECRET="твой_api_secret" --app buildcrm-api

# Деплой
fly deploy
```

---

## Шаг 4: Подключение базы к API

```bash
# Привязываем Postgres к API (автоматически добавит DATABASE_URL)
fly postgres attach buildcrm-db --app buildcrm-api
```

---

## Шаг 5: Деплой CRM Frontend

```bash
cd apps/crm

# Создаём приложение
fly apps create buildcrm-crm --org personal

# Деплой (API_URL уже в fly.toml)
fly deploy
```

---

## Шаг 6: Деплой Admin Panel

```bash
cd apps/admin

# Создаём приложение
fly apps create buildcrm-admin --org personal

# Деплой
fly deploy
```

---

## Шаг 7: Проверка

```bash
# Статус всех приложений
fly apps list

# Логи API
fly logs --app buildcrm-api

# Логи CRM
fly logs --app buildcrm-crm

# Открыть в браузере
fly open --app buildcrm-crm
fly open --app buildcrm-admin
```

---

## URL-адреса после деплоя

| Сервис | URL |
|--------|-----|
| API | https://buildcrm-api.fly.dev |
| CRM | https://buildcrm-crm.fly.dev |
| Admin | https://buildcrm-admin.fly.dev |

---

## Переменные окружения (secrets)

### API (buildcrm-api)

```bash
fly secrets set DATABASE_URL="postgres://..." --app buildcrm-api
fly secrets set JWT_SECRET="..." --app buildcrm-api
fly secrets set API_URL="https://buildcrm-api.fly.dev" --app buildcrm-api
fly secrets set CORS_ORIGIN="https://buildcrm-crm.fly.dev,https://buildcrm-admin.fly.dev" --app buildcrm-api

# Опционально
fly secrets set CLOUDINARY_CLOUD_NAME="..." --app buildcrm-api
fly secrets set CLOUDINARY_API_KEY="..." --app buildcrm-api
fly secrets set CLOUDINARY_API_SECRET="..." --app buildcrm-api
```

### CRM и Admin

Переменные `NEXT_PUBLIC_API_URL` задаются в `fly.toml` как build args.

---

## Миграция данных из Render

Если есть backup из Render:

```bash
# 1. Скачай backup с Render (Export)

# 2. Подключись к Fly Postgres
fly postgres connect --app buildcrm-db

# 3. Или через psql локально
fly proxy 5432:5432 --app buildcrm-db &
psql postgres://postgres:PASSWORD@localhost:5432/postgres < backup.sql
```

---

## Полезные команды

```bash
# SSH в контейнер
fly ssh console --app buildcrm-api

# Перезапуск
fly apps restart buildcrm-api

# Масштабирование
fly scale count 2 --app buildcrm-api

# Просмотр secrets
fly secrets list --app buildcrm-api

# Удаление приложения
fly apps destroy buildcrm-api
```

---

## Стоимость (Fly.io)

| Ресурс | Бесплатно | Платно |
|--------|-----------|--------|
| shared-cpu-1x, 256MB | 3 VM | $1.94/мес за доп. VM |
| Postgres 1GB | 1 кластер | $0.15/GB сверх |
| Bandwidth | 100GB/мес | $0.02/GB |
| Volumes | 3GB | $0.15/GB/мес |

**Итого для BuildCRM:** ~$0-5/мес при минимальной нагрузке.

---

## Troubleshooting

### База не подключается
```bash
# Проверь что Postgres запущен
fly status --app buildcrm-db

# Проверь DATABASE_URL
fly secrets list --app buildcrm-api
```

### API не отвечает
```bash
# Логи
fly logs --app buildcrm-api

# Health check
curl https://buildcrm-api.fly.dev/
```

### Миграции не применились
```bash
# SSH и запусти вручную
fly ssh console --app buildcrm-api
npx prisma migrate deploy
```
