# Исправление ошибки P3005: «The database schema is not empty»

База уже содержит таблицы, но Prisma не знает, какие миграции уже применены. Нужно один раз отметить их как «применённые».

## Шаг 1: Запустить Render Shell

1. Откройте **Render Dashboard**
2. Выберите сервис **buildcrm-api**
3. Вкладка **Shell** (или **Console**)
4. Запустите Shell

## Шаг 2: Выполнить команды baseline

Выполните команды **по одной** (или скопируйте весь блок):

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
npx prisma migrate resolve --applied "20250213100000_add_transcription_language"
```

### Вариант A: одной командой

Если Shell запускается из `apps/api`:

```bash
cd apps/api
npm run db:baseline
```

### Вариант B: по одной миграции

Если Shell из корня проекта, сначала выполните `cd apps/api`. Затем можно запускать каждую `migrate resolve` по отдельности (см. список выше).

## Шаг 3: Деплой

После выполнения команд сделайте **ручной деплой** buildcrm-api (Deploy → Deploy latest commit). Миграция `20250214100000_add_shift_attendance` должна примениться.

---

## Альтернатива: prisma db push

Если Shell недоступен или команды не сработали, можно временно заменить в Build Command:

**Было:**
```
npm ci --include=dev && npx prisma generate && npx prisma migrate deploy
```

**Стало:**
```
npm ci --include=dev && npx prisma generate && npx prisma db push
```

`db push` синхронизирует схему без истории миграций. Для добавления новых таблиц и полей обычно подходит. После успешного деплоя можно вернуть `migrate deploy` и один раз сделать baseline (команды выше).
