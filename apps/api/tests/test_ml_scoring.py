"""Поведение ml_scoring без загрузки тяжёлого embed-пайплайна (где возможно)."""

import json
from pathlib import Path

import pytest

from app.config import settings
from app.services import ml_scoring


def test_predict_empty_or_whitespace_returns_none(monkeypatch) -> None:
    monkeypatch.setattr(settings, "ml_pipeline_path", "ml_models/fraud_text_pipeline.joblib")
    ml_scoring.reset_pipeline_cache_for_tests()
    assert ml_scoring.predict_fraud_proba(None) is None
    assert ml_scoring.predict_fraud_proba("") is None
    assert ml_scoring.predict_fraud_proba("   \n\t") is None


def test_read_manifest_tf_idf_pipeline(monkeypatch) -> None:
    root = Path(__file__).resolve().parents[1]
    job = root / "ml_models" / "fraud_text_pipeline.joblib"
    if not job.is_file():
        pytest.skip("train_export artifact missing")
    monkeypatch.setattr(settings, "ml_pipeline_path", str(job))
    ml_scoring.reset_pipeline_cache_for_tests()
    v = ml_scoring.read_manifest_model_version()
    assert v is not None
    manifest = json.loads((root / "ml_models" / "manifest.json").read_text(encoding="utf-8"))
    assert v == manifest.get("model_version")


def test_read_manifest_embed_pipeline(monkeypatch) -> None:
    root = Path(__file__).resolve().parents[1]
    job = root / "ml_models" / "fraud_text_embed_pipeline.joblib"
    man = root / "ml_models" / "manifest_embed.json"
    if not job.is_file() or not man.is_file():
        pytest.skip("multilingual train artifact missing")
    monkeypatch.setattr(settings, "ml_pipeline_path", str(job))
    ml_scoring.reset_pipeline_cache_for_tests()
    v = ml_scoring.read_manifest_model_version()
    assert v is not None
    expected = json.loads(man.read_text(encoding="utf-8")).get("model_version")
    assert v == expected
