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

## Кратко

| Ошибка | Статус | Действие |
|--------|--------|----------|
| request entity too large | Исправлено | Деплой с новым main.ts |
| caption required для send-image | Исправлено | Деплой |
| instance_id invalid / not connected | Вручную | Проверить ChatFlow и переподключить |
