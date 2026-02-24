# Исправления по логам Render

## 1. ✅ `PayloadTooLargeError: request entity too large`

**Причина:** ChatFlow отправляет большой payload (медиа, base64 и т.д.), а лимит body по умолчанию — ~100 KB.

**Что сделано:** Лимит увеличен до 10 MB в `main.ts`:
- `express.json({ limit: '10mb' })`
- `express.urlencoded({ limit: '10mb' })`

---

## 2. ✅ `send-image: Parameter [token, instance_id, caption, jid, imageurl] are required!`

**Причина:** ChatFlow требует обязательный параметр `caption` для send-image.

**Что сделано:** Параметр `caption` всегда передаётся (пустая строка, если не указан).

---

## 3. ⚠️ `send-audio: Either your instance_id is invalid or your instance is not longer connected`

**Причина:** Инстанс WhatsApp в ChatFlow отключён или `instance_id` неверный.

**Что сделать:**
1. Зайти в ChatFlow → настройки WhatsApp.
2. Убедиться, что инстанс подключён (зелёный статус).
3. При необходимости переподключить WhatsApp.
4. Обновить `chatflowInstanceId` в BuildCRM (админка → клиент → настройки WhatsApp).

---

## 4. ⚠️ `Server has closed the connection` / `database system is in recovery mode`

**В логах:**
- `Invalid prisma.systemLog.create() invocation: Server has closed the connection`
- `Error querying the database: FATAL: the database system is in recovery mode`
- `FATAL: the database system is not yet accepting connections. DETAIL: Consistent recovery state has not been yet reached.`

**Причина:** База данных (PostgreSQL на Render) временно недоступна:
- перезапуск БД после деплоя или обновления;
- восстановление после сбоя (recovery mode);
- разрыв соединения (timeout, сеть).

**Что делать:**
1. Подождать 1–2 минуты — после выхода БД из recovery ошибки обычно проходят.
2. Render Dashboard → сервис **Postgres** → вкладка **Logs** / **Metrics** — убедиться, что БД в статусе Available.
3. Если ошибки повторяются часто — проверить план БД (free tier может уходить в sleep) или включить «Persistent disk» / более высокий план.

**Итог:** Это не ошибка кода, а временная недоступность БД. Повторная отправка вебхука со стороны ChatFlow после восстановления БД обычно проходит успешно.

---

## Кратко

| Ошибка | Статус | Действие |
|--------|--------|----------|
| request entity too large | Исправлено | Деплой с новым main.ts |
| caption required для send-image | Исправлено | Деплой |
| instance_id invalid / not connected | Вручную | Проверить ChatFlow и переподключить |
| Server has closed the connection / DB in recovery | Инфра | Подождать 1–2 мин, проверить статус БД на Render |
