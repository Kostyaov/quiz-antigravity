# Карта старих Markdown-файлів

Перед створенням `docs/` у корені проєкту вже були Markdown-файли. Вони були корисними, але частково дублювали одне одного або описували старі етапи.

Цей файл пояснює, що з них куди перенесено.

## README.md

Тепер має бути коротким входом у проєкт і посилатися на `docs/`.

Актуальна основна документація:

```text
docs/README.md
```

## dok.md

Старий великий технічний опис.

Актуальна заміна:

- [Огляд проєкту](./01-project-overview.md)
- [Архітектура і структура коду](./02-architecture.md)
- [Адмінка і керування контентом](./04-admin-content-management.md)

## quiz_antigravity_all.md

Старий технічний паспорт.

Актуальна заміна:

- [Огляд проєкту](./01-project-overview.md)
- [Архітектура і структура коду](./02-architecture.md)

## vps_deploy.md

Стара/попередня інструкція з деплою на VPS. Її зміст перенесено й розділено на:

- [Перший деплой і VPS](./07-deployment-vps.md)
- [Оновлення сайту після доопрацювання](./08-update-workflow.md)
- [Бекап, rollback і troubleshooting](./09-backup-rollback-troubleshooting.md)

## install_win11.md

Інструкція для Windows перенесена в:

- [Локальна розробка](./03-local-development.md)

## SECURITY.md

Безпекові налаштування перенесені й розширені в:

- [Firebase і безпека](./05-firebase-security.md)

`SECURITY.md` можна залишати як короткий сумісний файл для швидкого входу.

## Sheets-Readmy.md

Старий приклад Google Apps Script.

Актуальна заміна:

- [Google Drive, YouTube і Google Sheets](./06-google-integrations.md)

## my_firebase_setting.md

Локальна нотатка з Firebase snippet. Файл доданий у `.gitignore`, тому його краще не використовувати як документацію.

Актуальна заміна:

- [Firebase і безпека](./05-firebase-security.md)
