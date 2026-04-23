"""Репутация MSISDN и обратная связь по событиям."""

import uuid

from app.db import SessionLocal
from app.models import FraudEvent


def test_blocklist_adds_weight_and_caller_reputation(client):
    r0 = client.post(
        "/v1/reputation",
        json={
            "msisdn": "+79991112233",
            "list_type": "blocklist",
            "label": "тестовый спамер",
            "source": "pytest",
        },
    )
    assert r0.status_code == 200
    assert r0.json()["list_type"] == "blocklist"

    r1 = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79991112233",
            "to_msisdn": "+79007654321",
            "text": "привет как дела",
        },
    )
    assert r1.status_code == 200
    data = r1.json()
    assert data.get("caller_reputation") is not None
    assert data["caller_reputation"]["list_type"] == "blocklist"
    assert data["caller_reputation"]["weight"] == 18
    assert any(x["rule_id"] == "msisdn_reputation_block" for x in data["reasons"])


def test_allowlist_reduces_rule_score(client):
    client.post(
        "/v1/reputation",
        json={"msisdn": "+78885556677", "list_type": "allowlist", "label": "доверенный"},
    )
    r = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+78885556677",
            "to_msisdn": "+79007654321",
            "text": "Срочно переведите на карту 5000, блокировка счета",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["caller_reputation"]["list_type"] == "allowlist"
    assert data["caller_reputation"]["weight"] == -12
    assert any(x["rule_id"] == "msisdn_reputation_trust" for x in data["reasons"])


def test_list_reputation_get(client):
    client.post("/v1/reputation", json={"msisdn": "+71112223344", "list_type": "blocklist"})
    r = client.get("/v1/reputation")
    assert r.status_code == 200
    rows = r.json()
    assert isinstance(rows, list)
    assert any(x.get("msisdn_masked") for x in rows)


def test_remove_reputation(client):
    client.post("/v1/reputation", json={"msisdn": "+72223334455", "list_type": "allowlist"})
    r = client.post("/v1/reputation/remove", json={"msisdn": "+72223334455"})
    assert r.status_code == 200
    assert r.json() == {"removed": True}
    r2 = client.post("/v1/reputation/remove", json={"msisdn": "+72223334455"})
    assert r2.json() == {"removed": False}


def test_delete_reputation_by_id(client):
    r0 = client.post("/v1/reputation", json={"msisdn": "+76665554433", "list_type": "blocklist"})
    assert r0.status_code == 200
    eid = r0.json()["id"]
    r1 = client.delete(f"/v1/reputation/{eid}")
    assert r1.status_code == 200
    assert r1.json() == {"removed": True}
    assert client.delete(f"/v1/reputation/{eid}").status_code == 404


def test_reputation_rejects_non_ru_msisdn(client):
    r = client.post(
        "/v1/reputation",
        json={"msisdn": "+14005550100", "list_type": "blocklist"},
    )
    assert r.status_code == 422


def test_get_event_includes_prefill_tail_only_on_detail(client):
    ev = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001112299",
            "to_msisdn": "+79007654321",
            "text": "тест",
        },
    )
    assert ev.status_code == 200
    eid = ev.json()["id"]
    assert ev.json().get("from_msisdn_prefill_tail") is None

    detail = client.get(f"/v1/events/{eid}").json()
    assert detail["sender_reputation_supported"] is True
    assert detail["from_msisdn_prefill_tail"] == "9001112299"

    listed = client.get("/v1/events").json()
    row = next((x for x in listed if x["id"] == str(eid)), None)
    assert row is not None
    assert row.get("from_msisdn_prefill_tail") is None


def test_blocklist_resync_moves_event_into_high_risk_filter(client):
    """
    Список /v1/events?risk_level=… фильтрует по колонке FraudEvent.risk_level.
    После бана репутации live-скор растёт — без resync карточка «высокий», а фильтр нет.
    """
    ev = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79008887766",
            "to_msisdn": "+79007654321",
            "text": "привет для теста фильтра",
        },
    )
    assert ev.status_code == 200
    data = ev.json()
    eid = data["id"]
    # Детерминированный medium у порога high: +18 блока → 58 (high).
    db = SessionLocal()
    try:
        row = db.get(FraudEvent, uuid.UUID(eid))
        assert row is not None
        row.risk_score = 40
        row.risk_level = "medium"
        p = dict(row.payload) if isinstance(row.payload, dict) else {}
        p.pop("caller_reputation", None)
        row.payload = p
        db.commit()
    finally:
        db.close()

    listed = client.get("/v1/events?risk_level=medium").json()
    assert any(x["id"] == eid for x in listed)

    high_before = client.get("/v1/events?risk_level=high").json()
    assert all(x["risk_level"] == "high" for x in high_before)
    assert not any(x["id"] == eid for x in high_before)

    rep = client.post(
        "/v1/reputation",
        json={
            "msisdn": "+79008887766",
            "list_type": "blocklist",
            "label": "pytest ban",
            "source": "pytest",
        },
    )
    assert rep.status_code == 200

    high_after = client.get("/v1/events?risk_level=high").json()
    assert any(x["id"] == eid for x in high_after)
    row = next(x for x in high_after if x["id"] == eid)
    assert row["risk_level"] == "high"


