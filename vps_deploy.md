# Посібник з деплою на VPS (v3.0)

Ця інструкція допоможе вам розгорнути проект Quiz Antigravity на власному сервері (Ubuntu/Debian) з використанням Nginx.

## 1. Підготовка сервера

### Оновлення пакетів
```bash
sudo apt update && sudo apt upgrade -y
```

### Встановлення Node.js (через NVM)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
```

### Встановлення Nginx
```bash
sudo apt install nginx -y
```

## 2. Клонування та збірка проекту

### Клонування
```bash
cd /var/www
sudo git clone https://github.com/ВАШ_ЛОГІН/quiz-antigravity.git
sudo chown -R $USER:$USER /var/www/quiz-antigravity
```

### Збірка
```bash
cd /var/www/quiz-antigravity
npm install
npm run build
```
Після цього у вас з'явиться папка `dist/`.

## 3. Налаштування Nginx

Створіть файл конфігурації:
```bash
sudo nano /etc/nginx/sites-available/quiz-antigravity
```

Вставте наступний конфіг (замініть `your-domain.com` на ваш домен або IP):
```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/quiz-antigravity/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Кешування статичних файлів
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|json)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Увімкніть конфіг та перезапустіть Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/quiz-antigravity /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 4. Оновлення проекту (Cleaning up old versions)

Якщо ви хочете оновити проект до нової версії:

1. Перейдіть у папку проекту: `cd /var/www/quiz-antigravity`
2. Отримайте зміни з Git: `git pull origin main`
3. Видаліть стару збірку: `rm -rf dist`
4. Встановіть нові залежності (якщо є): `npm install`
5. Зберіть нову версію: `npm run build`
6. Nginx автоматично почне роздавати нові файли.

## 5. Налаштування SSL (HTTPS) — Рекомендовано

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---
**Порада:** Якщо у вас виникають проблеми з правами доступу, переконайтеся, що користувач `www-data` має доступ до папки `/var/www/quiz-antigravity/dist`.
