-- Идемпотентно: старые БД без колонки (репутация из карточки события).
-- При старте API также выполняется ensure_schema в apps/api/app/db_schema_ensure.py

ALTER TABLE fraud_events ADD COLUMN IF NOT EXISTS from_msisdn_normalized VARCHAR(16) NULL;

CREATE INDEX IF NOT EXISTS ix_fraud_events_from_msisdn_normalized ON fraud_events (from_msisdn_normalized);
