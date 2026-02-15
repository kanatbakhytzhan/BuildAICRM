# ChatFlow: только HTTP Request — что вставлять по шагам

Собираешь цепочку из **одного триггера** и **нескольких узлов HTTP Request**. Ниже — что именно вставлять в каждый узел.  
Перед началом подставь свои значения в блок «Твои данные».

---

## Твои данные (подставь один раз)

| Переменная | Что вставить | Где взять |
|------------|--------------|-----------|
| `ТВОЙ_TENANT_ID` | ID тенанта в BuildCRM | Например `seed-tenant-1` |
| `ТВОЙ_CHATFLOW_TOKEN` | API-токен ChatFlow | Настройки ChatFlow / BuildCRM (админка) |
| `ТВОЙ_INSTANCE_ID` | ID инстанса WhatsApp в ChatFlow | Настройки ChatFlow / BuildCRM (админка) |

Номер отправителя и текст сообщения в ChatFlow обычно доступны как переменные. Если у тебя они называются иначе — замени в примерах:
- текст сообщения: ниже использовано `{{OTHER_MSG}}`;
- номер: ниже использовано `{{PHONE}}` (должен быть в формате `77001234567`, без + и пробелов; для `jid` добавишь `@s.whatsapp.net`).

---

## Триггер

Один узел **«Текстовое сообщение»** (или входящее сообщение) — без настроек, просто чтобы был вход в сценарий. Дальше идут только HTTP Request.

---

## HTTP Request 1 — вызов нашего API (получить ответ и медиа)

- **Название узла (для себя):** например `BuildCRM Welcome`
- Подключи вход от триггера.

**Вариант A — через Query Parameters (надёжнее, если body приходит пустым)**

| Поле | Значение |
|------|----------|
| **HTTP Method** | `GET` или `POST` |
| **URL** | `https://buildcrm-api.onrender.com/webhooks/chatflow/ТВОЙ_TENANT_ID` |

**Query Parameters** (Add Parameter для каждого):

| Параметр | Значение |
|----------|----------|
| `text` | `{{OTHER_MSG}}` (или переменная текста сообщения) |
| `from` | `{{PHONE}}` (или переменная номера отправителя) |
| `welcome` | `1` |

Так API гарантированно получит текст и номер. Если переменные у тебя называются иначе — подставь их.

**Вариант B — через Request Body (если ChatFlow реально шлёт body)**

| Поле | Значение |
|------|----------|
| **HTTP Method** | `POST` |
| **URL** | `https://buildcrm-api.onrender.com/webhooks/chatflow/ТВОЙ_TENANT_ID` |
| **Content Type** | `application/json` |
| **Request Body (JSON)** | `{ "message": "{{OTHER_MSG}}", "from": "{{PHONE}}", "welcome": 1 }` |

Если в логах видишь `bodyKeys: [], bodySample: "{}"` — body не доходит, используй **вариант A** (Query Parameters).

В ответе этого узла будут поля: `reply`, `welcomeVoiceUrl`, `welcomeImageUrls`. Имена переменных из ответа в ChatFlow могут быть вида:
- `{{BuildCRM Welcome.reply}}` или `{{BuildCRM Welcome.body.reply}}`
- `{{BuildCRM Welcome.welcomeVoiceUrl}}` или `{{BuildCRM Welcome.body.welcomeVoiceUrl}}`
- `{{BuildCRM Welcome.welcomeImageUrls.0}}` или `{{BuildCRM Welcome.body.welcomeImageUrls.0}}`

Дальше везде под «ответ 1-го узла» имеется в виду именно эта переменная (подставь имя своего узла вместо `BuildCRM Welcome`, если переименуешь).

---

## HTTP Request 2 — отправить текст в WhatsApp (send-text)

- **Название узла:** например `ChatFlow Send Text`
- Вход: от узла **HTTP Request 1**.

**Способ A — через Query Parameters (GET)**

| Поле | Значение |
|------|----------|
| **HTTP Method** | `GET` |
| **URL** | `https://app.chatflow.kz/api/v1/send-text` |

**Query Parameters** (Add Parameter для каждого):

| Параметр | Значение |
|----------|----------|
| `token` | `ТВОЙ_CHATFLOW_TOKEN` |
| `instance_id` | `ТВОЙ_INSTANCE_ID` |
| `jid` | `{{PHONE}}` (если у тебя номер уже с суффиксом — например `77001234567@s.whatsapp.net` — вставь его; если только цифры — вставь `{{PHONE}}@s.whatsapp.net`) |
| `msg` | переменная с текстом из ответа 1-го узла, например `{{BuildCRM Welcome.reply}}` или `{{BuildCRM Welcome.body.reply}}` |

