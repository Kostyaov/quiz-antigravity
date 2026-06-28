# Архітектура і структура коду

Проєкт — це React/Vite застосунок, який у production працює як статичний сайт. Серверна частина для даних — Firebase Realtime Database. Додаткові інтеграції: Google Drive, YouTube Data API та Google Apps Script.

## Технологічний стек

- React 19
- Vite
- React Router DOM
- Lucide React
- Firebase Realtime Database
- Firebase Authentication
- Google Drive API
- YouTube Data API v3
- Google Apps Script для синхронізації статистики з Google Sheets

## Структура проєкту

```text
.
├── docs/                     # Актуальна документація
├── public/
│   ├── quiz.json             # Приклад/старий локальний тест
│   └── tests/                # Локальні JSON-тести
├── scripts/
│   ├── check-security.mjs    # Перевірки безпеки production bundle
│   └── deploy-vps.sh         # Деплой на VPS
├── src/
│   ├── components/
│   │   ├── PhotoGallery.jsx
│   │   ├── QuizRunner.jsx
│   │   ├── StatisticsView.jsx
│   │   └── YoutubeGallery.jsx
│   ├── pages/
│   │   ├── AdminPage.jsx
│   │   └── MainPage.jsx
│   ├── adminAuth.js
│   ├── defaultConfig.js
│   ├── firebase.js
│   ├── seasonUtils.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── database.rules.json
├── firebase.json
├── package.json
└── vite.config.js
```

## Роутинг

Роути задаються у `src/App.jsx`:

```text
/       → MainPage
/admin  → AdminPage
```

Адмінка завантажується lazy-load через `React.lazy`, щоб основна сторінка не тягнула адмінський код до першої потреби.

## Режими даних

Логіка перемикання режимів знаходиться у `src/firebase.js`.

```text
VITE_DATA_MODE=local     → localStorage
VITE_DATA_MODE=firebase  → Firebase Realtime Database
```

### Local mode

Використовується під час `npm run dev`.

Дані зберігаються у браузері:

- `app_config`
- `quizzes`
- `test_results`
- `quiz_admin_config_backups`

Цей режим безпечний для експериментів, бо не чіпає production Firebase.

### Firebase mode

Використовується у production-збірці.

Дані читаються і записуються в Firebase Realtime Database. Адмінські дії дозволені тільки користувачам, UID яких є в `admins/{uid}`.

## Модель даних Firebase

Спрощена структура:

```json
{
  "admins": {
    "FIREBASE_AUTH_UID": true
  },
  "config": {
    "currentSeason": "12",
    "googleDriveApiKey": "...",
    "googleScriptUrl": "...",
    "seasons": {
      "12": {
        "title": "УМШ",
        "seasonNumber": 12,
        "sortOrder": 12,
        "sessions": {
          "session1": {
            "program": "",
            "photos": "",
            "lectures": "",
            "presentations": "",
            "tests": []
          }
        }
      }
    }
  },
  "quizzes": {
    "QUIZ_ID": {
      "meta": {},
      "quiz": []
    }
  },
  "results": {
    "RESULT_ID": {
      "testId": "...",
      "testName": "...",
      "sessionName": "Сесія 1",
      "seasonId": "12",
      "seasonName": "УМШ 12",
      "userName": "...",
      "score": 85,
      "correctAnswers": 17,
      "totalQuestions": 20,
      "timestamp": "2026-06-23T..."
    }
  }
}
```

## Навчальні цикли

Допоміжна логіка — `src/seasonUtils.js`.

Важливі функції:

- `getSeasonLabel()` — формує підпис без слова `Сезон`, наприклад `УМШ 12`;
- `getSortedSeasons()` — сортує цикли;
- `createSeason()` — створює новий цикл;
- `createEmptySessions()` — створює три порожні сесії.

Старі числові ключі типу `"12"` залишаються сумісними. Нові не-стандартні події можуть мати ID виду:

```text
season-UUID
```

## Головна сторінка

`src/pages/MainPage.jsx` відповідає за:

- вибір навчального циклу;
- вибір сесії;
- ліве меню розділів;
- тему dark/light;
- mobile menu;
- показ програми, фото, лекцій, презентацій, тестів і статистики.

Важкі компоненти завантажуються lazy-load:

- `QuizRunner`;
- `PhotoGallery`;
- `YoutubeGallery`;
- `StatisticsView`.

## Адмінка

`src/pages/AdminPage.jsx` відповідає за:

- логін адміністратора;
- редагування конфігурації;
- додавання навчальних циклів;
- редагування сесій;
- завантаження тестів у Firebase/localStorage;
- експорт та імпорт JSON-конфігурації;
- локальні бекапи конфігурації;
- попередження про незбережені зміни.

## Тести

`src/components/QuizRunner.jsx` підтримує:

- локальні файли з `public/tests/`;
- повні URL;
- Google Drive file links;
- Firebase-тести з префіксом `fb:`.

Формат тесту:

```json
{
  "meta": {
    "title": "Назва тесту"
  },
  "quiz": [
    {
      "question": "Текст питання",
      "answerOptions": [
        {
          "text": "Варіант відповіді",
          "isCorrect": true,
          "rationale": "Пояснення"
        }
      ],
      "hint": "Підказка"
    }
  ]
}
```

## Статистика

`src/components/StatisticsView.jsx`:

- читає `results`;
- фільтрує результати за поточним навчальним циклом і сесією;
- прибирає дублікати;
- показує середній, мінімальний і максимальний бал;
- експортує CSV з BOM і `sep=;`, щоб файл нормально відкривався в Excel.
