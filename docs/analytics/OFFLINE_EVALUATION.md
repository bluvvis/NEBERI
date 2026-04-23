# Offline-оценка скоринга (без MLOps в hot path)

Цель артефакта: показать на защите **зрелость подхода** — вы знаете, как усилить систему **данными и метриками**, не обязуя репозиторий поддерживать GPU-сервис.

## Зачем это отдельно от API

- **Hot path** остаётся детерминированным: правила, тесты, быстрый ответ.
- **Эксперименты** (sklearn, XGBoost, fine-tune) — в ноутбуке или отдельном каталоге `research/` (по желанию), артефакты — таблица метрик + вывод в этот файл или в приложение к отчёту.

## Открытые датасеты (стартовые точки)

| Датасет | Что даёт | Ссылка |
|---------|----------|--------|
| UCI SMS Spam Collection | Классика ham/spam, baseline TF-IDF | [UCI ML Repo](https://archive.ics.uci.edu/dataset/228/sms+spam+collection) |
| SMS phishing (Mendeley) | Отдельный класс smishing | [Mendeley Data](https://data.mendeley.com/datasets/f45bkkt8pr/1) |
| Smishtank / smishing papers | Свежие паттерны, URL | [arXiv Smishing Dataset I](https://arxiv.org/html/2402.18430v2) |

**Ограничение:** большинство публичных SMS-корпусов **англоязычные**; для русского сценария NeBeri — дообучение или ручная разметка подмножества.

## Минимальный offline-пайплайн (шаблон)

1. Выгрузка или синтетика текстов **в духе** текущих правил + негативы.
2. Векторизация: **TF-IDF** (n-gram 1–3) или **sentence-transformers** multilingual (тяжелее).
3. Модель: **LogisticRegression** / **RandomForest** / **XGBoost**.
4. Метрики: precision/recall по классу fraud, **confusion matrix** на хвосте (длинные фразы).
5. Сравнение с **текущей политикой** на том же фиксированном наборе: где rules ловят, где ML — и наоборот.

## Как это «продать» на защите одной фразой

> «В API оставили объяснимые правила и версию политики; параллельно зафиксировали путь усиления через открытые датасеты и offline-оценку без обязательства встраивать модель в каждый запрос до появления данных и MLOps.»

## Что сделано в репозитории (факт)

- **Открытый корпус по умолчанию:** [UCI SMS Spam Collection](https://archive.ics.uci.edu/dataset/228/sms+spam+collection) — `python research/fetch_uci_sms_spam.py` качает zip и строит `research/data/uci_smsspam_labeled.csv` (~5.5k SMS, **англ.** ham/spam). Файл в `.gitignore`, в git не коммитится.
- **`research/train_export.py`** по умолчанию `--dataset uci`: TF-IDF + LogisticRegression (`saga`, `max_features=50k`) → `apps/api/ml_models/fraud_text_pipeline.joblib` + `manifest.json` (метрики hold-out / CV, ссылка на источник).
- **`--dataset combined`**: UCI + `synthetic_sms_labelled.csv`, дедуп по нормализованному тексту (приоритет метки fraud) — **рекомендуется для русских smishing** в консоли без GPU; проверка: `python research/validate_labeled_csv.py --combined`.
- **Синтетика RU** только: `python research/train_export.py --dataset synthetic` (мало примеров — для быстрых экспериментов).
- **GPU / мультиязычные эмбеддинги (локально, RTX и т.д.):** `research/train_export_multilingual_gpu.py` + `research/requirements-gpu.txt` — `paraphrase-multilingual-MiniLM-L12-v2` + LR, артефакт `fraud_text_embed_pipeline.joblib`; в compose указать другой `ML_PIPELINE_PATH`.
- **`research/offline_baseline.py`** — по-прежнему сравнение с прокси правил на синтетике (CI: `test:research`).
- В рантайме API: `ML_PIPELINE_PATH` / `ML_BLEND_WEIGHT` — `docs/OPERATIONS.md`.

**Честно про язык:** правила YAML заточены под **русские** шаблоны; TF-IDF на **англ.** UCI для русского SMS даёт слабый сигнал — для «ощущения ML» на RU используйте GPU-скрипт или смешанную разметку (RU + EN) в одном CSV и переобучите.
