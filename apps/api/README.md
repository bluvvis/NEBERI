# NeBeri API

См. корневой [`README.md`](../../README.md). Кратко:

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
python -m pytest -q
```

Переменные окружения: `DATABASE_URL`, опционально `POLICY_PATH` (путь к `default_rules.yaml`), `ML_PIPELINE_PATH`, `ML_BLEND_WEIGHT` (текстовый ML поверх правил; артефакт — `ml_models/` после `python ../research/train_export.py`).

В ответе `EventOut` поле **`score_explanation`** — разбор скора для UI/интеграций (точная смесь, число сработавших правил, пороги уровней).

После **изменения справочника репутации** (`msisdn_reputation`: POST/DELETE, бан с карточки события, первый `missed_fraud` → блок) для затронутых `fraud_events` пересчитываются и **сохраняются** `risk_score` / `risk_level` и снимок `caller_reputation` в `payload`, чтобы лента с фильтром `?risk_level=` совпадала с карточкой.

Перезаливка демо-событий в UTF-8 (из корня репо): `python scripts/reseed_demo_events.py --purge`.
