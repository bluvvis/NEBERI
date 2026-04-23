def normalize_msisdn(raw: str) -> str:
    """Цифры номера для справочников/репутации (совпадение с маскированием по последним цифрам)."""
    return "".join(c for c in (raw or "").strip() if c.isdigit())


def mask_msisdn(raw: str) -> str:
    """Маскирует номер для UI/логов (критерий приватности)."""
    digits = "".join(c for c in raw if c.isdigit())
    if len(digits) >= 4:
        tail = digits[-4:]
        return f"+***{tail}"
    return "+***"


def excerpt_text(text: str | None, max_len: int = 280) -> str | None:
    if not text:
        return None
    t = text.strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 1] + "…"
