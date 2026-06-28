# Бекап, rollback і troubleshooting

Цей документ описує, що робити, якщо деплой або production-сайт поводиться не так, як очікувалося.

## Де зберігаються бекапи

Перед кожним реальним деплоєм скрипт створює архів старого `dist/` на сервері:

```text
/root/quiz-app-backups/
```

Формат назви:

```text
dist-YYYYMMDD-HHMMSS.tar.gz
```

## Подивитися список бекапів

```bash
ssh root@198.46.175.223 "ls -lh /root/quiz-app-backups"
```

## Rollback

Після успішного деплою скрипт показує готову команду rollback, наприклад:

```bash
ssh root@198.46.175.223 "tar -C '/var/www/quiz-app' -xzf '/root/quiz-app-backups/dist-20260623-192700.tar.gz'"
```

Після rollback перевір:

```bash
curl -I https://uames.pp.ua/
curl -I https://uames.pp.ua/admin
```

Або просто відкрий сайт у браузері.

## `Permission denied` при SSH

Перевір:

```bash
ssh root@198.46.175.223 hostname
```

Якщо доступу немає, треба додати публічний ключ у:

```text
/root/.ssh/authorized_keys
```

Важливо: додається саме публічний ключ, наприклад `~/.ssh/id_ed25519.pub`. Приватний ключ нікому не передавати.

## `npm run build` падає

Це локальна помилка. Деплой не виконувати.

Зазвичай треба перевірити:

- синтаксис JS/JSX;
- імпорти файлів;
- ESLint-помилки;
- чи існує файл, який імпортується.

## `npm run security:check` падає

Скрипт перевіряє security-інваріанти.

Типові причини:

- не виконано `npm run build` перед `security:check`;
- у production bundle випадково потрапив локальний пароль;
- правила Firebase стали надто відкритими;
- `dist/` відсутній.

## Сайт відкривається, але адмінка не пускає

Перевір:

1. Firebase Authentication → Email/Password увімкнено.
2. Користувач адміністратора створений.
3. UID доданий у `admins/{uid}: true`.
4. `uames.pp.ua` додано в Authorized domains.
5. Ти вводиш production email/password, а не локальні `admin@local.test / admin123`.

## Помилка `auth/configuration-not-found`

Майже завжди причина в Firebase Authentication:

- Email/Password не ввімкнений;
- Firebase Auth не налаштований для цього проєкту;
- домен не дозволений.

Дивись [Firebase і безпека](./05-firebase-security.md).

## Сайт не оновився після деплою

Спробуй:

- hard refresh;
- приватне вікно;
- інший браузер;
- перевірити, що `npm run deploy:vps` завершився без помилок;
- перевірити головний JS asset:

```bash
curl -I https://uames.pp.ua/
```

Скрипт деплою також сам перевіряє головний `assets/index-*.js`.

## Фото не показуються

Перевір:

- папка Google Drive доступна за посиланням;
- Folder ID правильний;
- Google Drive API увімкнений;
- API key дозволяє `https://uames.pp.ua/*`.

## YouTube не показує playlist

Перевір:

- URL містить `list=...`;
- YouTube Data API v3 увімкнений;
- API key має доступ до цього API.

## Результати тесту не з’являються

Спочатку перевір Firebase `results/`.

Якщо у Firebase результат є, але немає в Google Sheets — проблема в Apps Script або `googleScriptUrl`.

Якщо у Firebase результату немає:

- перевір `database.rules.json`;
- перевір console браузера;
- перевір, що тест має коректний `seasonId`, `seasonName`, `sessionName`.

## CSV не відкривається нормально в Excel

Поточний експорт додає:

- UTF-8 BOM;
- `sep=;`;
- розділювач `;`.

Якщо Excel усе одно відкриває дивно, спробуй:

- Data → From Text/CSV;
- обрати UTF-8;
- delimiter `;`.

## Локальні тестові дані заважають

Для localhost очисти Local Storage:

```text
app_config
quizzes
test_results
quiz_admin_config_backups
quiz_local_admin_session
```
