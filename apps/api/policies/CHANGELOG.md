# История версий политики (`default_rules.yaml`)

Формат: **версия** — кратко что изменилось (для аудита вместе с полем `policy_version` в ответе API).

## 2026.04.5

- Правило **`social_engineering_gray`** (вес 18): «серые» формулировки под банк/финансы без обязательных слов «срочно» / «переведите на карту» и т.п. — покрытие демо-кейсов и smishing без жёсткого шаблона.

## 2026.04.3

- У каждого правила добавлено поле **`references`** (title, url `https://`, optional `kind`) — те же открытые источники, что в `docs/INDUSTRY_SIGNALS.md`, уезжают в ответ API в `reasons[].references` для аудита/UI.
- Метрика **`neberi_rule_fires_total`**{`rule_id`,`event_type`} — счётчик срабатываний правил (наблюдаемость по лекции SDPA).

## 2026.04.2

- Добавлено правило **`coercion_urgency`** (давление «срочно / немедленно / прямо сейчас») для `sms` и `voice_text`.
- Цель: различимые high-risk кейсы при совместном срабатывании со **`scam_keywords`** (см. `docs/INDUSTRY_SIGNALS.md`).

## 2026.04.1

- Базовый набор: `scam_keywords`, `night_window_call`, `ultra_short_call`, `burst_short_dials`, `high_velocity_sms`.
- Пороги `risk_level` в коде: `≤20` low, `<55` medium, иначе high (`app/services/scoring.py`).
