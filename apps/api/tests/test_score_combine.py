"""Юнит-тесты смешивания rule_score и ML без HTTP/БД."""

import pytest

from app.services.score_combine import blended_score_exact, combine_rule_and_ml


@pytest.mark.parametrize(
    ("rule", "ml", "w", "expected_score"),
    [
        (0, None, 0.5, 0),
        (50, None, 0.5, 50),
        (40, None, 0.0, 40),
        (40, 0.25, 0.0, 40),
        (80, 0.5, 0.5, 65),
        (100, 1.0, 1.0, 100),
        (0, 1.0, 1.0, 100),
        (0, 0.0, 1.0, 0),
        (50, 0.5, 0.42, 50),
    ],
)
def test_combine_rule_and_ml(rule: int, ml: float | None, w: float, expected_score: int) -> None:
    score, stored = combine_rule_and_ml(rule, ml, w)
    assert score == expected_score
    assert stored == ml


def test_combine_clamps_rule_score() -> None:
    s, _ = combine_rule_and_ml(150, 0.5, 0.5)
    assert s == 75
    s2, _ = combine_rule_and_ml(-10, 0.5, 0.5)
    assert s2 == 25


def test_combine_clamps_blend_weight() -> None:
    s, _ = combine_rule_and_ml(50, 1.0, 2.0)
    assert s == 100
    s2, _ = combine_rule_and_ml(50, 0.0, -1.0)
    assert s2 == 50


def test_combine_clamps_ml_proba_to_score_scale() -> None:
    """Вероятность >1 даёт полную ML-ветку 100; <0 — как 0 на шкале ML."""
    s, _ = combine_rule_and_ml(0, 1.5, 1.0)
    assert s == 100
    s2, _ = combine_rule_and_ml(100, -0.5, 1.0)
    assert s2 == 0


def test_blended_score_exact_matches_int_roundtrip() -> None:
    v = blended_score_exact(56, 0.18, 0.42)
    assert round(v, 1) == 40.0
    assert int(round(v)) == 40


def test_diversity_bonus_shifts_blend() -> None:
    v0 = blended_score_exact(56, 0.18, 0.42, 0.0)
    v1 = blended_score_exact(56, 0.18, 0.42, 0.8)
    assert v1 - v0 == pytest.approx(0.8)
    s0, _ = combine_rule_and_ml(56, 0.18, 0.42, 0.0)
    s1, _ = combine_rule_and_ml(56, 0.18, 0.42, 0.8)
    assert s1 >= s0


def test_combine_rounding_matches_events_router() -> None:
    """Тот же int(round(...)), что в combine_rule_and_ml, после clamp rule_score."""
    rule_score, ml_p, w = 73, 0.12, 0.4
    expected = int(round((1.0 - w) * rule_score + w * (ml_p * 100.0)))
    s, _ = combine_rule_and_ml(rule_score, ml_p, w)
    assert s == max(0, min(100, expected))
