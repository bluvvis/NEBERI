"""Rate limiting (slowapi) — см. курс: безопасность backend, rate limiting."""

import hashlib

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings


def ingest_or_ip_key(request: Request) -> str:
    """Ключ лимита для мутаций репутации/отзывов: хэш API-ключа + IP (как в reputation_guard)."""
    raw_key = (request.headers.get("X-API-Key") or request.headers.get("X-Ingest-Key") or "").strip()
    ip = get_remote_address(request)
    return hashlib.sha256(f"{raw_key}|{ip}".encode("utf-8", errors="replace")).hexdigest()


limiter = Limiter(key_func=get_remote_address, enabled=settings.rate_limit_enabled)
