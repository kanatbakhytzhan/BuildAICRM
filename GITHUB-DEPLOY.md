# Выкладка BuildCRM на GitHub

## 1. Создать репозиторий на GitHub

1. Зайдите на [github.com](https://github.com), войдите в аккаунт.
2. Нажмите **"+"** → **New repository**.
3. Укажите имя, например **BuildCRM** (или как хотите).
4. **Не** ставьте галочки "Add a README" / "Add .gitignore" — репозиторий должен быть пустым.
5. Нажмите **Create repository**.

## 2. Привязать проект и отправить код

В папке проекта уже выполнен `git init` и первый коммит. Осталось добавить ваш репозиторий и сделать push.

**Подставьте вместо `ВАШ_ЮЗЕРНЕЙМ` и `BuildCRM` свои значения** (username и имя репо с GitHub).

### Вариант A: HTTPS

```bash
cd c:\Users\kanazxz\Desktop\BuildCRM
git remote add origin https://github.com/ВАШ_ЮЗЕРНЕЙМ/BuildCRM.git
git branch -M main
git push -u origin main
```

При запросе логина/пароля используйте ваш GitHub логин и **Personal Access Token** (не пароль от аккаунта).  
Создать токен: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (нужна галка `repo`).

### Вариант B: SSH (если настроен ключ)

```bash
cd c:\Users\kanazxz\Desktop\BuildCRM
git remote add origin git@github.com:ВАШ_ЮЗЕРНЕЙМ/BuildCRM.git
git branch -M main
git push -u origin main
```

## 3. Деплой в интернет (Render)

После того как код будет на GitHub:

1. Зайдите на [render.com](https://render.com) → **New +** → **Blueprint**.
2. Подключите репозиторий **BuildCRM** (авторизация через GitHub).
3. Render подхватит `render.yaml` и создаст Postgres + API + CRM + Admin.
4. Дождитесь деплоя — появятся ссылки на приложение, админку и API.

Подробнее в [DEPLOY-RENDER.md](./DEPLOY-RENDER.md).