**Способ B — если конструктор даёт только один URL**

Тогда собери URL вручную (замени TOKEN, INSTANCE_ID, JID, и подставь переменную ответа вместо REPLY_TEXT):

```
https://app.chatflow.kz/api/v1/send-text?token=ТВОЙ_CHATFLOW_TOKEN&instance_id=ТВОЙ_INSTANCE_ID&jid={{PHONE}}@s.whatsapp.net&msg=REPLY_TEXT
```

`REPLY_TEXT` здесь нужно заменить на переменную из ответа первого узла (например `{{BuildCRM Welcome.reply}}`). Если переменная подставляется в значение параметра, оставь как есть.

---

## HTTP Request 3 — отправить голос (send-media)

- **Название узла:** например `ChatFlow Send Voice`
- Вход: от узла **HTTP Request 1** (или от «Send Text», если хочешь порядок: текст → голос → фото).

| Поле | Значение |
|------|----------|
| **HTTP Method** | `POST` |
| **URL** | `https://app.chatflow.kz/api/v1/send-media` |
| **Content Type** | `application/json` |
| **Request Body** | см. ниже |

**Request Body (JSON) — вставь, замени TOKEN, INSTANCE_ID, JID и подставь переменную голоса из ответа 1-го узла:**

```json
{
  "token": "ТВОЙ_CHATFLOW_TOKEN",
  "instance_id": "ТВОЙ_INSTANCE_ID",
  "jid": "{{PHONE}}@s.whatsapp.net",
  "url": "{{BuildCRM Welcome.welcomeVoiceUrl}}",
  "type": "ptt"
}
```

Если переменная из ответа у тебя другая (например `{{BuildCRM Welcome.body.welcomeVoiceUrl}}`), подставь её в поле `url`.  
Если номер уже в формате `77...@s.whatsapp.net`, в `jid` можно оставить просто `{{PHONE}}`.

---

## HTTP Request 4 — отправить первое фото (send-media)

- **Название узла:** например `ChatFlow Send Image 1`
- Вход: от узла **HTTP Request 1** (или от предыдущего шага).

| Поле | Значение |
|------|----------|
| **HTTP Method** | `POST` |
| **URL** | `https://app.chatflow.kz/api/v1/send-media` |
| **Content Type** | `application/json` |
| **Request Body** | см. ниже |

**Request Body (JSON):**

```json
{
  "token": "ТВОЙ_CHATFLOW_TOKEN",
  "instance_id": "ТВОЙ_INSTANCE_ID",
  "jid": "{{PHONE}}@s.whatsapp.net",
  "url": "{{BuildCRM Welcome.welcomeImageUrls.0}}",
  "type": "image"
}
```

Если у тебя путь к первому фото в ответе другой (например `{{BuildCRM Welcome.body.welcomeImageUrls.0}}`), подставь его в `url`.

---

## Если фото несколько

Скопируй узел **HTTP Request 4** и в копии замени в body только `url`:
- второе фото: `{{BuildCRM Welcome.welcomeImageUrls.1}}`
- третье: `welcomeImageUrls.2` и т.д.

---

## Порядок узлов

```
Текстовое сообщение (триггер)
    →
HTTP Request 1 (BuildCRM Welcome)
    →
HTTP Request 2 (Send Text)  →  HTTP Request 3 (Send Voice)  →  HTTP Request 4 (Send Image 1)  →  …
```

Все исходят из ответа **HTTP Request 1** (или по цепочке друг за другом).

---

## Важно

- В каждом узле вместо `ТВОЙ_TENANT_ID`, `ТВОЙ_CHATFLOW_TOKEN`, `ТВОЙ_INSTANCE_ID` подставь свои значения.
- Вместо `{{PHONE}}` и `{{OTHER_MSG}}` — те переменные, которые в ChatFlow отдаёт твой триггер (если названия другие — замени).
- Вместо `{{BuildCRM Welcome....}}` — путь к полям ответа **первого** HTTP Request в твоём конструкторе (имя узла может быть другим).
- Если **send-media** в шагах 3 и 4 вернёт HTML, а не JSON — у ChatFlow этот API пока не работает, голос/фото так отправить не получится; текст (шаг 2) при этом должен уходить.
