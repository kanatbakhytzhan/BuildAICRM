# Как применить миграции на Render

У тебя деплой через **Docker** (render.yaml). В образе миграции **не запускаются сами** — их нужно применить вручную или один раз настроить автозапуск.

---

## Вариант 1: С своего компьютера (проще всего)

1. В **Render Dashboard** открой свою **PostgreSQL** (или сервис с БД).
2. **Connect** → скопируй **External Database URL** (вида `postgresql://user:pass@host/dbname`).
3. Локально в проекте:
   ```bash
   cd apps/api
   set DATABASE_URL=postgresql://...   # вставь URL (Windows)
   # или: export DATABASE_URL=postgresql://...   # Linux/macOS
   npx prisma migrate deploy
   ```
4. В консоли должно быть что-то вроде: `Applied migration 20250216000000_add_lead_welcome_media_sent_at`.

Так применяются **все неприменённые** миграции, в том числе новая с полем `welcomeMediaSentAt`.

---

## Вариант 2: Выполнить SQL вручную в Render

Если не хочешь подключаться с ПК:

1. Render Dashboard → твоя **PostgreSQL**.
2. Открой **Connect** → выбери способ (psql, или вкладка с SQL-консолью, если есть).
3. Выполни один раз:
   ```sql
   ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "welcomeMediaSentAt" TIMESTAMP(3);
   ```
4. Чтобы Prisma не пыталась применить эту миграцию позже, отметь её как применённую (только если делаешь baseline):
   ```bash
   # Локально, с DATABASE_URL на Render:
   cd apps/api
   npx prisma migrate resolve --applied "20250216000000_add_lead_welcome_media_sent_at"
   ```

---

## Как проверить, что миграция применена

**Своего ПК (с DATABASE_URL на Render):**
```bash
cd apps/api
npx prisma migrate status
```
Должно быть: все миграции в статусе applied, в том числе `20250216000000_add_lead_welcome_media_sent_at`.

**Через SQL в Render:**  
Выполни:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Lead' AND column_name = 'welcomeMediaSentAt';
```
Если вернулась одна строка `welcomeMediaSentAt` — колонка есть.

---

## Сделать так, чтобы миграции применялись при каждом деплое

Нужно при старте контейнера запускать `prisma migrate deploy` до `node dist/main.js`. В текущем Docker-образе Prisma CLI ставится только в dev-зависимостях, поэтому в production-образе его нет.

Варианты:

1. **Перенести prisma в dependencies** в `apps/api/package.json` и в Dockerfile в CMD прописать:
   ```dockerfile
   CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
   ```
2. Или оставить как есть и применять миграции вручную (варианты 1 или 2 выше) при появлении новых.
