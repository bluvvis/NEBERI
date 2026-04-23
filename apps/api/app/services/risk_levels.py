"""Единые пороги risk_level по целочисленному скору (правила и/или гибрид с ML)."""

LOW_MAX = 20
MEDIUM_MAX = 54


def risk_level_from_score(score: int) -> str:
    if score <= LOW_MAX:
        return "low"
    if score <= MEDIUM_MAX:
        return "medium"
    return "high"


def effective_risk_level_score(combined_score: int, rule_score: int) -> int:
    """
    Скор для присвоения risk_level: max(смесь, правила).

    Если ML занижает число относительно сработавших правил (другой язык/домен),
    уровень риска не занижается — объяснимо для оператора и «fair-by-design».
    """
    c = max(0, min(100, int(combined_score)))
    r = max(0, min(100, int(rule_score)))
    return max(c, r)
