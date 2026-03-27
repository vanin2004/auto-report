
# Техническое задание

## Web-приложение генерации документов по шаблонам

---

# 1. Назначение системы

Разработать web-приложение для генерации документов на основе пользовательских шаблонов.

Система должна позволять:

* загружать шаблоны документов в формате **DOCX**
* вводить или загружать **Markdown-данные**
* применять стили шаблона к Markdown-контенту
* генерировать документы:

```
DOCX
PDF
```

с сохранением оформления шаблона (шрифты, отступы, заголовки, таблицы и т.д.).
важно уделить внимание формулам, спискам и таблицам, так как они часто ломаются при конвертации.

---

# 2. Основной сценарий работы

1. Пользователь открывает web-интерфейс.
2. Выбирает шаблон документа из списка.
3. Вводит данные в формате Markdown.
4. Выбирает формат результата:

```
DOCX
PDF
```

5. Система генерирует документ.
6. Пользователь скачивает готовый файл.

---

# 3. Архитектура системы

## Общая схема

```
Client (HTML/JS)
        │
        │ HTTP
        ▼
Nginx (reverse proxy)
        │
        ▼
FastAPI backend
        │
        ├── Pandoc document pipeline
        │
        ├── SQLite metadata DB
        │
        └── Template storage (filesystem)
```

---

# 4. Технологический стек

## Backend

* Python 3.12+
* FastAPI
* Pandoc (бинарник)
* pypandoc
* Pydantic
* SQLAlchemy
* Uvicorn

---

## Infrastructure

* Docker
* Docker Compose
* Nginx
* LaTeX (TeX Live — для генерации PDF с формулами)

---

## Frontend

* HTML
* CSS
* JavaScript

---

## Database

```
SQLite
```

хранит:

* список шаблонов
* метаданные шаблонов

---

## Storage

Локальное файловое хранилище:
сгенерированные документы и входящие md не хранятся!

```
/data/templates
```

---

# 5. Pipeline генерации документов

## DOCX генерация

```
Markdown
   │
   ▼
Pandoc
   │
   ├── reference-docx = template.docx
   │
   ▼
DOCX
```

Pandoc использует стили из reference DOCX:

* Heading styles
* Paragraph styles
* Table styles
* margins
* headers/footers ([Pandoc][1])

---

## PDF генерация

```
Markdown
   │
   ▼
pypandoc
   │
   ├── LaTeX engine (pdflatex)
   │
   ▼
PDF
```

Формулы в Markdown поддерживаются в стандартном LaTeX-формате:

* инлайн: `$formula$`
* блочные: `$$formula$$`

Pandoc передаёт формулы в LaTeX-движок, который рендерит их корректно в PDF.

Для сохранения стилей из DOCX-шаблона при генерации PDF используется парный LaTeX-шаблон (`.tex`), хранящийся рядом с `.docx`. Он задаёт шрифты и отступы, соответствующие DOCX-шаблону.

Поддержка русского языка обеспечивается через пакеты LaTeX:

* `babel` (russian)
* `fontenc` (T2A)
* `inputenc` (utf8)

---

# 6. Функциональные требования

## 6.1 Управление шаблонами

Система должна позволять:

### загрузку шаблонов

Формат:

```
DOCX
```

Через web-интерфейс.

Поля при загрузке:

* **имя шаблона** — вводится вручную; поле предзаполняется именем загружаемого файла (без расширения)
* **описание** — вводится вручную

Имя шаблона должно быть **уникальным**. При попытке загрузить шаблон с уже существующим именем возвращается ошибка `409 Conflict`.

---

### список шаблонов

Отображать:

* имя шаблона
* дата загрузки
* описание
* кнопки

```
generate
delete
download
```

---

### удаление шаблонов

Удаляет:

```
template metadata
template file
```

---

### хранение шаблонов

Файлы:

```
/templates/{template_id}.docx
/templates/{template_id}.tex
```

`.tex` — парный LaTeX-шаблон для генерации PDF (стили, шрифты, отступы).

---

# 7. Ввод данных

Поддерживается ввод:

```
Markdown
```

через:

* textarea
* загрузку md файла

---


# 8. Web интерфейс

Приложение реализовано как **SPA** (Single Page Application): переключение между разделами происходит без перезагрузки страницы.

## Раздел: Шаблоны

```
Templates list
Upload template (name input, description input, file picker)
Delete template
Download template
```

---

## Раздел: Генерация

Форма:

```
Template selector
Markdown editor (plain textarea)
Output format selector (DOCX / PDF)
Generate button
```

Во время генерации отображается **спиннер**. Кнопка генерации блокируется до завершения запроса.

---

## Результат

```
Download link
```

---

# 9. API backend

## Templates

```
GET /templates
POST /templates
DELETE /templates/{id}
GET /templates/{id}/download
```

`POST /templates` возвращает `409 Conflict` если шаблон с таким именем уже существует.

---

## Generation

```
POST /generate
```

Request:

```
template_id
markdown_content
output_format
```

Response:

```
file (streaming response)
```

---

# 10. Структура проекта

```
project
│
├── backend
│   ├── app
│   │   ├── api
│   │   ├── services
│   │   │   ├── pandoc_service.py
│   │   │   └── template_service.py
│   │   ├── models
│   │   └── database
│
├── frontend
│
├── data
│   └── templates
│
├── docker
│
├── docker-compose.yml
│
├── .env
├── .env.example
│
└── nginx
    └── nginx.conf
```

---

# 11. Нефункциональные требования

### производительность

генерация документа:

```
< 5 секунд
```

---

### размер файла

максимальный размер шаблона:

```
20 MB
```

---

### безопасность

ограничения:

* фильтрация HTML в Markdown-контенте

---

# 12. Docker инфраструктура

```
services:

  nginx
  backend
```

Pandoc-бинарник и LaTeX (TeX Live) устанавливаются внутри `backend`-контейнера.

Nginx проксирует запросы: `localhost:8080` → `backend:8000`.

Конфигурация через `.env`-файл:

```
# .env
BACKEND_HOST=localhost
BACKEND_PORT=8000
NGINX_PORT=8080
TEMPLATES_PATH=./data/templates
```

---

# 13. Возможные будущие улучшения

### шаблоны переменных

```
{{name}}
{{date}}
{{company}}
```

---

### preview документа

HTML preview.

---

### API генерации

для интеграции:

```
CI/CD
document pipelines
```

---

### S3 storage

для production.

---

# 14. Основные технические риски

## 1. Ограничения Pandoc

Pandoc поддерживает **ограниченный набор DOCX-стилей** (Heading, Caption, Table и т.д.). ([Pandoc][1])

Некоторые сложные стили Word могут игнорироваться.

---

## 2. списки и numbering

Word нумерация иногда плохо переносится.

---

## 3. таблицы

complex tables иногда ломаются.

---

## 4. Размер Docker-образа с LaTeX

TeX Live увеличивает образ на ~1 GB. При необходимости использовать `texlive-latex-base` вместо full-версии.

---

# 15. MVP scope

Минимальная версия:

* загрузка DOCX шаблонов
* Markdown ввод
* генерация DOCX
* генерация PDF
* список шаблонов
* Docker deployment


[1]: https://pandoc.org/demo/example13.pdf?utm_source=chatgpt.com "Pandoc User’s Guide"
