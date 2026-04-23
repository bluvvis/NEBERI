"""Лёгкие миграции при старте (legacy-таблицы без новых колонок)."""

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.pool import StaticPool

from app.db_schema_ensure import ensure_schema


def test_ensure_adds_from_msisdn_normalized_to_legacy_table() -> None:
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE fraud_events (
                    id TEXT PRIMARY KEY NOT NULL,
                    from_msisdn_masked TEXT NOT NULL,
                    to_msisdn_masked TEXT NOT NULL
                )
                """
            ),
        )
    ensure_schema(eng)
    insp = inspect(eng)
    names = {c["name"] for c in insp.get_columns("fraud_events")}
    assert "from_msisdn_normalized" in names
    ensure_schema(eng)
    ensure_schema(eng)


def test_ensure_noop_when_column_already_present() -> None:
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    with eng.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE fraud_events (
                    id TEXT PRIMARY KEY NOT NULL,
                    from_msisdn_masked TEXT NOT NULL,
                    to_msisdn_masked TEXT NOT NULL,
                    from_msisdn_normalized VARCHAR(16) NULL
                )
                """
            ),
        )
    ensure_schema(eng)
    ensure_schema(eng)
