# Render: Build Command ОБЯЗАТЕЛЬНО должен включать nest build

Ошибка `Cannot find module dist/main.js` возникает, когда **nest build** не выполняется во время Build (или его вывод не попадает в деплой).

## Правильные настройки

**Root Directory:** `apps/api`

**Build Command (обязательно с nest build!):**
```
npm ci --include=dev && npx prisma generate && npx nest build
```

**Start Command:**
```
npm start
```

## Важно

- `npx nest build` создаёт папку `dist/` с `main.js`
- Это должно выполняться в **Build Command**, а не в Start
- После Build Render упаковывает `dist/` и разворачивает его при Start

Если после этого всё равно не работает — переключись на **Docker** (Environment: Docker, Root Directory: apps/api). Dockerfile уже есть в репо.
