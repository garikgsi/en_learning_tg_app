# English Learning Telegram App

Клиентское приложение для изучения английского языка. Стек: Vue 3, TypeScript,
Vuetify, Pinia, Vite и Capacitor.

## Требования

- Git;
- Node.js 22;
- npm;
- запущенный backend `en_learning_back`.

Для запуска в браузере Android SDK и Android Studio не нужны.

## Подготовка бэкенда

Фронтенд использует API по адресу <http://localhost:8088>. Перед запуском
поднимите backend из корня репозитория `en_learning_back`:

```bash
docker compose up -d
```

Убедитесь, что <http://localhost:8088/up> отвечает без ошибки. Полная инструкция
первого запуска находится в README бэкенда.

## Первый запуск

Клонируйте репозиторий, перейдите в его корень и установите зависимости:

```bash
npm install
```

Создайте локальный файл окружения:

```powershell
Copy-Item .env.example .env
```

Для Linux и macOS:

```bash
cp .env.example .env
```

Запустите dev-сервер:

```bash
npm run dev
```

Приложение откроется по адресу <http://localhost:3000>. Vite отслеживает
изменения файлов и автоматически обновляет страницу.

## Настройка API

Адрес API задаётся в `.env`:

```dotenv
VITE_API_BASE_URL=http://localhost:8088
```

Если backend запущен на другом хосте или порту, измените это значение и
перезапустите dev-сервер. Файл `.env` не следует добавлять в Git.

## Ежедневная работа

```bash
# Запустить dev-сервер
npm run dev

# Проверить типы и собрать production-версию
npm run build

# Только проверка TypeScript
npm run type-check

# Проверить и автоматически исправить ESLint-ошибки
npm run lint

# Локально открыть собранную версию
npm run preview
```

Production-сборка создаётся в каталоге `dist`.

## Тестирование

Компонентные тесты запускаются из корня фронтенд-проекта:

```bash
npm test
```

Тесты находятся рядом с компонентами в каталоге
`src/components/__tests__`. Общая настройка тестового окружения расположена
в `src/test/setup.ts`, а параметры Vitest — в секции `test` файла
`vite.config.mts`.

Тесты выполняются в `jsdom`. Компоненты Vuetify необходимо подключать через
`createVuetify()`, а сам пакет `vuetify` должен оставаться в
`test.server.deps.inline`, чтобы Vitest корректно обрабатывал стили
компонентов. Для проверки переходов между словами используются поддельные
таймеры Vitest, поскольку интерфейс показывает паузу перед следующим словом.

## Рекомендуемый порядок запуска всей среды

В первом терминале:

```bash
cd path/to/en_learning_back
docker compose up -d
docker compose logs -f
```

Во втором терминале:

```bash
cd path/to/en_learning_tg_app
npm run dev
```

После работы остановите backend:

```bash
docker compose down
```

## Android-разработка

Проект содержит Capacitor-конфигурацию для Android. Синхронизация web-сборки с
Android-проектом выполняется командой:

```bash
npm run android:sync
```

Для этой части разработки дополнительно потребуются Android Studio, Android SDK
и настроенный JDK. APK собирайте только в рамках подготовки релиза.

## Решение частых проблем

- Если `localhost:3000` занят, остановите использующий его процесс или временно
  запустите `npm run dev -- --port 3001`.
- Если запросы к API завершаются ошибкой соединения, проверьте
  `docker compose ps` в репозитории бэкенда и откройте
  <http://localhost:8088/up>.
- Если зависимости ведут себя нестабильно после переключения ветки, выполните
  `npm install` повторно.

## Production

Сборка и публикация web-приложения, настройка Nginx, обновление и откат описаны в
[DEPLOY.md](DEPLOY.md).
