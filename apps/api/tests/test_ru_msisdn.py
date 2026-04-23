import pytest

from app.services.ru_msisdn import normalize_ru_mobile_msisdn_key, ru_mobile_display_e164


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("+79001234567", "79001234567"),
        ("+7 900 123 45 67", "79001234567"),
        ("89001234567", "79001234567"),
        ("8 900 123-45-67", "79001234567"),
    ],
)
def test_normalize_ru_mobile_ok(raw: str, expected: str) -> None:
    assert normalize_ru_mobile_msisdn_key(raw) == expected


@pytest.mark.parametrize(
    "raw",
    [
        "+14005550100",
        "+7900123456",
        "+790012345678",
        "9001234567",
        "",
        "abc",
    ],
)
def test_normalize_ru_mobile_rejects(raw: str) -> None:
    with pytest.raises(ValueError):
        normalize_ru_mobile_msisdn_key(raw)


def test_ru_mobile_display_e164() -> None:
    assert ru_mobile_display_e164("79001234567") == "+79001234567"
