# ChatFlow API и приветственные сообщения по темам

Используем официальные эндпоинты ChatFlow для отправки текста и медиа в WhatsApp. Это нужно для **приветственных сообщений по темам** (текст, картинка, голосовое, документ).

Базовый URL: `https://app.chatflow.kz/api/v1`

Общие параметры: `token` (ваш токен), `instance_id` (ID инстанса), `jid` (номер в формате `549999999999@s.whatsapp.net`).

---

## 1. Текст — send-text

**GET** `https://app.chatflow.kz/api/v1/send-text?token=TOKEN&instance_id=ID&jid=JID&msg=TEXT`

| Параметр     | Описание                    |
|-------------|-----------------------------|
| token       | Токен ChatFlow              |
| instance_id | ID инстанса                 |
| jid         | 549999999999@s.whatsapp.net |
| msg         | Текст сообщения             |

Успех: `{ "success": true, "message": "Message sent successfully!", "response": "..." }`  
Ошибка: `{ "success": false, "message": "<REASON>" }`

---

## 2. Изображение — send-image

**GET** `https://app.chatflow.kz/api/v1/send-image?token=TOKEN&instance_id=ID&jid=JID&caption=CAPTION&imageurl=IMAGEURL`

| Параметр     | Описание                    |
|-------------|-----------------------------|
| token       | Токен                       |
| instance_id | ID инстанса                 |
| jid         | 549999999999@s.whatsapp.net |
| caption     | Подпись к фото (опционально)|
| imageurl    | URL картинки (https://...)  |

Используется для приветственных фото по теме (`welcomeImageUrl`, `welcomeImageUrls`).

---

## 3. Аудио — send-audio

**GET** `https://app.chatflow.kz/api/v1/send-audio?token=TOKEN&instance_id=ID&jid=JID&audiourl=AUDIOURL`

| Параметр     | Описание                    |
|-------------|-----------------------------|
| token       | Токен                       |
| instance_id | ID инстанса                 |
| jid         | 549999999999@s.whatsapp.net |
| audiourl    | URL аудио (https://...)      |

Используется для приветственного голосового по теме (`welcomeVoiceUrl`).

---

## 4. Документ — send-doc

**GET** `https://app.chatflow.kz/api/v1/send-doc?token=TOKEN&instance_id=ID&jid=JID&caption=CAPTION&docurl=DOCURL`

| Параметр     | Описание                    |
|-------------|-----------------------------|
| token       | Токен                       |
| instance_id | ID инстанса                 |
| jid         | 549999999999@s.whatsapp.net |
| caption     | Подпись к документу (опционально) |
| docurl      | URL документа (https://...) |

---

## Как у нас настроено по темам

- В **настройках темы** (TenantTopic) задаются:
  - **Текст** приветствия (сценарий / ответ AI).
  - **Голосовое**: `welcomeVoiceUrl` — отправляется через **send-audio**.
  - **Фото**: `welcomeImageUrl` или массив `welcomeImageUrls` — каждое через **send-image**.
  - При необходимости документ можно добавить в модель темы и отправлять через **send-doc**.

- В вебхуке при первом сообщении от клиента (режим приветствия) или по крону мы:
  1. Отправляем текст через **send-text**.
  2. Если у темы есть `welcomeVoiceUrl` — отправляем через **send-audio**.
  3. Если есть `welcomeImageUrl` или `welcomeImageUrls` — отправляем через **send-image** (с пустым или заданным caption).

Токен и `instance_id` берутся из настроек тенанта (TenantSettings) и при необходимости из канала лида (instance_id по каналу).
