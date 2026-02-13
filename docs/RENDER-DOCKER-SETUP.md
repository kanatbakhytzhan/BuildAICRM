# Render: деплой через Docker (если npm start не находит dist/main)

Если `node dist/main` падает с "Cannot find module", перейди на Docker-деплой.

## В Render Dashboard

1. **Settings** → **Build & Deploy**
2. **Runtime:** выбери **Docker**
3. **Root Directory:** `apps/api`
4. **Dockerfile Path:** `Dockerfile` (или оставь пустым — Render найдёт его в Root Directory)
5. **Docker Build Context:** оставь пустым (используется Root Directory)

**Build Command** и **Start Command** при Docker не задаются — всё берётся из Dockerfile.

## Альтернатива без Root Directory

Если Root Directory не задан:

- **Dockerfile Path:** `apps/api/Dockerfile`
- **Docker Build Context:** `apps/api`

После сохранения сделай **Manual Deploy**.
