def test_idempotency_same_key_returns_same_resource(client):
    key = "idem-test-001"
    payload = {
        "idempotency_key": key,
        "event_type": "call",
        "from_msisdn": "+79001111111",
        "to_msisdn": "+79002222222",
        "duration_sec": 60,
    }
    r1 = client.post("/v1/events", json=payload)
    r2 = client.post("/v1/events", json=payload)
    assert r1.status_code == 200, r1.text
    assert r2.status_code == 200, r2.text
    assert r1.json()["id"] == r2.json()["id"]
    assert r1.json()["idempotency_key"] == key


def test_idempotency_different_bodies_still_replays_first(client):
    """При совпадении ключа возвращается первое сохранённое решение (стандарт идемпотентности)."""
    key = "idem-test-002"
    r1 = client.post(
        "/v1/events",
        json={
            "idempotency_key": key,
            "event_type": "sms",
            "from_msisdn": "+79003334455",
            "to_msisdn": "+79006667788",
            "text": "переведите на карту срочно",
        },
    )
    r2 = client.post(
        "/v1/events",
        json={
            "idempotency_key": key,
            "event_type": "sms",
            "from_msisdn": "+79999999999",
            "to_msisdn": "+78888888888",
            "text": "совсем другой текст",
        },
    )
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]
    assert r1.json()["from_msisdn_masked"] == r2.json()["from_msisdn_masked"]
