import os
import tempfile

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["USER_UPLOAD_DIR"] = tempfile.mkdtemp(prefix="neberi-upload-")
os.environ["JWT_SECRET"] = "unit-test-jwt-secret-neberi-needs-32chars-xx"
# Локальный apps/api/.env с INGEST_API_KEY не должен включать обязательный ключ в юнит-тестах.
os.environ["INGEST_API_KEY"] = ""
os.environ.setdefault("RATE_LIMIT_REPUTATION_MUTATIONS", "10000/minute")
os.environ.setdefault("RATE_LIMIT_EVENT_FEEDBACK", "10000/minute")
# Отключаем rate limit в юнит-тестах (отдельный subprocess-тест включает лимит).
os.environ["RATE_LIMIT_ENABLED"] = "false"
# Без joblib/sklearn в большинстве тестов (явный тест включает модель через monkeypatch).
os.environ["ML_PIPELINE_PATH"] = ""

import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine, get_db
from app.main import app


@pytest.fixture
def client():
    Base.metadata.create_all(bind=engine)

    def override_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
