# Наблюдаемость (логи, метрики, трейсы)

Соответствует блоку курса **«Метрики продукта, логи и трейсы»** и критерию до **20 баллов** (`vse_o_kurse.md`), а также тезисам backend-лекции (logs / metrics / traces / alerting).

## Что уже есть в MVP

| Сигнал | Где |
|--------|-----|
| **Метрики** | `GET /metrics` (Prometheus): `neberi_events_ingested_total`, `neberi_high_risk_events_total`, `neberi_idempotent_replays_total`, **`neberi_rule_fires_total`**{`rule_id`,`event_type`}, **`neberi_ml_blend_applied_total`**{`event_type`}, гистограмма задержки HTTP |
| **Объяснимость в данных** | В теле события (`GET/POST …/events`) — объект **`score_explanation`** (точная смесь, число правил, пороги); для операторской консоли UI строит карточку из этого JSON. |
| **Логи** | access-лог с `request_id`, методом, путём, статусом, `duration_ms` |
| **Health** | `GET /health`, `GET /healthcheck` (K8s probes) |
| **Аннотации scrape** | `deploy/helm/neberi` — Service API с `prometheus.io/*` |

## Что добавить для «вау» на защите

1. **Grafana** — дашборд: RPS, p95 latency, `neberi_events_ingested_total`, доля `high` risk, топ по `neberi_rule_fires_total` (какие правила «горят» чаще).  
2. **Алерт** — правило Prometheus: рост 5xx или отсутствие scrape > 2 мин.  
3. **Трейсы** — OpenTelemetry SDK в FastAPI + экспорт в Jaeger/Tempo (один trace на POST `/v1/events`).  
4. **JSON-логи** — заменить форматтер на json для Loki / ELK.

## Ссылки на лекции

- `docs/lectures_extracted/SDPA_2026_S.md` — раздел «Наблюдаемость».  
- `docs/PROJECT_PLAN.md` — чеклист баллов.
