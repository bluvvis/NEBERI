# Структура репозитория NeBeri

```
NeBeri/
├── apps/
│   ├── api/                 # Backend (FastAPI)
│   │   ├── app/
│   │   │   ├── main.py      # Точка входа, CORS, /metrics, request-id
│   │   │   ├── routers/     # REST: /v1/events, /health
│   │   │   ├── services/    # Скоринг, маскирование
│   │   │   └── observability/
│   │   ├── policies/        # YAML политики (локально и в образе)
│   │   ├── ml_models/       # joblib + manifest (train_export из research/)
│   │   ├── tests/
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   └── web/                 # Frontend (React + Vite)
│       ├── src/
│       ├── scripts/         # exportDemoPayloads.ts (UTF-8 JSON для reseed)
│       ├── Dockerfile       # nginx + reverse-proxy к API (Compose)
│       ├── Dockerfile.static # Только SPA (Kubernetes + Ingress)
│       └── nginx.docker.conf
├── deploy/
│   └── helm/neberi/         # Chart: api, web, postgres, ingress, policy ConfigMap
├── research/                # Offline ML baseline (не в Docker API)
│   ├── offline_baseline.py
│   ├── requirements.txt
│   └── data/
├── docs/
│   ├── course-materials/    # Референсы курса (K8s/Helm/GitLab, слайды) — не боевой chart
│   ├── PROJECT_PLAN.md
│   ├── PRODUCT_SCOPE.md     # Scope, non-goals, ПДн
│   ├── INDUSTRY_SIGNALS.md  # Правила ↔ открытые источники
│   ├── OPERATIONS.md        # Env, метрики, purge, политика
│   ├── DEFENSE_ONEPAGER.md  # Сценарий защиты
│   ├── engineering/         # ADR (архитектурные решения)
│   ├── lectures_extracted/
│   ├── analytics/           # ТЗ, US, UC, ПМИ, OFFLINE_EVALUATION
│   └── observability.md     # Метрики, логи, дашборды
├── scripts/                 # install-dependencies.ps1, reseed_demo_events.py
├── docker-compose.yml
├── .gitlab-ci.yml
└── README.md
```

## Принципы

- **Продуктовая ценность** — объяснимый скоринг и версия политики в ответе API.  
- **Наблюдаемость** — `/metrics` (в т.ч. `neberi_rule_fires_total`), структурированные access-логи, аннотации Service для Prometheus.  
- **Деплой** — декларативный Helm, CI/CD в GitLab, локально — Compose.

## Где что лежит (кратко)

| Зона | Путь |
|------|------|
| Код API | `apps/api/app/` |
| Политика + ML артефакты в образе | `apps/api/policies/`, `apps/api/ml_models/` |
| Код UI | `apps/web/src/` |
| Обучение / офлайн-оценка | `research/` |
| Прод Helm | `deploy/helm/neberi/` |
| Утилиты (Windows deps, UTF-8 reseed демо) | `scripts/` |
| Материалы курса (не продукт) | `docs/course-materials/` |
