# План проекта: антифрод/антиспам-модуль для телекома

**Статус:** актуальный план + журнал.  
**Последнее обновление:** 2026-04-22  

**Идея (фиксируем):** универсальный сервис скоринга в реальном времени по сигналам номера, поведения звонка/SMS и тексту/транскрипту → **risk score** + **объяснение** для пользователя или внутренних систем; интеграция как модуль у оператора (в т.ч. в логике экосистемы МТС — см. `docs/lectures_extracted/Ekosistemy.md`).

**Рамка по курсу:** ~4 месяца (январь–апрель 2026), финал — **показ 24.04.2026** (`vse_o_kurse.md`).

---

## 1. Критерии защиты (из программы) — чеклист на 100 баллов

Источник: `docs/lectures_extracted/vse_o_kurse.md`.

| Блок | Макс. баллов | Статус | Следующий шаг |
|------|--------------|--------|----------------|
| Бизнес-модель по **Lean Canvas** | 15 | ☑ черновик | Дополнить CustDev/сегменты в `docs/product/LEAN_CANVAS.md`, при желании экспорт в PNG |
| **Аналитика:** ТЗ, US, UC, ПМИ | 15 | ☑ частично | Есть `docs/analytics/TZ.md` + `README.md` в analytics — добавить **US/UC/ПМИ** файлами |
| **Frontend** | 20 | ☑ MVP | SPA, лента, деталь, симуляция; при защите — показать UX «почему подозрительно» |
| **Backend** | 20 | ☑ MVP | FastAPI, Postgres, скоринг YAML, **идемпотентность**, **rate limit**, тесты (в т.ч. политика, subprocess rate limit) |
| **Облако / деплой** | 10 | ☐ | Поднять Helm в реальном кластере / облаке, зафиксировать URL в README |
| **Наблюдаемость:** логи, метрики, (трейсы) | 20 | ☑ частично | Метрики + логи + аннотации scrape; **Grafana** + (опц.) **OTel** — см. `docs/observability.md` |

**Шкала:** 0–54 не сдано; 55–69 C; 70–84 B; **85+ A** («работающий прототип в облаке»).

---

## 2. Соответствие блокам курса (лекции `docs/lectures_extracted/`)

| Блок курса | Файл-источник | Как закрыто в репозитории |
|------------|---------------|---------------------------|
| Экосистемы | `Ekosistemy.md` | Позиционирование модуля для интеграции в продукты оператора — README, TZ, план §идея |
| Lean Canvas / защита продукта | `Lean_Canvas.md` | `docs/product/LEAN_CANVAS.md` (шаблон), ценность/MVP/риски в плане |
| Оценка задач | `Otnositelnaya_otsenka_zadach.md` | Вести US в `docs/analytics/` с **story points** при планировании спринта |
| Backend / SLA / безопасность | `SDPA_2026_S.md` | REST, БД, **rate limiting**, middleware, `/metrics`, probes, CI тесты |
| Frontend / SPA | `Udivitelny_mir_knopochek_i_formochek.md` | React+Vite+TS, маршрутизация, UI консоли |
| Метрики, логи, трейсы | тезисы в `SDPA_2026_S.md` (Observability) | `docs/observability.md`, Prometheus; трейсы — в backlog |
| Программа / экзамен | `vse_o_kurse.md` | Таблица баллов = §1 этого файла |

**Пробелы (явно):** отдельной выгрузки лекции Ильи Пилипейко в репо нет — при появлении положить в `docs/lectures_extracted/` и расширить §4 наблюдаемости (алертинг, exemplars).

---

## 3. Артефакты в репозитории

