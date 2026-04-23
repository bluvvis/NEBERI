# NeBeri API

См. корневой [`README.md`](../../README.md). Кратко:

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
python -m pytest -q
```

Переменные окружения: `DATABASE_URL`, опционально `POLICY_PATH` (путь к `default_rules.yaml`), `ML_PIPELINE_PATH`, `ML_BLEND_WEIGHT` (текстовый ML поверх правил; артефакт — `ml_models/` после `python ../research/train_export.py`).

В ответе `EventOut` поле **`score_explanation`** — разбор скора для UI/интеграций (точная смесь, число сработавших правил, пороги уровней).

Перезаливка демо-событий в UTF-8 (из корня репо): `python scripts/reseed_demo_events.py --purge`.
