"""Гибрид ML + правила: модель из репозитория, monkeypatch только при необходимости."""

from pathlib import Path

import pytest

from app.config import settings
from app.services import ml_scoring
from app.services.score_combine import blended_score_exact


@pytest.fixture
def pipeline_path() -> Path:
    p = Path(__file__).resolve().parents[1] / "ml_models" / "fraud_text_pipeline.joblib"
    if not p.is_file():
        pytest.skip("run: python research/train_export.py")
    return p


def test_ml_blend_formula_with_russian_rules(client, monkeypatch, pipeline_path: Path) -> None:
    """Правила (RU YAML) дают высокий rule_score; ML обучен на UCI (EN) — proba может быть низкой, формула смешивания всё равно верна."""
    monkeypatch.setattr(settings, "ml_pipeline_path", str(pipeline_path))
    monkeypatch.setattr(settings, "ml_blend_weight", 0.4)
    ml_scoring.reset_pipeline_cache_for_tests()

    r = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001230001",
            "to_msisdn": "+79007654321",
            "text": "Срочно переведите на карту 99999 блокировка счета служба безопасности банка",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["rule_score"] is not None
    assert data["ml_fraud_proba"] is not None
    assert data["rule_score"] >= 55
    w = 0.4
    ex = data.get("score_explanation")
    assert ex
    div = float(ex["diversity_bonus"])
    expected_score = int(
        round(blended_score_exact(int(data["rule_score"]), float(data["ml_fraud_proba"]), w, div)),
    )
    eff = max(0, min(100, max(expected_score, int(data["rule_score"]))))
    assert data["risk_score"] == eff
    assert data["risk_score"] == ex["effective_for_risk_level"]
    assert data["risk_level"] == "high"
    base = (1.0 - w) * data["rule_score"] + w * (data["ml_fraud_proba"] * 100.0)
    assert abs(float(ex["blended_base"]) - round(base, 1)) < 0.2
    assert abs(float(ex["blended_exact"]) - round(float(ex["blended_base"]) + div, 1)) < 0.2
    assert ex["rules_fired_count"] >= 2
    assert ex["fairness_notes"]
    assert data.get("ml_model_version")


def test_ml_uci_model_high_on_english_spam(client, monkeypatch, pipeline_path: Path) -> None:
    """Типичный англоязычный спам из того же домена, что и UCI — модель должна давать высокую proba."""
    monkeypatch.setattr(settings, "ml_pipeline_path", str(pipeline_path))
    monkeypatch.setattr(settings, "ml_blend_weight", 0.4)
    ml_scoring.reset_pipeline_cache_for_tests()

    r = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+447700900001",
            "to_msisdn": "+447700900002",
            "text": "WINNER!! You have been selected for a £5000 prize claim call now 09066660118 costs 150ppm",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ml_fraud_proba"] is not None
    assert data["ml_fraud_proba"] >= 0.45


def test_ml_disabled_when_blend_weight_zero(client, monkeypatch, pipeline_path: Path) -> None:
    monkeypatch.setattr(settings, "ml_pipeline_path", str(pipeline_path))
    monkeypatch.setattr(settings, "ml_blend_weight", 0.0)
    ml_scoring.reset_pipeline_cache_for_tests()

    r = client.post(
        "/v1/events",
        json={
            "event_type": "sms",
            "from_msisdn": "+79001230002",
            "to_msisdn": "+79007654321",
            "text": "Срочно переведите на карту 99999 блокировка счета",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ml_fraud_proba"] is None
    assert data["risk_score"] == data["rule_score"]
