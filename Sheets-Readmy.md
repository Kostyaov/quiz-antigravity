**Приклад скрипту для сторінки, коли тести окремо сесій записуються на кожний аркуш:
```javascript
/**
 * Скрипт для збору результатів квізу
 * Приймає POST запит і записує дані у вкладку, відповідну назві сесії
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetName = data.sessionName || "Загальне"; // Назва вкладки = назва сесії
    
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Якщо вкладки з такою назвою немає — створюємо її
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["Дата", "Користувач", "Тест", "Бал (%)", "Правильно", "Всього"]);
      sheet.setFrozenRows(1);
    }
    
    // Додаємо новий рядок з даними
    sheet.appendRow([
      new Date().toLocaleString('uk-UA'),
      data.userName || "Анонім",
      data.testName,
      data.score + "%",
      data.correctAnswers,
      data.totalQuestions
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```
