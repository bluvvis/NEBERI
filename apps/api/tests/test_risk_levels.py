from app.services.risk_levels import effective_risk_level_score, risk_level_from_score


def test_effective_risk_level_score_never_below_rules() -> None:
    assert effective_risk_level_score(41, 56) == 56
    assert effective_risk_level_score(56, 56) == 56
    assert effective_risk_level_score(60, 30) == 60


def test_risk_level_thresholds() -> None:
    assert risk_level_from_score(20) == "low"
    assert risk_level_from_score(21) == "medium"
    assert risk_level_from_score(54) == "medium"
    assert risk_level_from_score(55) == "high"
