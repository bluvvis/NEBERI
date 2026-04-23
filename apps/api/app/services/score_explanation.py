from __future__ import annotations

from app.services.risk_levels import LOW_MAX, MEDIUM_MAX, effective_risk_level_score


def build_score_explanation(
    *,
    rule_score: int,
    combined_score: int,
    blended_exact: float,
    blended_base: float,
    diversity_bonus: float,
    keyword_pattern_hits: int,
    ml_fraud_proba: float | None,
    blend_weight: float,
    ml_channel_attempted: bool,
    rules_fired_count: int,
) -> dict:
    """
    Словарь для JSON payload / ScoreExplanationOut: объяснимость для оператора.
    """
    eff = effective_risk_level_score(combined_score, rule_score)
    notes: list[str] = []
    ml_applied = ml_channel_attempted and blend_weight > 0 and ml_fraud_proba is not None
    w_used = blend_weight if ml_applied else None

    if diversity_bonus > 0:
        notes.append(
            f"К смеси добавлен бонус +{round(diversity_bonus, 1)}: больше совпадений с паттернами политики и/или длиннее текст "
            "(правила и ML без изменений — только числовая детализация)."
        )

    if ml_applied:
        if rule_score > combined_score:
            notes.append(
                "Уровень риска не занижается сильными правилами: смешанный скор ниже из-за "
                "ограниченной уверенности ML (другой язык/домен по сравнению с обучающей выборкой). "
                "Правила остаются основным объяснимым слоем."
            )
        elif combined_score > rule_score:
            notes.append("Текстовая модель добавила вес к скору по сравнению с одними только правилами.")

    w_eff = float(blend_weight) if ml_applied and blend_weight > 0 else 0.0
    w_eff = max(0.0, min(1.0, w_eff))
    r = rule_score
    if ml_applied and ml_fraud_proba is not None:
        blended_components = {
            "rule_branch": round((1.0 - w_eff) * r, 1),
            "ml_branch": round(w_eff * float(ml_fraud_proba) * 100.0, 1),
            "diversity_bonus": round(float(diversity_bonus), 1),
        }
    else:
        blended_components = {
            "rule_branch": round(float(r), 1),
            "ml_branch": 0.0,
            "diversity_bonus": round(float(diversity_bonus), 1),
        }

    return {
        "rule_score": rule_score,
        "blended_score": combined_score,
        "blended_base": round(float(blended_base), 1),
        "blended_exact": round(float(blended_exact), 1),
        "diversity_bonus": round(float(diversity_bonus), 1),
        "keyword_pattern_hits": int(keyword_pattern_hits),
        "rules_fired_count": int(rules_fired_count),
        "ml_fraud_proba": ml_fraud_proba,
        "ml_blend_weight": w_used,
        "effective_for_risk_level": eff,
        "low_max": LOW_MAX,
        "medium_max": MEDIUM_MAX,
        "fairness_notes": notes,
        "blended_components": blended_components,
    }
