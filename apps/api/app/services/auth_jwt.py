from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import jwt

from app.config import settings


def create_access_token(user_id: uuid.UUID) -> str:
    now = datetime.now(timezone.utc)
    exp = now + timedelta(hours=settings.jwt_expires_hours)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
        "typ": "access",
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> uuid.UUID | None:
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        sub = data.get("sub")
        if not sub:
            return None
        return uuid.UUID(str(sub))
    except (jwt.PyJWTError, ValueError, TypeError):
        return None
