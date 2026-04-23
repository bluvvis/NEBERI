def test_reasons_include_https_references(client):
    text = (
        "\u041f\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430 \u043a\u0430\u0440\u0442\u0443 "
        "5000, \u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u043a\u0430 \u0441\u0447\u0435\u0442\u0430"
    )
    r = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001234599",
            "to_msisdn": "+79007654321",
            "text": text,
        },
    )
    assert r.status_code == 200
    scam = next(x for x in r.json()["reasons"] if x["rule_id"] == "scam_keywords")
    assert scam.get("references"), "policy should attach open references"
    urls = {ref["url"] for ref in scam["references"]}
    assert any("archive.ics.uci.edu" in u for u in urls)
    assert any("mendeley.com" in u for u in urls)
    for ref in scam["references"]:
        assert ref["url"].startswith("https://")


def test_post_sms_high_risk_keywords(client):
    # Без «срочно» — только scam_keywords → medium (см. coercion_urgency в политике).
    text = (
        "\u041f\u0435\u0440\u0435\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u0430 \u043a\u0430\u0440\u0442\u0443 "
        "5000, \u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u043a\u0430 \u0441\u0447\u0435\u0442\u0430"
    )
    r = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001234567",
            "to_msisdn": "+79007654321",
            "text": text,
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["risk_score"] >= 28
    assert data["risk_level"] == "medium"
    assert any(x["rule_id"] == "scam_keywords" for x in data["reasons"])


def test_post_sms_coercion_plus_scam_high(client):
    r = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001234568",
            "to_msisdn": "+79007654321",
            "text": "Срочно переведите на карту 5000, блокировка счета",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["risk_level"] == "high"
    assert data["risk_score"] >= 55
    ids = {x["rule_id"] for x in data["reasons"]}
    assert "scam_keywords" in ids
    assert "coercion_urgency" in ids


def test_events_stats(client):
    client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79003330001",
            "to_msisdn": "+79003330002",
            "text": "Срочно переведите на карту 1 блокировка счета",
        },
    )
    r = client.get("/v1/events/stats")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data and data["total"] >= 1
    assert data["by_risk"]["high"] >= 1


def test_list_events(client):
    client.post(
        "/v1/events",
        json={
            "event_type": "call",
            "from_msisdn": "+79001111111",
            "to_msisdn": "+79002222222",
            "duration_sec": 120,
        },
    )
    r = client.get("/v1/events")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_list_events_filter_by_event_type(client):
    client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79009990001",
            "to_msisdn": "+79007654321",
            "text": "только смс для фильтра",
        },
    )
    client.post(
        "/v1/events",
        json={
            "event_type": "call",
            "from_msisdn": "+79009990002",
            "to_msisdn": "+79007654321",
            "duration_sec": 15,
        },
    )
    sms_only = client.get("/v1/events?event_type=sms&limit=200")
    assert sms_only.status_code == 200
    rows = sms_only.json()
    assert rows
    assert all(x["event_type"] == "sms" for x in rows)


def test_purge_all_events(client):
    client.post(
        "/v1/events",
        json={
            "event_type": "call",
            "from_msisdn": "+79999999999",
            "to_msisdn": "+78888888888",
            "duration_sec": 1,
        },
    )
    r = client.delete("/v1/events")
    assert r.status_code == 200
    body = r.json()
    assert "deleted" in body
    assert body["deleted"] >= 1
    r2 = client.get("/v1/events")
    assert r2.status_code == 200
    assert r2.json() == []


def test_purge_via_post_endpoint(client):
    client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001112233",
            "to_msisdn": "+79009998877",
            "text": "test",
        },
    )
    r = client.post("/v1/events/purge")
    assert r.status_code == 200
    assert r.json()["deleted"] >= 1
    assert client.get("/v1/events").json() == []


def test_purge_deleted_count_matches_rows(client):
    for i in range(3):
        client.post(
            "/v1/events",
            json={
                "event_type": "sms",
                "from_msisdn": f"+7900000000{i}",
                "to_msisdn": f"+7900000001{i}",
                "text": f"ping {i}",
            },
        )
    r = client.delete("/v1/events")
    assert r.status_code == 200
    assert r.json()["deleted"] == 3
    assert client.get("/v1/events").json() == []


def test_health(client):
    assert client.get("/health").json()["status"] == "ok"
