"""Смешивание скоринга правил и ML (только для текстовых каналов, когда модель загружена).

Будущее (см. рейтинг специалиста в веб-профиле): множитель доверия к ручным репортам/оценкам репутации
в зависимости от агрегированного рейтинга оператора — планируется как отдельный коэффициент до/после
combine_rule_and_ml или в ветке ingest обратной связи, не меняя здесь контракт blended_score_exact без RFC.
"""


def blended_score_exact(
    rule_score: int,
    ml_fraud_proba: float | None,
    blend_weight: float,
    diversity_bonus: float = 0.0,
) -> float:
    """
    Точное значение смеси 0..100 до округления в int (для UI и аудита).
    При выключенном ML — clamp(rule_score) + diversity_bonus.
    diversity_bonus — прозрачный сдвиг (паттерны/длина текста), см. scoring.diversity_bonus_for_score.
    """
    r = max(0, min(100, int(rule_score)))
    b = max(0.0, float(diversity_bonus))
    if ml_fraud_proba is None or blend_weight <= 0:
        return max(0.0, min(100.0, float(r) + b))
    w = max(0.0, min(1.0, float(blend_weight)))
    ml_part = max(0.0, min(1.0, float(ml_fraud_proba))) * 100.0
    v = (1.0 - w) * r + w * ml_part + b
    return max(0.0, min(100.0, float(v)))


def combine_rule_and_ml(
    rule_score: int,
    ml_fraud_proba: float | None,
    blend_weight: float,
    diversity_bonus: float = 0.0,
) -> tuple[int, float | None]:
    """
    Возвращает (итоговый risk_score 0..100, тот же ml_fraud_proba или None).

    blend_weight в [0,1]: доля ML-ветки относительно шкалы 0..100 по вероятности;
    при None или weight<=0 — только правила (+ diversity_bonus).
    """
    rule_score = max(0, min(100, int(rule_score)))
    v = blended_score_exact(rule_score, ml_fraud_proba, blend_weight, diversity_bonus)
    combined = int(round(v))
    return max(0, min(100, combined)), ml_fraud_proba
