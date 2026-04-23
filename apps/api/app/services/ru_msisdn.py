"""Нормализация и проверка российского мобильного номера (E.164 в виде цифр: 7 + 10 цифр)."""

from __future__ import annotations

import re

from app.services.masking import normalize_msisdn

_RU_MOBILE_KEY = re.compile(r"^7\d{10}$")


def normalize_ru_mobile_msisdn_key(raw: str) -> str:
    """
    Принимает строку с номером, возвращает ровно 11 цифр 7XXXXXXXXXX.
    Допускает ввод с +7, 8… (11 цифр после нормализации с заменой ведущей 8 на 7).
    """
    s = (raw or "").strip()
    digits = normalize_msisdn(s)
    if len(digits) == 11 and digits[0] == "8":
        digits = "7" + digits[1:]
    if not _RU_MOBILE_KEY.fullmatch(digits):
        raise ValueError("номер должен быть российским мобильным: +7 и 10 цифр после кода страны")
    return digits


def ru_mobile_display_e164(key: str) -> str:
    """7XXXXXXXXXX → +7XXXXXXXXXX"""
    if len(key) == 11 and key.startswith("7"):
        return f"+{key}"
    return f"+{key}"
