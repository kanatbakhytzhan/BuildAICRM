# ChatFlow: как отправить голос и фото из ответа вебхука

У тебя в конструкторе есть узлы **«Текстовое сообщение»**, **«Аудиосообщение»**, **«Изображение»**. Текст ты уже отправляешь через переменную `{{OTHER_MSG}}`. Ниже — что попробовать для голоса и фото.

---

## Что возвращает наш вебхук (welcome=1)

Ответ приходит в формате JSON, например:

```json
{
  "received": true,
  "tenantId": "seed-tenant-1",
  "reply": "Подскажите, вас интересуют панели для фасада...",
  "welcomeVoiceUrl": "https://buildcrm-api.onrender.com/uploads/1770947775100-47e46ac45b168628.ogg",
  "welcomeImageUrls": [
    "https://buildcrm-api.onrender.com/uploads/1770947800345-794d71ea58a84f6a.png"
  ]
}
```

- **reply** — текст (его ты уже подставляешь в сообщение, возможно как `{{OTHER_MSG}}`).
- **welcomeVoiceUrl** — одна ссылка на голосовое (ogg).
- **welcomeImageUrls** — массив ссылок на фото (png/jpg).

---

## Что сделать в конструкторе ChatFlow

### 1. Цепочка после вебхука

Сделай так:

1. **Текстовое сообщение** (или триггер) → **Send a Webhook** (POST с `welcome=1`, body с `message` и `from`/`metadata.remoteJid`).
2. После **Send a Webhook** подключи по очереди:
   - узел отправки **текста** (туда подставь ответ вебхука — у тебя это уже через `{{OTHER_MSG}}` или аналог);
   - узел **«Аудиосообщение»**;
   - узел **«Изображение»** (при нескольких фото — один узел на каждое фото или цикл, если конструктор умеет).

То есть выход **Send a Webhook** должен идти не только в «отправить текст», но и в узлы «Аудиосообщение» и «Изображение».

### 2. Откуда брать переменные (ответ вебхука)

В конструкторах обычно ответ вебхука доступен как одна из форм:

- `{{webhook.response.welcomeVoiceUrl}}`
- `{{body.welcomeVoiceUrl}}` или `{{response.welcomeVoiceUrl}}`
- `{{steps.Send a Webhook.output.welcomeVoiceUrl}}` или `{{steps.Webhook.output.body.welcomeVoiceUrl}}`
- В настройках узла «Send a Webhook» может быть блок «Mapping» / «Маппинг» — там можно привязать поля ответа к переменным, например: переменная `VOICE_URL` = `body.welcomeVoiceUrl`.

Для фото чаще всего нужно взять **первый элемент массива**:

- `{{body.welcomeImageUrls.0}}` или `{{welcomeImageUrls[0]}}`
- или переменная, в которую в маппинге записан первый элемент `welcomeImageUrls`.

Точный синтаксис смотри в справке ChatFlow по переменным и ответу HTTP/Webhook.

### 3. Узел «Аудиосообщение»

- Открой узел **«Аудиосообщение»**.
- Найди поле для **источника аудио**: «URL», «Ссылка», «Файл по ссылке», «Media URL» и т.п. (не только «загрузить файл»).
- В это поле подставь переменную из ответа вебхука, например:  
  `{{body.welcomeVoiceUrl}}` или ту, что у тебя соответствует полю `welcomeVoiceUrl` из JSON выше.

Если поля «URL» / «Ссылка» нет и есть только загрузка файла — в текущей версии ChatFlow отправка голоса по URL может быть недоступна, тогда нужно уточнить в поддержке ChatFlow.

### 4. Узел «Изображение»

- Аналогично: открой узел **«Изображение»**.
- Найди поле для **источника картинки**: «URL», «Ссылка», «Image URL» и т.п.
- Подставь переменную **первого фото** из ответа, например:  
  `{{body.welcomeImageUrls.0}}` или `{{welcomeImageUrls[0]}}`.
- Если фото несколько — добавь несколько узлов «Изображение» и подставь `welcomeImageUrls.0`, `welcomeImageUrls.1` и т.д., либо настрой цикл, если конструктор это поддерживает.

### 5. Проверка

- Сохрани поток и отправь боту первое сообщение (например «панели»), с вызовом вебхука с `welcome=1`.
- В логах нашего API будет видно, что вернулись `reply`, `welcomeVoiceUrl`, `welcomeImageUrls`.
- Если в ChatFlow переменные подставлены верно и узлы «Аудиосообщение» / «Изображение» умеют отправлять по URL — в WhatsApp придёт голос и фото как обычные сообщения, а не текстом.

---

## Обход через узел «HTTP Request» и переменные

Можно собрать цепочку **только из узлов HTTP Request** и явно прокинуть переменные из ответа нашего API.

### Шаг 1: Вызвать наш API

- Узел **HTTP Request**: Method **POST**, URL `https://buildcrm-api.onrender.com/webhooks/chatflow/seed-tenant-1`, Content Type `application/json`.
- **Request Body (JSON):**
  ```json
  { "message": "{{OTHER_MSG}}", "from": "{{НомерОтправителя}}", "welcome": 1 }
  ```
  Подставь переменную номера из триггера (например `{{metadata.remoteJid}}`).

В выходе узла будет ответ с полями `reply`, `welcomeVoiceUrl`, `welcomeImageUrls`. В ChatFlow они могут называться, например: `{{HTTP Request.body.reply}}`, `{{HTTP Request.body.welcomeVoiceUrl}}`, `{{HTTP Request.body.welcomeImageUrls.0}}`.

### Шаг 2: Отправить текст (send-text)

- Ещё один **HTTP Request**: Method **GET**, URL `https://app.chatflow.kz/api/v1/send-text`.
- **Query Parameters:** `token`, `instance_id`, `jid` (номер в формате `79...@s.whatsapp.net`), `msg` = **`{{HTTP Request.body.reply}}`** (или как у тебя называется ответ шага 1).

Текст уйдёт в WhatsApp.

### Шаг 3: Попробовать отправить голос/фото (send-media)

- Ещё один **HTTP Request**: Method **POST**, URL `https://app.chatflow.kz/api/v1/send-media`, Content Type `application/json`.
- **Request Body:**
  ```json
  { "token": "ТВОЙ_TOKEN", "instance_id": "ТВОЙ_INSTANCE_ID", "jid": "79...@s.whatsapp.net", "url": "{{HTTP Request.body.welcomeVoiceUrl}}", "type": "ptt" }
  ```
  Для фото — тот же URL, в body `"type": "image"` и `"url": "{{HTTP Request.body.welcomeImageUrls.0}}"`.

Если в ответе приходит HTML — send-media у ChatFlow не работает, обход не сработает. Если приходит JSON с `success: true` — медиа уйдёт в чат.

| Что отправить | Переменная из шага 1 | Куда |
|---------------|----------------------|------|
| Текст | `reply` | send-text, параметр `msg` |
| Голос | `welcomeVoiceUrl` | send-media, `url`, type `ptt` |
| Фото | `welcomeImageUrls.0` | send-media, `url`, type `image` |

---

## Если в узлах нет поля «URL» / «Ссылка»

Тогда в текущем виде конструктор, скорее всего, не умеет отправлять медиа по ссылке из вебхука. Имеет смысл:

- написать в поддержку ChatFlow: «Нужна отправка аудио и изображения по URL из ответа вебхука (поля welcomeVoiceUrl и welcomeImageUrls)»;
- пока медиа будет уходить нашим fallback’ом — текстовой ссылкой в чат (как сейчас).
