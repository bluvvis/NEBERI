"""
Добавление колонок к существующим таблицам (create_all не делает ALTER).

Вызывается при старте приложения после create_all — чтобы Docker/прод с старым volume
получили from_msisdn_normalized без ручного psql.
"""

from __future__ import annotations

import logging

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

_log = logging.getLogger(__name__)

_IDX_FROM_NORM = "ix_fraud_events_from_msisdn_normalized"


def ensure_fraud_events_from_msisdn_normalized(engine: Engine) -> None:
    try:
        insp = inspect(engine)
    except Exception:
        _log.exception("schema ensure: inspect failed")
        return
    if "fraud_events" not in insp.get_table_names():
        return
    col_names = {c["name"] for c in insp.get_columns("fraud_events")}
    if "from_msisdn_normalized" in col_names:
        _ensure_index_on_from_msisdn(engine, insp)
        return
    _log.info("schema ensure: adding column fraud_events.from_msisdn_normalized")
    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE fraud_events ADD COLUMN from_msisdn_normalized VARCHAR(16) NULL"),
        )
    insp = inspect(engine)
    _ensure_index_on_from_msisdn(engine, insp)


def _ensure_index_on_from_msisdn(engine: Engine, insp) -> None:
    idx_names = {ix["name"] for ix in insp.get_indexes("fraud_events")}
    if _IDX_FROM_NORM in idx_names:
        return
    _log.info("schema ensure: creating index %s", _IDX_FROM_NORM)
    stmt = text(
        f"CREATE INDEX IF NOT EXISTS {_IDX_FROM_NORM} ON fraud_events (from_msisdn_normalized)",
    )
    with engine.begin() as conn:
        conn.execute(stmt)


def ensure_schema(engine: Engine) -> None:
    ensure_fraud_events_from_msisdn_normalized(engine)
