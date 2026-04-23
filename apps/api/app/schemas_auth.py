from __future__ import annotations

import re
import uuid
from typing import Annotated

from pydantic import BaseModel, Field, field_validator

_NICK = re.compile(r"^[a-zA-Z0-9_]{3,32}$")


class RegisterIn(BaseModel):
    nickname: Annotated[str, Field(min_length=3, max_length=32)]
    phone: Annotated[str, Field(min_length=10, max_length=32)]
    password: Annotated[str, Field(min_length=8, max_length=128)]

    @field_validator("nickname")
    @classmethod
    def nick_chars(cls, v: str) -> str:
        s = v.strip()
        if not _NICK.fullmatch(s):
            raise ValueError("ник: 3–32 символа, латиница, цифры и подчёркивание")
        return s


class LoginIn(BaseModel):
    """Логин: никнейм или номер в любом привычном виде (+7… / 8…)."""

    login: Annotated[str, Field(min_length=1, max_length=64)]
    password: Annotated[str, Field(min_length=1, max_length=128)]


class UserPublicOut(BaseModel):
    id: uuid.UUID
    nickname: str
    phone_masked: str
    avatar_url: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublicOut


class MePatchIn(BaseModel):
    nickname: Annotated[str | None, Field(default=None, min_length=3, max_length=32)] = None

    @field_validator("nickname")
    @classmethod
    def nick_opt(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        if not _NICK.fullmatch(s):
            raise ValueError("ник: 3–32 символа, латиница, цифры и подчёркивание")
        return s


class DeleteMeIn(BaseModel):
    password: Annotated[str, Field(min_length=1, max_length=128)]
