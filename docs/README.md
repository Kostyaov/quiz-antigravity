# Документація Quiz Antigravity

Це головна документація проєкту. Вона зібрана так, щоб людина, яка вперше відкрила репозиторій, могла зрозуміти:

- що це за сайт;
- як запустити його локально;
- як змінювати навчальні цикли, сесії, тести й медіа;
- як працюють Firebase, Google Drive, YouTube і Google Sheets;
- як безпечно оновлювати сайт на VPS;
- як відкотитися назад, якщо щось пішло не так.

Поточний production-сайт:

```text
URL:  https://uames.pp.ua/
SSH:  root@198.46.175.223
Path: /var/www/quiz-app
```

## Найкоротший шлях

Локальна розробка:

```bash
npm install
npm run dev
```

Перевірка перед завантаженням:

```bash
npm run lint
npm run build
npm run security:check
```

Оновлення сайту на VPS:

```bash
npm run deploy:vps
```

Безпечна репетиція деплою без завантаження файлів:

```bash
npm run deploy:vps:dry-run
```

## Структура документації

1. [Огляд проєкту](./01-project-overview.md)
   Що робить сайт, для кого він, які основні поняття використовуються.

2. [Архітектура і структура коду](./02-architecture.md)
   React/Vite, Firebase, режим local/firebase, структура папок, модель даних.

3. [Локальна розробка](./03-local-development.md)
   Встановлення, запуск, локальна адмінка, перевірки, Windows 11.

4. [Адмінка і керування контентом](./04-admin-content-management.md)
   Навчальні цикли, сесії, програма, фото, лекції, презентації, тести, статистика.

5. [Firebase і безпека](./05-firebase-security.md)
   Firebase Authentication, allowlist адміністраторів, Realtime Database rules.

6. [Google Drive, YouTube і Google Sheets](./06-google-integrations.md)
   Як підключаються медіа, API key, Apps Script для статистики.

7. [Перший деплой і VPS](./07-deployment-vps.md)
   Як сайт лежить на сервері, що саме завантажується, як працює deploy-скрипт.

8. [Оновлення сайту після доопрацювання](./08-update-workflow.md)
   Регулярний робочий процес: зміни локально → перевірка → dry-run → production.

9. [Бекап, rollback і troubleshooting](./09-backup-rollback-troubleshooting.md)
   Як відкотитися, що робити при помилках SSH, Firebase, build, кешу браузера.

10. [Карта старих Markdown-файлів](./10-legacy-markdown-map.md)
    Що було в старих `.md` і куди це перенесено.

## Головні принципи роботи

- Локальна розробка не змінює бойову Firebase: `npm run dev` працює з `localStorage`.
- Production-збірка працює з Firebase: `npm run build` бере режим із `.env.production`.
- На VPS завантажується тільки `dist/`.
- Адмінка у production захищена Firebase Authentication і allowlist у `admins/{uid}`.
- Firebase rules деплояться окремо й тільки тоді, коли змінювався `database.rules.json`.
- Перед кожним реальним деплоєм скрипт створює бекап старого `dist/` на сервері.
