# Развёртывание English Learning Telegram App

Фронтенд собирается в статические файлы каталога `dist`. Рекомендуемая схема:
отдавать их через Nginx/CDN с того же HTTPS-домена, на котором `/api`
проксируется в `en_learning_back`.

При production-сборке без `VITE_API_BASE_URL` приложение использует `/`, поэтому
API-запросы вида `/api/v1/...` автоматически уходят на текущий домен. Такая
схема не требует отдельной CORS-конфигурации.

## Требования

- Node.js 22 и npm на CI-сервере или машине сборки;
- веб-сервер либо static hosting;
- настроенный production backend;
- домен и HTTPS-сертификат.

Node.js не требуется на сервере, если сборка выполняется в CI/CD и на сервер
передаётся только содержимое `dist`.

## Сборка

Получите конкретный release tag или commit и установите зависимости строго по
lock-файлу:

```bash
git clone <repository-url> en_learning_tg_app
cd en_learning_tg_app
git checkout <release-tag-or-commit>
npm ci
```

Для рекомендуемого развёртывания на одном домене создайте `.env.production`:

```dotenv
VITE_API_BASE_URL=/
```

Если API размещён на отдельном домене, укажите полный HTTPS-адрес:

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

В этом случае backend и reverse proxy должны явно разрешать origin фронтенда,
методы и заголовок `Authorization`.

Выполните проверку типов и production-сборку:

```bash
npm run type-check
npm run build
```

Готовый артефакт находится в `dist`. Переменные `VITE_*` встраиваются в
JavaScript во время сборки, поэтому не помещайте в них секреты. После изменения
адреса API приложение нужно пересобрать.

## Публикация через Nginx

Скопируйте содержимое `dist` в новый release-каталог, например
`/var/www/en-learning/releases/<release-id>`, и атомарно переключите симлинк
`/var/www/en-learning/current`.

Пример конфигурации Nginx:

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    root /var/www/en-learning/current;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location = /up {
        proxy_pass http://127.0.0.1:8088/up;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location ~* \.(?:css|js|woff2?|png|jpg|jpeg|gif|svg|ico)$ {
        expires 7d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }
}
```

Замените `example.com` и пути к сертификатам. Правило
`try_files ... /index.html` обязательно для прямого открытия маршрутов SPA.
Не кэшируйте `index.html` надолго: он должен быстро подхватывать новые имена
versioned-ассетов.

Проверьте и примените конфигурацию:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Обновление версии

1. Соберите `dist` из конкретного tag/commit.
2. Загрузите его в новый release-каталог.
3. Переключите `current` на новый каталог.
4. Проверьте главную страницу, прямой SPA-маршрут и API.
5. Удаляйте старые release-каталоги только после успешной проверки.

Пример smoke-проверок:

```bash
curl --fail https://example.com/
curl --fail https://example.com/up
```

Также вручную проверьте регистрацию/вход, обновление токена и словарь в браузере.

## Откат

Верните симлинк `current` на предыдущий release-каталог и перезагрузите Nginx.
Если `VITE_API_BASE_URL` изменился, откатывайте весь соответствующий артефакт
`dist`, а не отдельные файлы.

## Android

Web-развёртывание и Android-релиз — разные процессы. Для Android production API
должен быть доступен по публичному HTTPS-адресу; значение `/` внутри нативного
приложения не укажет на backend.

Перед Android-релизом задайте полный `VITE_API_BASE_URL`, соберите web-часть и
синхронизируйте Capacitor:

```bash
npm run android:sync
```

Подписанный APK/AAB, keystore, versionCode/versionName и публикация в магазине
должны настраиваться отдельным release-процессом. Не храните keystore и его
пароли в Git.

### Прямое обновление APK

Приложение проверяет `GET /api/v1/app-updates/latest` после входа. Для каждой
новой версии увеличьте `versionCode`, соберите и подпишите APK тем же ключом,
опубликуйте файл по HTTPS и настройте backend:

```dotenv
APP_UPDATE_VERSION_CODE=8
APP_UPDATE_VERSION_NAME=0.1.0-rc.8
APP_UPDATE_APK_URL=https://downloads.example.com/en-learning-v0.1.0-rc.8.apk
APP_UPDATE_SHA256=<64 hex characters>
APP_UPDATE_SIZE=<size in bytes>
APP_UPDATE_RELEASED_AT=2026-08-17T08:00:00Z
APP_UPDATE_RELEASE_NOTES="Исправления и новые упражнения"
APP_UPDATE_MANDATORY=false
```

SHA-256 и размер вычисляются только после финальной подписи APK. Android один
раз попросит пользователя разрешить приложению установку из этого источника,
а затем покажет системное подтверждение обновления. APK с другой подписью или
меньшим/equal `versionCode` Android поверх установленного приложения не примет.

IndexedDB обновляется последовательными миграциями в `src/api/indexedDb.ts`.
При изменении схемы добавляйте новую миграцию и увеличивайте
`indexedDbDatabaseVersion`; существующие упражнения и очередь не удаляйте без
отдельной миграции данных. Новые упражнения с backend подмешиваются в локальный
кэш при входе и при восстановлении соединения.

## Проверка после релиза

- сайт открывается только по HTTPS;
- прямое открытие внутренних SPA-маршрутов не возвращает `404`;
- запросы `/api/v1/...` доходят до backend;
- в консоли браузера нет CORS и mixed-content ошибок;
- обновление страницы получает актуальный `index.html`;
- секреты отсутствуют в `.env.production` и собранных JavaScript-файлах.
