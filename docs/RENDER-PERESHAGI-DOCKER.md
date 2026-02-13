# Render: переключение на Docker (пошагово)

Если `dist/main.js` так и не появляется при обычном Node-деплое — перейди на Docker.

## Шаги в Dashboard

1. Зайди в **Render** → свой **Web Service** (API).

2. **Settings** → **Build & Deploy**.

3. **Environment:** выбери **Docker** (вместо Node).

4. **Root Directory:** укажи **`apps/api`**.
   - Так Render будет собирать образ из папки с Dockerfile.

5. Поля **Build Command** и **Start Command** оставь пустыми — при Docker они не используются, всё задаётся в Dockerfile.

6. **Save Changes**.

7. Сделай **Manual Deploy** → **Deploy latest commit**.

## Что будет при деплое

- Render выполнит `docker build` в контексте `apps/api`.
- В образе запустятся: `npm ci` → `prisma generate` → `nest build` → в итоге появится `dist/main.js`.
- Запуск контейнера: `node dist/main.js` — файл будет внутри образа.

После этого ошибка «Cannot find module dist/main.js» должна пропасть.
