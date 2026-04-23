"""Тесты загрузки и валидации YAML-политики."""

import tempfile
from datetime import datetime, timezone
from pathlib import Path

import pytest
import yaml
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base
from app.models import FraudEvent  # noqa: F401 — регистрация таблицы
from app.services.scoring import KEYWORD_SATURATION_RULE_ID, _load_policy, score_event


def test_load_policy_rejects_non_dict_yaml() -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        f.write("just a string\n")
        path = f.name
    try:
        with pytest.raises(ValueError, match="mapping"):
            _load_policy(path)
    finally:
        Path(path).unlink(missing_ok=True)


def test_load_policy_rejects_wrong_rules_type() -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump({"version": "1", "rules": "not-a-list"}, f, allow_unicode=True)
        path = f.name
    try:
        with pytest.raises(ValueError, match="list"):
            _load_policy(path)
    finally:
        Path(path).unlink(missing_ok=True)


def test_load_policy_file_not_found() -> None:
    with pytest.raises(FileNotFoundError):
        _load_policy("/nonexistent/policy_xyz.yaml")


@pytest.fixture
def db_session():
    eng = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=eng)
    S = sessionmaker(bind=eng)
    s = S()
    try:
        yield s
    finally:
        s.close()
        Base.metadata.drop_all(bind=eng)


def test_score_skips_malformed_rules(db_session) -> None:
    """Правило без id не валит весь скоринг; валидное правило срабатывает."""
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump(
            {
                "version": "test",
                "rules": [
                    {"no": "id", "weight": 99},
                    {
                        "id": "ok_keywords",
                        "weight": 10,
                        "message": "hit",
                        "when": {"type": "keywords", "event_types": ["sms"], "patterns": ["uniquemarker"]},
                    },
                ],
            },
            f,
            allow_unicode=True,
        )
        path = f.name
    try:
        score, level, hits, ver, _ph, _rep = score_event(
            db_session,
            event_type="sms",
            duration_sec=None,
            text="prefix uniquemarker suffix",
            occurred_at=datetime(2026, 4, 22, 12, 0, 0, tzinfo=timezone.utc),
            from_msisdn="+79001111111",
            to_msisdn="+79002222222",
            policy_path=path,
        )
        assert ver == "test"
        assert any(h.rule_id == "ok_keywords" for h in hits)
        assert score >= 10
    finally:
        Path(path).unlink(missing_ok=True)


def test_score_includes_yaml_references(db_session) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8") as f:
        yaml.dump(
            {
                "version": "ref-test",
                "rules": [
                    {
                        "id": "kw_with_refs",
                        "weight": 5,
                        "message": "kw",
                        "references": [
                            {"title": "Good", "url": "https://example.org/a", "kind": "paper"},
                            {"title": "Bad scheme", "url": "http://insecure.example/"},
                            {"title": "Not a dict"},
                        ],
                        "when": {"type": "keywords", "event_types": ["sms"], "patterns": ["findme"]},
                    },
                ],
            },
            f,
            allow_unicode=True,
        )
        path = f.name
    try:
        score, _level, hits, ver, _ph, _rep = score_event(
            db_session,
            event_type="sms",
            duration_sec=None,
            text="prefix findme suffix",
            occurred_at=datetime(2026, 4, 22, 12, 0, 0, tzinfo=timezone.utc),
            from_msisdn="+79001111111",
            to_msisdn="+79002222222",
            policy_path=path,
        )
        assert ver == "ref-test"
        h = next(x for x in hits if x.rule_id == "kw_with_refs")
        assert len(h.references) == 1
        assert h.references[0].title == "Good"
        assert h.references[0].url == "https://example.org/a"
        assert h.references[0].kind == "paper"
        assert score >= 5
    finally:
        Path(path).unlink(missing_ok=True)


def test_default_policy_differentiates_sms_by_keyword_density(db_session) -> None:
    """Одинаковые базовые правила (28+28), но разная плотность паттернов — разный rule_score."""
    policy_path = Path(__file__).resolve().parents[1] / "policies" / "default_rules.yaml"
    at = datetime(2026, 4, 22, 12, 0, 0, tzinfo=timezone.utc)
    base_kw = dict(
        db=db_session,
        event_type="sms",
        duration_sec=None,
        occurred_at=at,
        from_msisdn="+79001111111",
        to_msisdn="+79002222222",
        policy_path=str(policy_path),
    )
    light_text = "Срочно переведите на карту 10000 руб блокировка счета"
    dense_text = (
        "Срочно переведите на карту 10000 блокировка счета "
        "служба безопасности банка код из смс немедленно прямо сейчас"
    )
    score_light, _, hits_light, _, ph_light, _ = score_event(text=light_text, **base_kw)
    score_dense, _, hits_dense, _, ph_dense, _ = score_event(text=dense_text, **base_kw)
    assert ph_dense > ph_light
    assert score_dense > score_light
    assert score_light >= 56
    assert any(h.rule_id == KEYWORD_SATURATION_RULE_ID for h in hits_light)
    assert any(h.rule_id == KEYWORD_SATURATION_RULE_ID for h in hits_dense)


def test_default_policy_gray_social_engineering(db_session) -> None:
    """Правило social_engineering_gray ловит «серые» формулировки без классического «переведите на карту»."""
    policy_path = Path(__file__).resolve().parents[1] / "policies" / "default_rules.yaml"
    at = datetime(2026, 4, 22, 12, 0, 0, tzinfo=timezone.utc)
    text = "Здравствуйте, это финансовый отдел. Укажите полные реквизиты карты для возврата ошибочного списания."
    score, _level, hits, ver, _ph, _rep = score_event(
        db_session,
        event_type="sms",
        duration_sec=None,
        text=text,
        occurred_at=at,
        from_msisdn="+79001111111",
        to_msisdn="+79002222222",
        policy_path=str(policy_path),
    )
    assert ver == "2026.04.5"
    assert any(h.rule_id == "social_engineering_gray" for h in hits)
    assert score >= 18
