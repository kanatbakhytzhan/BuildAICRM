# Ошибка P1001 при деплое на Render

**Симптом:** в логах сборки (Build) появляется:
```
Error: P1001: Can't reach database server at `dpg-xxx:5432`
Please make sure your database server is running at ...
```

**Причина:** во время **сборки** (Build) выполняется команда, которая подключается к БД (`prisma migrate deploy` или `prisma db push`). На Render база данных **недоступна из окружения сборки** — только из рантайма (когда уже запущен сервис).

## Что сделать

### Если используешь Docker (render.yaml с dockerfilePath)

- В **Build** не должно быть обращений к БД.
- В репозитории уже настроено:
  - В Dockerfile сборка делает только `prisma generate` и `nest build` (без подключения к БД).
  - Миграции выполняются при **старте** контейнера: `npx prisma migrate deploy && node dist/main.js`.
- Убедись, что в Render Dashboard в настройках сервиса **нет** переопределения Build Command с `prisma migrate deploy` или `prisma db push`. Если есть — убери, оставь сборку по Dockerfile.

### Если используешь Native Environment (без Docker)

- **Build Command** должен быть без миграций, например:
  ```
  npm ci --include=dev && npx prisma generate && npx nest build
  ```
- **Start Command** — миграции и запуск приложения:
  ```
  npx prisma migrate deploy && npm start
  ```
- Для этого в production должны быть установлены `prisma` и `@prisma/client` (в репозитории `prisma` вынесен в `dependencies` для API).

Итог: **никогда не запускай `prisma migrate deploy` или `prisma db push` в Build Command** — только в Start Command или в CMD Docker-образа.
