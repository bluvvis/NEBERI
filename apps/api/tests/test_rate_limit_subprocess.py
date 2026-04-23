"""Rate limit проверяется в отдельном процессе (свежий импорт settings + limiter)."""

import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.mark.slow
def test_post_events_rate_limited_in_fresh_process() -> None:
    code = r"""
import os
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["INGEST_API_KEY"] = ""
os.environ["RATE_LIMIT_ENABLED"] = "true"
os.environ["RATE_LIMIT_EVENTS"] = "2/minute"
os.environ["ML_PIPELINE_PATH"] = ""

from fastapi.testclient import TestClient
from app.db import Base, SessionLocal, engine, get_db
from app.main import app

Base.metadata.create_all(bind=engine)

def override_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_db
payload = {
    "event_type": "call",
    "from_msisdn": "+79001111111",
    "to_msisdn": "+79002222222",
    "duration_sec": 30,
}
with TestClient(app) as c:
    assert c.post("/v1/events", json=payload).status_code == 200
    assert c.post("/v1/events", json=payload).status_code == 200
    r3 = c.post("/v1/events", json=payload)
    assert r3.status_code == 429, r3.text
"""
    r = subprocess.run(
        [sys.executable, "-c", code],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if r.returncode != 0:
        pytest.fail(f"subprocess failed:\n{r.stderr}\n{r.stdout}")
