# NeBeri

Скоринг событий связи (SMS / звонок / текст): правила из YAML + опционально ML по тексту. REST API, Postgres, SPA-консоль.

**Репозиторий:** [github.com/bluvvis/NEBERI](https://github.com/bluvvis/NEBERI)

---

## Структура

| Путь | Назначение |
|------|------------|
| `apps/api` | FastAPI, политики, модели, тесты (`pytest`) |
| `apps/web` | React (Vite), Tailwind |
| `deploy/helm/neberi` | Helm-чарт |
| `deploy/scripts` | Скрипты деплоя (PowerShell) |
| `research` | Данные и скрипты обучения / экспорт в `apps/api/ml_models` |

Тяжёлый embed-артефакт (`fraud_text_embed_pipeline.joblib`) в git не входит — см. `.gitignore`.

---

## Локально (Docker)

```bash
docker compose up --build
```

| Сервис | URL |
|--------|-----|
| Веб | http://localhost:8080 |
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/docs (через nginx с фронта: `/docs`) |

Заголовок `X-API-Key` для ingest / симуляции в compose совпадает с `VITE_INGEST_API_KEY` при сборке web (`neberi-dev-docker-ingest`).

---

## Разработка без Docker

**API:** из `apps/api` — зависимости, переменная `DATABASE_URL`, `uvicorn app.main:app --reload`.

**Web:** из `apps/web` — `npm install`, `npm run dev` (порт 5173). В `vite.config` прокси на `:8000` для `/v1`, `/docs`. При необходимости задайте `VITE_INGEST_API_KEY` и `VITE_API_BASE` (см. `.env.example` в web).

---

## CI и образы

На push в `main` — workflow **Build and push images** → `ghcr.io/<owner>/neberi-api` и `neberi-web` (`:latest`).

Для pull из кластера без `imagePullSecrets` пакеты GHCR должны быть **public** (настройки пакета на GitHub).

---

## Kubernetes

Нужен свой `deploy/kubeconfig-team-11.yaml` (в `.gitignore`).

```powershell
.\deploy\scripts\Deploy-Team11.ps1
```

Образы с GHCR по тегу `latest` подтягиваются с **`imagePullPolicy: Always`** (см. `values-images-ghcr.yaml`), иначе после CI на ноде часто остаётся старая сборка.

Подробности и ingress: [`deploy/KUBERNETES.md`](deploy/KUBERNETES.md).
