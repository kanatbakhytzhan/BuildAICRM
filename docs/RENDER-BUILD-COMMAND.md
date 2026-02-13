# Render: настройки Build и Start (Node, без Docker)

## Рекомендуемый способ: запуск из исходников (ts-node)

Не используем `dist/` — приложение запускается из `src/` через ts-node. Обходит проблему, когда артефакты билда не попадают в среду запуска.

**Root Directory:** `apps/api`

**Build Command:**
```
npm ci --include=dev && npx prisma generate
```

**Start Command:**
```
npm run start:render
```

В `package.json` уже есть скрипт `start:render`, он запускает `node -r ts-node/register/transpile-only src/main.ts`. Dev-зависимости (ts-node, typescript) нужны при старте — поэтому в Build используется `--include=dev`.

---

## Варианты через dist/ (если у тебя dist/ доезжает до запуска)

### Вариант A: Сборка в Start Command

**Build Command:** `npm ci --include=dev && npx prisma generate`  
**Start Command:** `npx nest build && npm start`

### Вариант B: Сборка только в Build

**Build Command:** `npm ci --include=dev && npx prisma generate && npx nest build`  
**Start Command:** `npm start`

Если при этом всё равно `Cannot find module .../dist/main` — используй способ с **start:render** выше.

---

## Не добавляй в Start Command

- **Не** пиши `npx prisma migrate deploy && ...` — при ошибке P3005 падает весь старт.
- Миграции применяй отдельно (см. `RENDER-MIGRATE-BASELINE.md`).
