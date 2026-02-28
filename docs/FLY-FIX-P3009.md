# Исправление P3009: failed migration на Fly.io

Если в логах видишь:
```
Error: P3009
migrate found failed migrations in the target database
The `20250210120000_add_channels_topics_visibility` migration ... failed
```

Нужно пометить миграцию как откатанную и дать приложению при следующем старте применить её заново.

## Шаги (выполни один раз)

### 1. Запусти туннель к базе Fly

В **первом** терминале (оставь его открытым):

```powershell
fly proxy 15432:5432 -a buildcrm-db
```

### 2. Подключи Prisma к туннелю и пометь миграцию откатанной

Пароль от БД ты сохранял при создании Postgres: `rYmeDC9CmiuQb9W`  
(если менял — возьми из Fly Dashboard → buildcrm-db → Connect.)

Во **втором** терминале:

```powershell
cd C:\Users\kanazxz\Desktop\BuildCRM\apps\api

$env:DATABASE_URL="postgresql://postgres:rYmeDC9CmiuQb9W@127.0.0.1:15432/buildcrm_api"
npx prisma migrate resolve --rolled-back "20250210120000_add_channels_topics_visibility"
```

Должно вывести что-то вроде: migration marked as rolled back.

### 3. Останови proxy

В первом терминале нажми `Ctrl+C`.

### 4. Задеплой снова

```powershell
cd C:\Users\kanazxz\Desktop\BuildCRM\apps\api
fly deploy
```

После этого при старте приложения `prisma migrate deploy` снова выполнит эту миграцию и продолжит остальные.

---

Если при шаге 2 будет ошибка «database buildcrm_api does not exist», в первом терминале подключись к Postgres и создай базу:

```powershell
# Пока proxy запущен, в другом терминале:
$env:PGPASSWORD="rYmeDC9CmiuQb9W"; psql -h 127.0.0.1 -p 15432 -U postgres -d postgres -c "CREATE DATABASE buildcrm_api;"
```

Потом снова выполни шаг 2.
