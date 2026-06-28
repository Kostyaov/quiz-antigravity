# Перший деплой і VPS

Цей документ описує production-сервер і ручний сенс деплою. Для щоденного оновлення після змін дивись [Оновлення сайту після доопрацювання](./08-update-workflow.md).

## Поточний сервер

```text
URL:  https://uames.pp.ua/
SSH:  root@198.46.175.223
Path: /var/www/quiz-app
Dist: /var/www/quiz-app/dist
```

На сервер завантажується тільки папка `dist/`. Вихідний код, `.env`, `node_modules` і робочі файли на VPS не копіюються.

## Що має бути на локальному комп’ютері

Для деплою потрібні:

- npm;
- ssh;
- rsync;
- curl;
- SSH-ключ, доданий у `/root/.ssh/authorized_keys` на VPS.

Перевірка SSH:

```bash
ssh root@198.46.175.223 hostname
```

Очікувано команда повертає ім’я сервера, наприклад:

```text
racknerd-4849bea
```

Якщо бачиш `Permission denied`, треба налаштувати SSH-ключ.

## Deploy-скрипт

Скрипт:

```text
scripts/deploy-vps.sh
```

Команди з `package.json`:

```bash
npm run deploy:vps
npm run deploy:vps:dry-run
```

## Що робить `npm run deploy:vps`

1. Показує ціль деплою.
2. Запускає:

```bash
npm run lint
npm run build
npm run security:check
```

3. Перевіряє SSH і наявність `/var/www/quiz-app`.
4. Створює бекап поточного `dist/`.
5. Завантажує новий `dist/` через `rsync`.
6. Виставляє права:

```text
директорії → 755
файли      → 644
owner      → root:root
```

7. Перевіряє:

```text
https://uames.pp.ua/
https://uames.pp.ua/admin
головний assets/index-*.js
```

8. Показує rollback-команду.

## Dry-run

Команда:

```bash
npm run deploy:vps:dry-run
```

робить локальні перевірки, build, security check, перевіряє SSH і показує, які файли були б змінені на сервері.

Файли при цьому не завантажуються.

## Змінні для іншого сервера

Якщо сервер або домен зміниться, не треба редагувати скрипт. Можна запустити так:

```bash
DEPLOY_REMOTE=user@server.example.com \
DEPLOY_REMOTE_PATH=/var/www/another-site \
DEPLOY_SITE_URL=https://another-site.example.com/ \
npm run deploy:vps
```

Доступні змінні:

```text
DEPLOY_REMOTE
DEPLOY_REMOTE_PATH
DEPLOY_SITE_URL
DEPLOY_BACKUP_DIR
```

## Firebase rules не входять у VPS deploy

`npm run deploy:vps` оновлює тільки frontend на сервері.

Firebase rules деплояться окремо:

```bash
firebase deploy --only database
```

Це треба робити тільки якщо змінювався `database.rules.json`.
