"""Опциональный INGEST_API_KEY для мутаций."""

from app.config import settings


def test_post_events_without_key_when_key_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "ingest_api_key", "unit-test-secret")
    r = client.post(
        "/v1/events",
        json={
            "event_type": "call",
            "from_msisdn": "+79001110001",
            "to_msisdn": "+79001110002",
            "duration_sec": 10,
        },
    )
    assert r.status_code == 401


def test_post_events_with_valid_key(client, monkeypatch):
    monkeypatch.setattr(settings, "ingest_api_key", "unit-test-secret")
    r = client.post(
        "/v1/events",
        json={
            "event_type": "call",
            "from_msisdn": "+79001110003",
            "to_msisdn": "+79001110004",
            "duration_sec": 10,
        },
        headers={"X-API-Key": "unit-test-secret"},
    )
    assert r.status_code == 200
    assert r.json()["event_type"] == "call"


def test_purge_requires_key_when_configured(client, monkeypatch):
    monkeypatch.setattr(settings, "ingest_api_key", "unit-test-secret")
    assert client.post("/v1/events/purge").status_code == 401
    assert client.post("/v1/events/purge", headers={"X-API-Key": "unit-test-secret"}).status_code == 200
