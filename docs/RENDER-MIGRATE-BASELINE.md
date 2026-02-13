# Render: ошибка P3005 (database schema is not empty)

Если при деплое видишь **P3005: The database schema is not empty**, значит база уже создана (например через `prisma db push` или вручную), но Prisma не считает миграции применёнными.

## Вариант 1: Быстро — убрать migrate deploy из Build Command

1. В Render → твой сервис API → **Settings** → **Build & Deploy**.
2. **Build Command** измени на (без `prisma migrate deploy`):
   ```bash
   npm ci --include=dev && npx prisma generate && npx nest build
   ```
3. Сохрани. Деплой пройдёт.

4. Добавь колонку цели вручную один раз:
   - Render → **Shell** (или подключись к PostgreSQL по Connection String).
   - Выполни:
   ```sql
   ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "revenueGoal" INTEGER;
   ```

После этого «Цель периода» в аналитике CRM будет работать.

---

## Вариант 2: Baseline — чтобы в будущем работал `prisma migrate deploy`

Если хочешь, чтобы на деплое всегда выполнялись миграции:

1. Локально в проекте задай переменную с URL базы Render (в Render: **Environment** → **Internal Database URL** или **External Database URL**):
   ```bash
   set DATABASE_URL=postgresql://...   # Windows
   export DATABASE_URL=postgresql://... # Linux/macOS
   ```

2. Из каталога **apps/api** выполни по очереди (отмечаем все уже применённые миграции):
   ```bash
   cd apps/api
   npx prisma migrate resolve --applied "20250210120000_add_channels_topics_visibility"
   npx prisma migrate resolve --applied "20250210140000_add_topic_scenario_media_respond_first"
   npx prisma migrate resolve --applied "20250210180000_add_openai_model"
   npx prisma migrate resolve --applied "20250210200000_add_lead_deal_amount"
   npx prisma migrate resolve --applied "20250210210000_add_topic_welcome_media"
   npx prisma migrate resolve --applied "20250210220000_add_quick_reply_and_dashboard"
   npx prisma migrate resolve --applied "20250211000000_add_topic_welcome_image_urls"
   npx prisma migrate resolve --applied "20250213000000_add_revenue_goal"
   ```
   Если база уже содержит все таблицы и колонки из этих миграций — отметь все 8. Если нет — отметь только те, которые уже точно есть в базе (обычно все кроме последней), затем снова запусти деплой с `prisma migrate deploy` в Build/Start — применится только новая.

3. Верни в Build Command на Render строку с миграциями:
   ```bash
   npm ci --include=dev && npx prisma generate && npx nest build && npx prisma migrate deploy && npm start
   ```
   Либо оставь миграции в **Start Command**: `npx prisma migrate deploy && npm start`.

После baseline следующие миграции будут применяться при каждом деплое автоматически.
