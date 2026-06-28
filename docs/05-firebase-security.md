# Firebase і безпека

Production-сайт використовує Firebase Realtime Database і Firebase Authentication.

## Firebase-проєкт

Поточний проєкт:

```text
quiz-ames-ups
```

Це також вказано у:

```text
.firebaserc
```

## Web config

Firebase web config знаходиться у `src/firebase.js`.

Firebase web `apiKey` не є серверним секретом, але все одно не варто розкидати його по документах без потреби. Якщо проєкт переноситься в інший Firebase, треба оновити `firebaseConfig` у `src/firebase.js`.

Важливо: production-пароль адміністратора ніколи не можна додавати у Vite env або код. Усе, що починається з `VITE_`, потрапляє в браузерний bundle.

## Режими середовища

`.env.development`:

```text
VITE_DATA_MODE=local
```

`.env.production`:

```text
VITE_DATA_MODE=firebase
```

## Production-логін

У production адмін входить через Firebase Authentication:

1. Firebase Console → Authentication → Sign-in method.
2. Увімкнути Email/Password.
3. Firebase Console → Authentication → Users.
4. Створити користувача адміністратора.
5. Скопіювати UID.
6. Додати UID у Realtime Database:

```json
{
  "admins": {
    "FIREBASE_AUTH_UID": true
  }
}
```

Тільки користувачі з `admins/{uid}: true` мають адмінські права.

## Authorized domains

У Firebase Authentication → Settings → Authorized domains має бути:

```text
uames.pp.ua
```

Для локальної розробки Firebase зазвичай уже дозволяє `localhost`.

## Database rules

Правила лежать у:

```text
database.rules.json
```

Загальна логіка:

- корінь бази закритий;
- `config` читається публічно, змінюється тільки адміністратором;
- `quizzes` читаються публічно, змінюються тільки адміністратором;
- `results` читаються тільки адміністратором;
- новий результат тесту може створити неавторизований учасник;
- створений результат не можна змінити або видалити з публічного доступу;
- `admins` не можна редагувати з клієнтського застосунку.

## Коли деплоїти rules

Звичайний frontend-деплой не змінює Firebase rules.

Rules деплояться тільки якщо змінювався:

```text
database.rules.json
```

Перед цим бажано експортувати резервну копію Realtime Database у Firebase Console.

Команда:

```bash
firebase login
firebase use quiz-ames-ups
firebase deploy --only database
```

Не запускай цю команду “на всяк випадок”. Правила бази — окремий чутливий шар.

## Локальна перевірка безпеки

Після build:

```bash
npm run security:check
```

Скрипт перевіряє:

- що root `.read` і `.write` закриті;
- що запис у `config` вимагає admin allowlist;
- що читання `results` вимагає admin allowlist;
- що публічний запис результату є create-only;
- що локальний пароль `admin123` не потрапив у production bundle.

## Помилка `auth/configuration-not-found`

Якщо на `/admin` видно:

```text
Firebase: Error (auth/configuration-not-found)
```

зазвичай це означає, що для Firebase-проєкту не ввімкнено Email/Password або не завершено налаштування Authentication.

Перевір:

1. Authentication → Sign-in method → Email/Password.
2. Authentication → Users → адмін існує.
3. Realtime Database → `admins/{uid}: true`.
4. Authentication → Settings → Authorized domains → `uames.pp.ua`.

## Рекомендації

- Увімкнути password policy у Firebase Authentication.
- Увімкнути email enumeration protection, якщо доступно.
- Не додавати форму реєстрації адміністраторів у frontend.
- Обмежити Google API key за HTTP referrers.
- Не зберігати production-паролі в `.md`, `.env`, JS або screenshot.
