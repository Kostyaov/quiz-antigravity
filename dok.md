# Документація Проекту "Quiz Antigravity" (v3.0)

Цей файл містить повну технічну інформацію про архітектуру v3.0, принципи роботи нових модулів та інструкцію з розгортання та адміністрування.

## 1. Огляд Проекту v3.0 "Professional Edition"

Це розширена платформа для управління навчальним контентом та проведення інтерактивного тестування з глибокою інтеграцією сервісів Google та Firebase.

**Ключові оновлення v3.0:**
- **Custom Photo/YouTube Galleries**: Повна автоматизація відображення медіа за допомогою API ключів.
- **Firebase Quiz Storage**: Адмін-панель дозволяє завантажувати JSON-тести безпосередньо в базу даних (`quizzes/`).
- **Deduplication System**: Розумна фільтрація результатів статистики для запобігання дублюванню записів при повторних відправках.
- **Theme Visibility Fix**: Покращена контрастність та читабельність тексту в світлій темі.

## 2. Технологічний Стек

- **Frontend**: React 19, Vite.
- **State/Routing**: `react-router-dom` v7, React Hooks (`useState`, `useEffect`, `useRef`).
- **Icons**: `lucide-react`.
- **Backend**: Firebase Realtime Database (RTDB).
- **External Integration**: 
  - **Google Drive API**: Генерирування мініатюр (`/thumbnail?id=...&sz=...`) та прямих посилань.
  - **YouTube Data API v3**: Отримання списку відео з плейлистів.
  - **Google Apps Script**: POST-запити для синхронізації з Google Sheets.

## 3. Технічна Архітектура

### 3.1. Структура Даних (Firebase RTDB)
```json
{
  "config": {
    "currentSeason": "12",
    "googleDriveApiKey": "AIza...",
    "googleScriptUrl": "https://script.google.com/...",
    "seasons": {
      "12": {
        "sessions": {
          "session1": {
            "photos": "FOLDER_ID",
            "lectures": "PLAYLIST_URL",
            "tests": [
              { "id": "uuid", "name": "Test Name", "url": "fb:QUIZ_ID" }
            ]
          }
        }
      }
    }
  },
  "quizzes": {
    "QUIZ_ID": { "meta": { ... }, "quiz": [ ... ] }
  },
  "results": {
    "unique_key": { "userName": "...", "score": 85, "timestamp": "...", "testId": "..." }
  }
}
```

### 3.2. Робота з Тестами (QuizRunner)
Система підтримує два типи джерел тестів:
1. **Зовнішні/Локальні**: URL (напр. `/tests/quiz.json` або пряме посилання на Drive).
2. **Внутрішні (Firebase)**: Префікс `fb:` вказує системі, що контент потрібно отримати з вузла `quizzes/` через функцію `getQuizContent`.

**CORS Handling**: При завантаженні з Google Drive, якщо прямий запит блокується браузером, `QuizRunner` автоматично використовує проксі `api.allorigins.win`.

### 3.3. Медіа-Галереї (v3.0)
- **Photos**: Компонент `PhotoGallery` використовує `fetch` до Drive API для отримання списку ID зображень. Відображення реалізовано через мініатюри з параметром `sz=w260` для швидкості.
- **YouTube**: Компонент `YoutubeGallery` парсить `listId` з URL та завантажує метадані відео (назви, thumbnails) через YouTube API.

## 4. Адміністрування (Admin Panel)

Додаток містить захищену адмін-панель за адресою `/admin`.
- **Пароль за замовчуванням**: `admin123` (визначається в `src/firebase.js`).
- **Створення Сезонів**: Динамічне розширення структури.
- **Завантаження Тестів**: Функція `handleAddTest` читає локальний JSON файл та завантажує його в Firebase, генеруючи унікальний `fb:ID`.

## 5. Інструкція з Відновлення та Налаштування

### Крок 1: Встановлення
```bash
npm install
```

### Крок 2: Налаштування Firebase
Відкрийте `src/firebase.js` та замініть `firebaseConfig` на ваші актуальні дані з Firebase Console. Переконайтеся, що Realtime Database активована.

### Крок 3: Налаштування API Ключів
1. Запустіть додаток (`npm run dev`).
2. Перейдіть в Адмін-панель.
3. Введіть **Google Drive API Key** (необхідний для фото та відео галерей).
4. Введіть **Google Script URL** для автоматичного збору статистики в таблицю.

### Крок 4: Збірка (Build)
```bash
npm run build
```
Вміст папки `dist` готовий до розгортання.

---

## 6. Вирішення проблем (Troubleshooting)

- **Текст не видно в світлій темі**: Перевірте `src/index.css`. В v3.0 значення `--text-primary` та `--text-secondary` перепризначені в блоці `:root[data-theme="light"]`.
- **Помилка завантаження тесту (CORS)**: Рекомендовано завантажувати тести через Адмін-панель (стають `fb:` тестами) — це гарантує 100% завантаження без проблем з CORS.
- **Галерея не показує фото**: Переконайтеся, що папка на Google Drive має доступ "Усі користувачі, які мають посилання" -> "Переглядач", і що API ключ правильний.
