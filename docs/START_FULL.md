# NeBeri — полная инструкция (без «лёгких путей»)

Один документ: что поставить на ПК, как поднять всё локально, как гонять тесты и линтеры, как собрать образы, как выкатить в Kubernetes и связать с GitLab CI. Ориентир: **Windows + PowerShell**, пути как у тебя: `C:\Users\andro\Desktop\NeBeri`.

---

## 0. Что ты в итоге получишь

| Компонент | Зачем |
|-----------|--------|
| **Docker Compose** | Postgres + API + Web одной командой, как «мини-прод». |
| **Python + pytest + ruff** | Backend, тесты, стиль кода. |
| **Node + npm** | Frontend и `vitest`. |
| **Docker build** | Образы для registry и для Helm. |
| **Helm + kubectl** | Деплой в Kubernetes (критерий курса). |
| **GitLab** | CI: тесты → образы → ручной Helm upgrade. |
| **Доки в `docs/`** | План, ТЗ, Lean Canvas, лекции — под баллы защиты. |

### 0.1 Продукт, источники сигналов, runbook, защита

Помимо «как запустить», в репозитории лежит связка документов уровня портфолио: границы продукта и ПДн — [`PRODUCT_SCOPE.md`](PRODUCT_SCOPE.md); правила ↔ открытые ссылки — [`INDUSTRY_SIGNALS.md`](INDUSTRY_SIGNALS.md); эксплуатация (env, метрики, purge) — [`OPERATIONS.md`](OPERATIONS.md); сценарий демо на защите — [`DEFENSE_ONEPAGER.md`](DEFENSE_ONEPAGER.md); offline-оценка скоринга — [`analytics/OFFLINE_EVALUATION.md`](analytics/OFFLINE_EVALUATION.md); ADR про объяснимость — [`engineering/ADR-0001-explainability-over-black-box.md`](engineering/ADR-0001-explainability-over-black-box.md). Полная таблица ссылок — в корневом [`README.md`](../README.md).

---

## 1. Установи на компьютер (полный список)

Сделай по порядку, что ещё не стоит:

