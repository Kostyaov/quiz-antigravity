# Quiz Antigravity (v3.0.0) — Professional Edition

Версія 3.0 — Максимальна функціональність, інтеграція з Google API та професійний деплой.

## Основні можливості (v3.0)
- **Custom Photo Gallery**: Власна галерея зображень із Google Drive API. Швидке завантаження мініатюр та зручний перегляд у повний розмір.
- **YouTube Video Gallery**: Автоматичне вбудовування плейлистів та окремих відео з YouTube за допомогою API.
- **Advanced Admin Panel**:
    - Пряме завантаження JSON-файлів тестів до Firebase.
    - Управління структурою Сезонів та Сесій.
    - Налаштування API ключів безпосередньо в інтерфейсі.
- **Robust Statistics**: Автоматичне збереження результатів у Firebase Realtime Database та синхронізація з Google Sheets із дедуплікацією записів.
- **Professional Deployment**: Повна підтримка деплою на VPS (Nginx, PM2) та статичне хостингу (Vercel/Netlify).
- **Glassmorphism UI v3**: Оновлений "скляний" дизайн із покращеною видимістю тексту в світлій темі та повною мобільною адаптацією.

## Технологічний стек

- **Frontend**: React 19, Vite, Lucide React, React Router DOM.
- **Backend/DB**: Firebase Realtime Database.
- **Integration**: Google Drive API, YouTube Data API v3, Google Apps Script.
- **Hosting**: Статичний (Vite build) або VPS.

## Як почати роботу

### Локально
1. Встановіть залежності: `npm install`
2. Запустіть сервер розробки: `npm run dev`

### Деплой на VPS
Детальна інструкція знаходиться у файлі [vps_deploy.md](./vps_deploy.md).

## Документація

- [dok.md](./dok.md) — Детальна технічна документація та інструкція з відновлення.
- [quiz_antigravity_all.md](./quiz_antigravity_all.md) — Повний технічний паспорт проекту.
- [vps_deploy.md](./vps_deploy.md) — Посібник з розгортання на сервері.
- [install_win11.md](./install_win11.md) — Інструкція з налаштування оточення на Windows.

---
**Stable Version Tag:** `v3.0-stable`
