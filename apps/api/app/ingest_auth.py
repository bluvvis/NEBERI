"""Опциональная защита мутаций (POST события, purge) общим секретом."""

from __future__ import annotations

from fastapi import HTTPException, Request

from app.config import settings


def verify_ingest_api_key(request: Request) -> None:
    """
    Если INGEST_API_KEY задан в окружении — требуется заголовок X-API-Key с тем же значением.
    Пустое значение — режим как раньше (демо/локалка).
    """
    expected = (settings.ingest_api_key or "").strip()
    if not expected:
        return
    got = (request.headers.get("X-API-Key") or request.headers.get("X-Ingest-Key") or "").strip()
    if got != expected:
        raise HTTPException(status_code=401, detail="missing or invalid X-API-Key for ingest")