1. **Git** — [https://git-scm.com/download/win](https://git-scm.com/download/win)  
2. **Docker Desktop** (включи WSL2, если установщик попросит) — [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)  
   Через `winget install Docker.DockerDesktop` иногда падает без окна UAC — тогда скачай установщик с сайта и запусти **от имени администратора**.  
   Если ошибка: *«`C:\ProgramData\DockerDesktop` must be owned by an elevated account»* — в **PowerShell от администратора** удали папку `C:\ProgramData\DockerDesktop` (`Remove-Item -Recurse -Force`) или выполни `takeown` + `icacls` как в README/ответе ассистента, затем установи Docker снова **от администратора**.  
3. **Python 3.12** (галочка «Add to PATH») — [https://www.python.org/downloads/](https://www.python.org/downloads/)  
4. **Node.js 22 LTS** — [https://nodejs.org/](https://nodejs.org/)  
5. После Node **перезапусти** PowerShell и проверь:
   ```powershell
   python --version
   pip --version
   node --version
   npm --version
   docker version
   ```
6. **Опционально для K8s на своей машине:**  
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)  
   - [Helm](https://helm.sh/docs/intro/install/)  
   - или **minikube** / **kind** — если хочешь свой кластер локально.

---

## 2. Открой проект и базовые команды

Всегда начинай с корня репозитория:

```powershell
cd C:\Users\andro\Desktop\NeBeri
```

---

## 3. Полный стек через Docker Compose

### 3.1 Запуск

```powershell
cd C:\Users\andro\Desktop\NeBeri
docker compose up --build
```

Дождись строк без постоянных ошибок. Первый раз сборка может занять несколько минут.

### 3.2 Проверка в браузере

| URL | Что смотреть |
|-----|----------------|
| [http://localhost:8080](http://localhost:8080) | UI: кнопка **«Симуляция»**, список (у high — визуальный акцент), карточка с разбором скора. |
| [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger / OpenAPI. |
| [http://localhost:8000/metrics](http://localhost:8000/metrics) | Сырые метрики Prometheus. |
| [http://localhost:8000/health](http://localhost:8000/health) | Health. |

### 3.3 Остановка

В том же окне: **Ctrl+C**.  
Если менялась **схема БД** (новые колонки) и Postgres уже создавал том — сброс данных:

```powershell
docker compose down -v
```

Потом снова `docker compose up --build`.

---

## 4. Python-зависимости и тесты API (всегда полезно)

Даже если пользуешься Docker, локальные тесты ускоряют разработку.

```powershell
cd C:\Users\andro\Desktop\NeBeri\apps\api
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m pytest -q
python -m ruff check app tests
```

- Тесты **не** бьют реальный Postgres из compose: в `tests/conftest.py` задан SQLite в памяти и отключён rate limit для скорости.

---

## 5. Frontend: зависимости, дев-сервер, тесты

```powershell
cd C:\Users\andro\Desktop\NeBeri\apps\web
npm install
npm run test
npm run dev
```

- **`npm run dev`** — UI на **http://localhost:5173**.  
- API при этом должен быть на **:8000** (запусти отдельно из §6 или подними только `api` из compose в другом терминале — см. §7).

---

## 6. «Всё локально без Compose»: Postgres в Docker + API + Web

Когда нужно дебажить API с hot-reload и фронт отдельно.

**Терминал 1 — только Postgres:**

```powershell
docker run --name neberi-pg -e POSTGRES_USER=neberi -e POSTGRES_PASSWORD=neberi -e POSTGRES_DB=neberi -p 5432:5432 -d postgres:16-alpine
```

**Терминал 2 — API:**

```powershell
cd C:\Users\andro\Desktop\NeBeri\apps\api
python -m pip install -r requirements.txt
$env:DATABASE_URL = "postgresql+psycopg2://neberi:neberi@localhost:5432/neberi"
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Терминал 3 — Web:**

```powershell
cd C:\Users\andro\Desktop\NeBeri\apps\web
npm install
npm run dev
```

Открой **http://localhost:5173** — Vite проксирует `/v1` на `127.0.0.1:8000`.

Остановить Postgres:

```powershell
docker stop neberi-pg
docker rm neberi-pg
```

---

## 7. Сборка Docker-образов вручную (как в CI)

Из **корня** `NeBeri`:

**API:**

```powershell
docker build -t neberi/api:local -f apps/api/Dockerfile apps/api
```

**Web для Compose** (nginx + прокси на `api`):

```powershell
docker build -t neberi/web:compose -f apps/web/Dockerfile apps/web
```

**Web для Kubernetes** (только статика, API через Ingress):

```powershell
docker build -t neberi/web:k8s -f apps/web/Dockerfile.static apps/web
```

Проверка образов:

```powershell
docker images | findstr neberi
```

---

## 8. Kubernetes и Helm (полный цикл)

### 8.1 Предпосылки

- Рабочий кластер (облако учебное, minikube, kind — неважно).  
- `kubectl config current-context` показывает нужный контекст.  
- Установлен **Helm 3**.

### 8.2 Собери и запушь образы в registry

Подставь свой registry (GitLab Container Registry, Yandex CR, и т.д.):

```powershell
docker tag neberi/api:local registry.example.com/group/neberi-api:demo1
docker tag neberi/web:k8s registry.example.com/group/neberi-web:demo1
docker push registry.example.com/group/neberi-api:demo1
docker push registry.example.com/group/neberi-web:demo1
```

### 8.3 Проверка chart без установки

```powershell
cd C:\Users\andro\Desktop\NeBeri
helm template neberi ./deploy/helm/neberi --set ingress.host=neberi.test `
  --set api.image.repository=registry.example.com/group/neberi-api `
  --set api.image.tag=demo1 `
  --set web.image.repository=registry.example.com/group/neberi-web `
  --set web.image.tag=demo1
```

Убедись, что YAML без явных ошибок.

### 8.4 Установка в кластер

```powershell
kubectl create namespace neberi-dev --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install neberi ./deploy/helm/neberi -n neberi-dev `
  --set ingress.host=neberi.YOURDOMAIN `
  --set api.image.repository=registry.example.com/group/neberi-api `
  --set api.image.tag=demo1 `
  --set web.image.repository=registry.example.com/group/neberi-web `
  --set web.image.tag=demo1
```

### 8.5 Если Ingress недоступен сразу

Проброс API:

```powershell
kubectl port-forward -n neberi-dev svc/neberi-neberi-api 8000:8000
```

Статус подов:

```powershell
kubectl get pods -n neberi-dev
kubectl describe pod -n neberi-dev -l app.kubernetes.io/component=api
```

### 8.6 Пароль Postgres в Helm

Задаётся в `deploy/helm/neberi/values.yaml` (`postgres.password`). Для реальной среды переопредели через `--set postgres.password=...` или внешний Secret (доработка chart под твой стандарт).

---

## 9. GitLab CI/CD (всё, что от тебя нужно)

1. Создай проект в **GitLab**, залей этот репозиторий (`git remote add`, `git push`).  
2. Включи **Container Registry** для проекта.  
3. Убедись, что пайплайн видит образы: job `build:*` логинится через встроенные `CI_REGISTRY_*`.  
4. Job **`deploy:helm`** — **ручной**: в GitLab нужен доступ к кластеру:  
   - либо **GitLab Kubernetes Agent**,  
   - либо **KUBECONFIG** в переменной (тип File) + `kubectl`/`helm` в образе job (уже `dtzar/helm-kubectl`).  
5. Перед первым деплоем поправь в `.gitlab-ci.yml` или в UI переменные **`KUBE_NAMESPACE`**, образы registry — как в §8.

Локально проверить «как CI»:

```powershell
cd C:\Users\andro\Desktop\NeBeri\apps\api
python -m pytest -q
cd ..\apps\web
npm install
npm run test
```

---

## 10. Наблюдаемость (под баллы курса, не только MVP)

Уже есть: `/metrics`, access-логи, аннотации scrape на Service API в Helm.

Дальше **сделай сам** (отдельный Helm chart или docker-compose stack):

- Поднять **Prometheus** (scrape `neberi-*-api:8000/metrics`).  
- Поднять **Grafana**, импортировать дашборд: RPS, p95, `neberi_events_ingested_total`, `neberi_high_risk_events_total`, `neberi_idempotent_replays_total`, `neberi_rule_fires_total` (разрез по `rule_id`).  
- (Опционально) **OpenTelemetry** + Jaeger/Tempo — см. `docs/observability.md`.

---

## 11. Документы под защиту (не код)

| Файл | Действие |
|------|----------|
| `docs/PROJECT_PLAN.md` | Обновляй чеклист и журнал. |
| `docs/product/LEAN_CANVAS.md` | Дополни сегменты, каналы, метрики, риски. |
| `docs/analytics/TZ.md` | Уточни границы и NFR. |
| `docs/analytics/` | Добавь **US-*.md**, **UC**, **ПМИ** (таблица сценариев). |
| `docs/lectures_extracted/` | При новых лекциях — конспект в `.md` (скрипт `scripts/extract_pdf_text.py`, если снова появятся PDF). |

---

## 12. Скрипт «всё подряд» на Windows

Из корня:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-dependencies.ps1
```

Он ставит Python-зависимости и гоняет `pytest`; если **npm** в PATH — ещё `npm install` и `npm run test` в `apps/web`.

---

## 13. Частые проблемы

| Симптом | Что сделать |
|---------|-------------|
| `docker compose` не найден | Запусти Docker Desktop, подожди «Running». |
| Порт 5432 занят | Останови другой Postgres или смень порт в `docker-compose.yml`. |
| UI пустой / ошибка сети | Убедись, что API жив (8000 или прокси в nginx на 8080). |
| Старые данные / ошибки колонок БД | `docker compose down -v` и пересборка. |
| Helm: образ `ImagePullBackOff` | Залогинься в registry, проверь имя тега и `imagePullSecrets`. |

---

## 14. Минимальный чеклист «я сделал всё для курса»

- [ ] Compose поднимается, UI и `/docs` открываются.  
- [ ] `pytest` и `ruff` проходят локально.  
- [ ] `npm run test` проходит.  
- [ ] Образы собираются и пушатся в registry.  
- [ ] Helm ставится в кластер, приложение открывается (Ingress или port-forward).  
- [ ] GitLab pipeline зелёный на ветке по умолчанию.  
- [ ] Заполнены артефакты в `docs/` под Lean Canvas и аналитику.  
- [ ] Есть скрин Grafana или хотя бы план + метрики в отчёте.

Если что-то из списка упирается в доступы (кластер GitLab школы) — зафиксируй в отчёте **что сделал локально** и **что нужно от куратора**.

---

*Дальнейшие правки этого файла — по мере того, как меняется твоя инфраструктура (домен, registry, namespace).*
