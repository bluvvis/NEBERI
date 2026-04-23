# Эксплуатация (runbook-lite)

Краткий справочник для **локального стенда**, **Docker** и **Helm** без дублирования длинной инструкции из [`START_FULL.md`](START_FULL.md).

## Переменные окружения API

| Переменная | Назначение | По умолчанию |
|------------|------------|----------------|
| `DATABASE_URL` | SQLAlchemy DSN | см. `app/config.py` |
| `POLICY_PATH` | Путь к YAML политике | `policies/default_rules.yaml` |
| `ML_PIPELINE_PATH` | Joblib-пайплайн (TF-IDF+LR); пусто — только правила | `ml_models/fraud_text_pipeline.joblib` |
| `ML_BLEND_WEIGHT` | Доля ML в итоговом `risk_score` для `sms` / `voice_text` (0..1) | `0.42` |
| `RATE_LIMIT_EVENTS` | Лимит slowapi на `POST /v1/events` | `120/minute` |
| `RATE_LIMIT_ENABLED` | Включить лимит | `true` |
| `ALLOW_DEMO_EVENT_PURGE` | Разрешить `POST /v1/events/purge` и `DELETE /v1/events` | `true` |
| `INGEST_API_KEY` | Непустое значение: `POST /v1/events` и purge только с заголовком **`X-API-Key`** (или `X-Ingest-Key`) | *(пусто)* |
| `CORS_ALLOW_ORIGINS` | Список origin через запятую; `*` — любой origin (**без** `credentials` в браузере) | `*` |

В тестах: `RATE_LIMIT_ENABLED=false` (см. `tests/conftest.py`).

## Метрики Prometheus

Эндпоинт: **`GET /metrics`** (тот же процесс, что API).

| Метрика | Тип | Labels |
|---------|-----|--------|
| `neberi_http_request_duration_seconds` | Histogram | `method`, `path` |
| `neberi_events_ingested_total` | Counter | `event_type`, `risk_level` |
| `neberi_high_risk_events_total` | Counter | — |
| `neberi_idempotent_replays_total` | Counter | — |
| `neberi_rule_fires_total` | Counter | `rule_id`, `event_type` (каждое срабатывание правила в ответе) |
| `neberi_ml_blend_applied_total` | Counter | `event_type` (когда ML-вероятность участвовала в скоре) |

Сбор и Grafana — см. [`observability.md`](observability.md).

## Логи

- Access: middleware пишет `method`, `path`, `status`, `duration_ms`, `request_id`.
- Заголовок ответа: **`X-Request-ID`** (проброс корреляции).

## Политика

- Файл по умолчанию: `apps/api/policies/default_rules.yaml`.
- В Docker Compose политика может монтироваться **read-only** поверх образа — см. `docker-compose.yml`.
- История версий: `apps/api/policies/CHANGELOG.md`.

## Лента: счётчики

- **`GET /v1/events/stats`** — JSON `{ "total", "by_risk": { "low", "medium", "high" } }`; query **`risk_level`** влияет только на поле **`total`** (как у списка), **`by_risk`** всегда по всей таблице.

## Демо-очистка БД

- **`POST /v1/events/purge`** (основной путь для UI).
- **`DELETE /v1/events`** — для совместимости; при 405 за прокси использовать POST.

Отключение в проде: `ALLOW_DEMO_EVENT_PURGE=false`.

### Перезаливка демо из CLI (UTF-8)

Из **корня репозитория**: `python scripts/reseed_demo_events.py --purge`  
(переменная `NEBERI_API_BASE` — при необходимости другой хост API.)

Не перенаправляйте JSON из Node в файл через PowerShell **`>`** без UTF-8 — иначе в БД попадут испорченные строки (`text_excerpt`). Скрипт вызывает `apps/web/scripts/exportDemoPayloads.ts` и пишет временный JSON в UTF-8.

## Ответ API по событиям (скор и объяснимость)

| Поле | Смысл |
|------|--------|
| `risk_score` | Округлённая смесь правил и ML (целое 0–100), как в БД. |
| `risk_level` | low / medium / high по порогам; при участии ML уровень считается по **`max(правила, смесь)`**, чтобы сильные правила не «тонули» из‑за слабой модели на другом языке. |
| `score_explanation` | Разбор для оператора: **`blended_exact`** / **`blended_base`**, **`diversity_bonus`** (паттерны + длина текста), **`keyword_pattern_hits`**, **`blended_components`** (ветки для UI-графиков), **`rules_fired_count`**, вес ML, **`effective_for_risk_level`**, **`fairness_notes`**. |

## Здоровье

- **`GET /health`** — liveness/readiness в Helm (см. chart).