| Путь | Назначение |
|------|------------|
| `docs/lectures_extracted/` | Конспекты лекций |
| `docs/PROJECT_PLAN.md` | Этот план |
| `docs/product/LEAN_CANVAS.md` | Lean Canvas (черновик) |
| `docs/analytics/` | ТЗ, US, UC, ПМИ (`TZ.md` есть) |
| `docs/observability.md` | Логи / метрики / Grafana |
| `scripts/install-dependencies.ps1` | Установка pip + npm на Windows |
| `docs/START_FULL.md` | **Полная инструкция** (Docker, dev, тесты, образы, Helm, GitLab, чеклист защиты) |
| `docs/PRODUCT_SCOPE.md` | Границы продукта, non-goals, ПДн |
| `docs/INDUSTRY_SIGNALS.md` | Связь правил с открытыми источниками |
| `docs/OPERATIONS.md` | Runbook: env, метрики, политика, purge |
| `docs/DEFENSE_ONEPAGER.md` | Сценарий защиты на одной странице |
| `docs/analytics/OFFLINE_EVALUATION.md` | Offline ML / датасеты без MLOps в API |
| `research/` | Offline baseline (`offline_baseline.py`), job CI `test:research` |
| `docs/engineering/ADR-0001-*.md` | Архитектурные решения (ADR) |
| `apps/api/policies/CHANGELOG.md` | История версий YAML-политики |

---

## 4. Технический скелет (MVP → защита)

- **API:** ingestion, скоринг, `policy_version`, `reasons[]` + `references[]`, маскирование, **`idempotency_key`**, **`RATE_LIMIT_EVENTS`**, `/metrics`, `/docs`.
- **Web:** консоль + симуляция; `buildFetchUrl` + тесты на **абсолютный VITE_API_BASE**.
- **Деплой:** `docker-compose`, Helm `deploy/helm/neberi`, GitLab CI (`test:api`, `test:web`, `test:research`, build, deploy manual).
- **Тесты:** политика YAML, идемпотентность, rate limit (subprocess), фронт `vitest`.

---

## 5. Помесячный ориентир

| Месяц | Продукт / аналитика | Инженерия |
|-------|---------------------|-----------|
| **1** | Lean Canvas, сегменты | Репо, Docker, API |
| **2** | US/UC, ТЗ | Ingestion, скоринг, Postgres |
| **3** | ПМИ, демо-данные | Frontend, Helm, CI |
| **4** | Метрики в презентации | Grafana, (трейсы), деплой в облако |

---

## 6. Журнал прогресса

```text
2026-04-22 — Создан docs/PROJECT_PLAN.md, синхрон с критериями курса и лекциями.
2026-04-22 — Каркас репозитория: apps/api, apps/web, Helm, docker-compose, GitLab CI.
2026-04-22 — Идемпотентность (idempotency_key), rate limit (slowapi), метрика idempotent_replays,
            тесты: политика YAML, idempotency, rate limit subprocess; vitest buildFetchUrl;
            docs: TZ, LEAN_CANVAS черновики, install-dependencies.ps1; CI test:web.
2026-04-22 — Добавлен docs/START_FULL.md — единая «тяжёлая» инструкция без упрощений; ссылка из README.
2026-04-22 — Пакет «профессиональной» документации: PRODUCT_SCOPE, INDUSTRY_SIGNALS, OPERATIONS,
            DEFENSE_ONEPAGER, analytics/OFFLINE_EVALUATION, engineering/ADR-0001, policies/CHANGELOG;
            README — таблица ссылок; журнал синхронизирован.
2026-04-22 — Глобальный аудит репо: MD синхронизированы с `neberi_rule_fires_total` и references;
            README — research + различие `deploy/helm` vs папка курса; pytest/build зелёные.
```

---

## 7. Риски и границы

- Нет реальных CDR/BSS — симуляция и демо-политика.
- Юридика и этика обработки текста/SMS — README + слайд на защите.
- Маскирование по хвосту номера даёт коллизии для burst-метрик (ограничение MVP).

---

## 8. Установка зависимостей на машине разработчика

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-dependencies.ps1
```

Либо вручную: `python -m pip install -r apps/api/requirements.txt`, затем в `apps/web`: `npm install` и `npm run test`; offline-артефакт: `pip install -r research/requirements.txt` и `python research/offline_baseline.py`.

Переменные API (опционально): `DATABASE_URL`, `POLICY_PATH`, `RATE_LIMIT_EVENTS`, `RATE_LIMIT_ENABLED`.
