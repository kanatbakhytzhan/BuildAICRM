# Вывод BuildCRM в интернет (один VPS)

Пошаговая инструкция: приложение (CRM), AI-менеджер, админка и API на одном сервере с доменом и HTTPS.

## Что нужно

- **VPS** (Ubuntu 22.04 или 24.04): например, Timeweb, Selectel, DigitalOcean, любой с публичным IP.
- **Домен**: например `your-domain.ru`. Нужны поддомены (или один домен с путями — ниже вариант с поддоменами):
  - `api.your-domain.ru` — API
  - `app.your-domain.ru` — CRM (приложение)
  - `admin.your-domain.ru` — админка

---

## 1. Подготовка сервера

Подключитесь по SSH:

```bash
ssh root@ВАШ_IP
```

Установите Docker и Docker Compose:

```bash
apt update && apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
```

Проверка: `docker run hello-world` и `docker compose version`.

---

## 2. Клонирование проекта и .env

```bash
cd /opt
git clone https://github.com/ВАШ_РЕПО/BuildCRM.git
cd BuildCRM
```

Создайте `.env` из примера и подставьте **реальные** значения для продакшена:

```bash
cp .env.example .env
nano .env
```

Пример для поддоменов и HTTPS:

```env
JWT_SECRET=сложный-случайный-секрет-минимум-32-символа
CORS_ORIGIN=https://app.your-domain.ru,https://admin.your-domain.ru
NEXT_PUBLIC_API_URL=https://api.your-domain.ru
```

Сохраните файл. **Важно:** `NEXT_PUBLIC_API_URL` — это URL, с которого браузер ходит к API (должен быть с HTTPS после настройки SSL).

---

## 3. Запуск контейнеров

Соберите и запустите весь стек (Postgres, API, CRM, Admin):

```bash
docker compose up -d --build
```

Проверьте, что все контейнеры работают:

```bash
docker compose ps
```

Должны быть: `postgres`, `api`, `crm`, `admin`. Логи: `docker compose logs -f api`.

---

## 4. DNS

В панели управления доменом создайте A-записи, указывающие на IP вашего VPS:

| Имя  | Тип | Значение   |
|------|-----|------------|
| api   | A   | IP_ВАШЕГО_VPS |
| app   | A   | IP_ВАШЕГО_VPS |
| admin | A   | IP_ВАШЕГО_VPS |

Подождите распространения DNS (от нескольких минут до часа).

---

## 5. Nginx и HTTPS (Let's Encrypt)

Установите Nginx и Certbot:

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Скопируйте конфиг обратного прокси и замените домен:

```bash
cp /opt/BuildCRM/deploy/nginx.conf /etc/nginx/sites-available/buildcrm
sed -i 's/your-domain\.ru/ВАШ_РЕАЛЬНЫЙ_ДОМЕН.ru/g' /etc/nginx/sites-available/buildcrm
ln -s /etc/nginx/sites-available/buildcrm /etc/nginx/sites-enabled/
# Уберите дефолтный сайт, если мешает: rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

Получите сертификаты (Certbot сам настроит HTTPS в Nginx):

```bash
certbot --nginx -d api.ВАШ_ДОМЕН.ru -d app.ВАШ_ДОМЕН.ru -d admin.ВАШ_ДОМЕН.ru
```

Следуйте подсказкам. После этого сайты будут открываться по `https://api...`, `https://app...`, `https://admin...`.

---

## 6. Пересборка CRM и Admin с правильным API URL

Если сначала запускали с `NEXT_PUBLIC_API_URL=http://localhost:4000`, после настройки HTTPS нужно пересобрать образы CRM и Admin с публичным URL API:

В `.env` уже должно быть:

```env
NEXT_PUBLIC_API_URL=https://api.your-domain.ru
```

Пересоберите и перезапустите только фронты:

```bash
cd /opt/BuildCRM
docker compose build --no-cache crm admin
docker compose up -d crm admin
```

---

## Итог

- **API:** `https://api.your-domain.ru`
- **CRM (приложение):** `https://app.your-domain.ru`
- **Админка:** `https://admin.your-domain.ru`

Логин в админку и в CRM — по данным из seed (см. `apps/api/prisma/seed.ts`). В продакшене смените пароли и `JWT_SECRET`.

---

## Полезные команды

```bash
# Логи
docker compose logs -f api

# Остановить всё
docker compose down

# Обновление кода и перезапуск
cd /opt/BuildCRM && git pull && docker compose up -d --build
```
