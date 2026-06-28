# Локальна розробка

Цей документ описує, як запустити проєкт локально і безпечно тестувати зміни до завантаження на сайт.

## Вимоги

Потрібно встановити:

- Node.js LTS;
- npm;
- Git;
- для деплою на VPS: `ssh`, `rsync`, `curl`.

На macOS/Linux ці інструменти зазвичай уже є або ставляться через пакетний менеджер. На Windows зручно використовувати Git Bash або WSL.

## Перше встановлення

У корені проєкту:

```bash
npm install
```

## Запуск локально

```bash
npm run dev
```

Vite покаже адресу, зазвичай:

```text
http://localhost:5173/
```

Адмінка:

```text
http://localhost:5173/admin
```

## Локальний логін адміністратора

У development-режимі використовується `.env.development`:

```text
VITE_DATA_MODE=local
VITE_LOCAL_ADMIN_EMAIL=admin@local.test
VITE_LOCAL_ADMIN_PASSWORD=admin123
```

Тому локальний вхід:

```text
Email:  admin@local.test
Пароль: admin123
```

Це не production-пароль. Він працює тільки локально.

## Чому локально безпечно експериментувати

`npm run dev` працює в режимі:

```text
VITE_DATA_MODE=local
```

У цьому режимі конфігурація, тести й результати зберігаються тільки у `localStorage` поточного браузера. Production Firebase не змінюється.

Якщо треба очистити локальну пісочницю, відкрий DevTools → Application → Local Storage і видали ключі:

```text
app_config
quizzes
test_results
quiz_admin_config_backups
```

## Звичайний цикл розробки

1. Запусти локальний сайт:

```bash
npm run dev
```

2. Внеси зміни в код або через локальну адмінку.

3. Перевір desktop і mobile вигляд.

4. Перед деплоєм виконай:

```bash
npm run lint
npm run build
npm run security:check
```

Команда `security:check` очікує, що `dist/` уже створено, тому її треба запускати після `npm run build`.

## Команди з package.json

```bash
npm run dev                # локальний Vite server
npm run build              # production build у dist/
npm run preview            # локальний перегляд production build
npm run lint               # ESLint
npm run security:check     # перевірки безпеки bundle і database rules
npm run deploy:vps         # реальний деплой на VPS
npm run deploy:vps:dry-run # репетиція деплою без змін на сервері
```

## Windows 11

1. Встанови Node.js LTS з `nodejs.org`.
2. Встанови Git з `git-scm.com`.
3. Відкрий PowerShell або Git Bash у папці проєкту.
4. Виконай:

```powershell
npm install
npm run dev
```

Якщо PowerShell показує помилку `scripts is disabled`, відкрий PowerShell від імені адміністратора і виконай:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Після цього перезапусти термінал.

## Типові локальні проблеми

### Порт 5173 зайнятий

Vite запропонує інший порт. Відкрий саме ту адресу, яку він показав у терміналі.

### Адмінка не пускає локально

Перевір `.env.development` і перезапусти `npm run dev`. Vite читає env-файли під час старту.

### Дані “дивні” або залишилися від старого тесту

Очисти `localStorage` для `localhost`.

### `npm run build` падає

Це помилка коду або імпорту. На сервер нічого не завантажувати, поки build не зелений.
