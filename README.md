# Quiz Antigravity

Навчальна платформа для УМШ та пов’язаних подій: сезонів, літніх/весняних шкіл, з’їздів і окремих навчальних циклів.

Production-сайт:

```text
https://uames.pp.ua/
```

Адмінка:

```text
https://uames.pp.ua/admin
```

## Швидкий старт

```bash
npm install
npm run dev
```

Локальна адреса зазвичай:

```text
http://localhost:5173/
```

Локальна адмінка:

```text
http://localhost:5173/admin
```

Локальний логін:

```text
admin@local.test / admin123
```

Локальний режим використовує `localStorage` і не змінює production Firebase.

## Основні команди

```bash
npm run dev                # локальна розробка
npm run lint               # перевірка коду
npm run build              # production build у dist/
npm run security:check     # перевірка Firebase rules і production bundle
npm run deploy:vps:dry-run # репетиція деплою без змін на сервері
npm run deploy:vps         # оновлення сайту https://uames.pp.ua/
```

## Документація

Головний вхід у документацію:

[docs/README.md](./docs/README.md)

Найважливіші розділи:

- [Огляд проєкту](./docs/01-project-overview.md)
- [Архітектура і структура коду](./docs/02-architecture.md)
- [Локальна розробка](./docs/03-local-development.md)
- [Адмінка і керування контентом](./docs/04-admin-content-management.md)
- [Firebase і безпека](./docs/05-firebase-security.md)
- [Google Drive, YouTube і Google Sheets](./docs/06-google-integrations.md)
- [Перший деплой і VPS](./docs/07-deployment-vps.md)
- [Оновлення сайту після доопрацювання](./docs/08-update-workflow.md)
- [Бекап, rollback і troubleshooting](./docs/09-backup-rollback-troubleshooting.md)

## Коротко про архітектуру

- Frontend: React + Vite.
- Дані: Firebase Realtime Database.
- Production login: Firebase Authentication + allowlist `admins/{uid}`.
- Локальний режим: `localStorage`.
- Медіа: Google Drive і YouTube.
- Додаткова статистика: Google Sheets через Apps Script.
- Деплой: статична папка `dist/` на VPS.
