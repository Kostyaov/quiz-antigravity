# Безпека

Цей файл залишено як короткий вхід у безпекову документацію.

Актуальна інструкція:

[docs/05-firebase-security.md](./docs/05-firebase-security.md)

Коротко:

- production-адмінка використовує Firebase Authentication;
- адміністратор має бути доданий у `admins/{uid}: true`;
- `database.rules.json` деплоїться окремо від VPS-деплою;
- production-паролі не можна додавати в код, `.env` або Markdown-файли.

Перевірка перед деплоєм:

```bash
npm run build
npm run security:check
```
