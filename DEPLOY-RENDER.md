# Деплой BuildCRM на Render

Полный стек (Postgres, API, CRM, Админка) разворачивается одним Blueprint.

## Шаги

### 1. Репозиторий в Git

Убедитесь, что проект в GitHub или GitLab и в корне есть `render.yaml`.

### 2. Подключение к Render

1. Зайдите на [render.com](https://render.com) и войдите (или зарегистрируйтесь).
2. **Dashboard** → **New +** → **Blueprint**.
3. Подключите репозиторий (GitHub/GitLab), выберите репо **BuildCRM** и ветку (например `main`).
4. Render найдёт `render.yaml` и покажет план: 1 база Postgres и 3 веб-сервиса (API, CRM, Admin).
5. Нажмите **Apply**.

### 3. Ожидание деплоя

- Сначала создаётся БД и деплоится **API** (нужен для CRM и Admin).
- Затем собираются **CRM** и **Admin** (им подставляется URL API из сервиса `buildcrm-api`).
- В каждом сервисе во вкладке **Environment** можно посмотреть переменные.

### 4. Ссылки

После деплоя в Dashboard будут ссылки вида:

- **API:** `https://buildcrm-api.onrender.com`
- **CRM (приложение):** `https://buildcrm-crm.onrender.com`
- **Админка:** `https://buildcrm-admin.onrender.com`

Логин в CRM и админку — по данным из сида (`apps/api/prisma/seed.ts`). В продакшене смените пароли.

---

## Если что-то пошло не так

### CORS или «не могу залогиниться»

Если Render выдал сервисам другие домены (например с суффиксом), в сервисе **buildcrm-api** в **Environment** задайте вручную:

- **CORS_ORIGIN** = `https://ваш-crm-url.onrender.com,https://ваш-admin-url.onrender.com`  
  (точные URL CRM и Admin из Dashboard).

Затем **Save and Deploy** у API.

### CRM/Admin не видят API

У CRM и Admin переменная **NEXT_PUBLIC_API_URL** подставляется из API. Если после первого деплоя они всё ещё ходят не туда:

1. В **buildcrm-api** скопируйте **URL** (например `https://buildcrm-api.onrender.com`).
2. В сервисах **buildcrm-crm** и **buildcrm-admin** в **Environment** добавьте или измените:
   - **NEXT_PUBLIC_API_URL** = `https://buildcrm-api.onrender.com` (ваш URL API).
3. В каждом из них нажмите **Save, rebuild, and deploy** (важно пересобрать, т.к. `NEXT_PUBLIC_*` вшивается при сборке).

### Free tier

- Сервисы после ~15 мин без запросов засыпают; первый запрос может идти 30–60 секунд (cold start).
- Postgres free через 90 дней нужно перенести на платный план или экспортировать данные.

---

## Платный план

Для продакшена лучше перейти на платные инстансы (API, CRM, Admin — **Starter** или выше) и БД **Basic**: без засыпания и с постоянным Postgres.
