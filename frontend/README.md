# DocGen — React Frontend

React приложение для генерации документов из Markdown с поддержкой изображений и кода.

## Установка

```bash
npm install
```

## Разработка

```bash
npm run dev
```

Откройте [http://localhost:5173](http://localhost:5173) в браузере.

## Сборка

```bash
npm run build
```

## Структура проекта

```
src/
├── main.jsx                 # Точка входа
├── App.jsx                  # Главный компонент
├── index.css               # Глобальные стили
└── components/
    ├── Header.jsx          # Заголовок и навигация
    ├── TemplatesSection.jsx # Раздел шаблонов
    ├── TemplatesList.jsx    # Список шаблонов
    ├── UploadForm.jsx       # Форма загрузки шаблонов
    ├── GenerationSection.jsx # Раздел генерации
    ├── RemapModal.jsx       # Модальное окно переквания путей
    └── AdvancedOptions.jsx  # Дополнительные параметры
```

## API

Приложение взаимодействует с бэкенд API по адресу `/api`:

- `GET /api/templates` - Получить список шаблонов
- `POST /api/templates` - Загрузить новый шаблон
- `DELETE /api/templates/{id}` - Удалить шаблон
- `GET /api/templates/{id}/download` - Скачать шаблон
- `POST /api/generate` - Сгенерировать документ