def test_reputation_from_event_card(client):
    ev = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001112299",
            "to_msisdn": "+79007654321",
            "text": "тест",
        },
    )
    assert ev.status_code == 200
    eid = ev.json()["id"]
    r = client.post(
        f"/v1/events/{eid}/reputation",
        json={"list_type": "blocklist", "label": "из карточки"},
    )
    assert r.status_code == 200
    assert r.json()["list_type"] == "blocklist"
    listed = client.get("/v1/reputation").json()
    assert any(x.get("label") == "из карточки" for x in listed)
    feed = client.get("/v1/events").json()
    row = next((x for x in feed if x["id"] == eid), None)
    assert row is not None
    assert row.get("caller_reputation") is not None
    assert row["caller_reputation"]["list_type"] == "blocklist"
    assert row["caller_reputation"]["weight"] == 18


def test_reputation_from_event_fails_without_ru_sender(client):
    ev = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+14005550100",
            "to_msisdn": "+79007654321",
            "text": "test",
        },
    )
    assert ev.status_code == 200
    eid = ev.json()["id"]
    r = client.post(f"/v1/events/{eid}/reputation", json={"list_type": "blocklist"})
    assert r.status_code == 400


def test_missed_fraud_feedback_adds_sender_to_blocklist(client):
    """Первый отзыв «пропущенное мошенничество» по событию — номер в блок-листе репутации."""
    ev = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001234567",
            "to_msisdn": "+79007654321",
            "text": "переведите срочно",
        },
    )
    assert ev.status_code == 200
    eid = ev.json()["id"]
    fb = client.post(
        f"/v1/events/{eid}/feedback",
        json={"kind": "missed_fraud", "note": "клиент подтвердил убыток"},
    )
    assert fb.status_code == 200
    listed = client.get("/v1/reputation").json()
    assert any(
        x.get("list_type") == "blocklist"
        and x.get("source") == "feedback_missed_fraud"
        and "пропущенное мошенничество" in (x.get("label") or "")
        for x in listed
    )
    fb2 = client.post(f"/v1/events/{eid}/feedback", json={"kind": "missed_fraud", "note": "повтор"})
    assert fb2.status_code == 200


def test_list_recent_feedback_includes_from_masked(client):
    ev = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79005551122",
            "to_msisdn": "+79007654321",
            "text": "привет",
        },
    )
    assert ev.status_code == 200
    eid = ev.json()["id"]
    fb = client.post(
        f"/v1/events/{eid}/feedback",
        json={"kind": "false_positive", "note": "норм"},
    )
    assert fb.status_code == 200
    recent = client.get("/v1/events/feedback/recent?limit=20")
    assert recent.status_code == 200
    rows = recent.json()
    assert any(x["event_id"] == eid and x["kind"] == "false_positive" and x["note"] == "норм" for x in rows)
    assert any(x.get("from_msisdn_masked") for x in rows)
    hit = next(x for x in rows if x["event_id"] == eid)
    assert hit.get("event_type") == "sms"


def test_post_feedback_on_event(client):
    ev = client.post(
        "/v1/events",
        json={
            "event_type": "call",
            "from_msisdn": "+73334445566",
            "to_msisdn": "+74445556677",
            "duration_sec": 30,
        },
    )
    assert ev.status_code == 200
    eid = ev.json()["id"]
    fb = client.post(
        f"/v1/events/{eid}/feedback",
        json={"kind": "false_positive", "note": "клиент подтвердил легитимность"},
    )
    assert fb.status_code == 200
    body = fb.json()
    assert body["kind"] == "false_positive"
    assert body["note"] == "клиент подтвердил легитимность"

    detail = client.get(f"/v1/events/{eid}")
    assert detail.status_code == 200
    fbs = detail.json().get("feedbacks") or []
    assert len(fbs) == 1
    assert fbs[0]["kind"] == "false_positive"
