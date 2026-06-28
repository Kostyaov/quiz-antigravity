# Google Drive, YouTube і Google Sheets

Проєкт використовує кілька сервісів Google:

- Google Drive для програми, фото і презентацій;
- YouTube для лекцій;
- Google Apps Script + Google Sheets для додаткової таблиці результатів.

## Google API key

В адмінці є поле для API key. Зараз цей ключ використовується для:

- Google Drive API;
- YouTube Data API v3.

У Google Cloud Console для ключа треба увімкнути потрібні API й бажано обмежити ключ:

- HTTP referrers:
  - `https://uames.pp.ua/*`
  - `http://localhost:*` тільки якщо треба локальне тестування з реальним API;
- API restrictions:
  - Google Drive API;
  - YouTube Data API v3.

## Google Drive: фото

Для фото в адмінці можна вставляти:

- Folder ID;
- або повне посилання на папку.

Приклад папки:

```text
https://drive.google.com/drive/folders/FOLDER_ID
```

Папка має бути доступна для перегляду за посиланням.

Якщо API key налаштований, `PhotoGallery` отримує список файлів через Drive API і показує оптимізовані мініатюри.

## Google Drive: презентації

Для презентацій використовується Google Drive embedded folder.

Працює із:

```text
FOLDER_ID
```

або:

```text
https://drive.google.com/drive/folders/FOLDER_ID
```

## Google Drive: програма

Для програми можна використовувати PDF або Google Drive file link.

Якщо посилання має формат:

```text
https://drive.google.com/file/d/FILE_ID/view?usp=sharing
```

сайт пробує вбудувати його як preview.

## YouTube: лекції

Поле `Лекції` приймає:

- playlist URL;
- або URL окремого відео.

Playlist:

```text
https://www.youtube.com/playlist?list=PLAYLIST_ID
```

Окреме відео:

```text
https://www.youtube.com/watch?v=VIDEO_ID
```

Якщо є playlist і API key, сайт показує галерею відео з назвами й thumbnails. Якщо API key немає, використовується стандартний YouTube embed.

## Google Sheets: для чого

Основне джерело статистики — Firebase `results/`.

Google Sheets — це додатковий канал, щоб мати результати в таблиці. Якщо `googleScriptUrl` не задано, сайт усе одно зберігає результати у Firebase.

## Apps Script

У Google Sheets:

1. Extensions → Apps Script.
2. Вставити скрипт.
3. Deploy → New deployment.
4. Type: Web app.
5. Execute as: Me.
6. Who has access: Anyone.
7. Скопіювати Web app URL.
8. Вставити URL в адмінці в поле Google Script URL.

Приклад скрипту:

```javascript
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sessionName || "Загальне";

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "Дата",
        "Навчальний цикл",
        "Сесія",
        "Користувач",
        "Тест",
        "Бал (%)",
        "Правильно",
        "Всього"
      ]);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      new Date().toLocaleString("uk-UA"),
      data.seasonName || "Без навчального циклу",
      data.sessionLabel || "Загальна",
      data.userName || "Анонім",
      data.testName || "Без назви",
      `${data.score}%`,
      data.correctAnswers,
      data.totalQuestions
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

## Типові проблеми

### Фото не показуються

Перевір:

- папка доступна за посиланням;
- Folder ID правильний;
- Google Drive API увімкнений;
- API key не заблокований referrer restrictions.

### YouTube playlist не показується як галерея

Перевір:

- YouTube Data API v3 увімкнений;
- playlist URL містить `list=...`;
- ключ дозволений для домену.

### Google Sheets не поповнюється

Перевір:

- Web app URL вставлений в адмінці;
- Apps Script deployed саме як Web app;
- доступ `Anyone`;
- у таблиці немає конфлікту з назвою аркуша;
- результати все одно мають бути у Firebase `results/`.
