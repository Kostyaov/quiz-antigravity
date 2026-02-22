# Інструкція з налаштування оточення (Windows 11)

Цей проект базується на **Node.js** та **Git**. Виконайте ці кроки для підготовки вашого ПК:

## 1. Встановлення Node.js

1. Перейдіть на [nodejs.org](https://nodejs.org/).
2. Виберіть версію **LTS** (Recommended).
3. Запустіть інсталятор. Переконайтеся, що опція "Add to PATH" увімкнена.

## 2. Встановлення та налаштування Git

1. Завантажте Git з [git-scm.com](https://git-scm.com/).
2. Після встановлення відкрийте термінал і налаштуйте ваше ім'я та пошту (це необхідно для комітів):
```powershell
git config --global user.name "Ваше Ім'я"
git config --global user.email "ваш@email.com"
```

## 3. Встановлення залежностей проекту

Перейдіть до папки проекту в терміналі (наприклад):
```powershell
cd f:\Programming\quiz-antigravity
```
Виконайте команду:
```powershell
npm install
```

## 4. Запуск проекту

```powershell
npm run dev
```
Додаток буде доступний за адресою `http://localhost:5173`.

---

## Виправлення помилки "scripts is disabled"

Якщо `npm` не запускається через політику безпеки PowerShell, виконайте:

1. Відкрийте **PowerShell від імені адміністратора**.
2. Введіть:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Дайте відповідь **Y** та перезапустіть термінал.
