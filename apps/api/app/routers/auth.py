"""Регистрация, вход, профиль и аватар (MVP)."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import AppUser
from app.schemas_auth import DeleteMeIn, LoginIn, MePatchIn, RegisterIn, TokenOut, UserPublicOut
from app.services.auth_jwt import create_access_token, decode_access_token
from app.services.auth_password import hash_password, verify_password
from app.services.masking import mask_msisdn
from app.services.ru_msisdn import normalize_ru_mobile_msisdn_key

router = APIRouter(prefix="/v1/auth", tags=["auth"])

_MAX_AVATAR = 1_500_000


def _avatar_dir() -> Path:
    return Path(settings.user_upload_dir).resolve() / "avatars"


def _avatar_path(user_id: uuid.UUID) -> Path:
    return _avatar_dir() / str(user_id)


def _user_to_public(u: AppUser) -> UserPublicOut:
    masked = mask_msisdn("+" + u.phone_normalized)
    av = f"/v1/auth/avatars/{u.id}" if u.avatar_mimetype else None
    return UserPublicOut(id=u.id, nickname=u.nickname, phone_masked=masked, avatar_url=av)


def _get_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Нужен заголовок Authorization: Bearer …")
    return authorization[7:].strip()


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> AppUser:
    token = _get_bearer_token(authorization)
    uid = decode_access_token(token)
    if uid is None:
        raise HTTPException(status_code=401, detail="Сессия недействительна или истекла")
    user = db.get(AppUser, uid)
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")
    return user


def _resolve_login_user(db: Session, login: str, password: str) -> AppUser | None:
    raw = (login or "").strip()
    digits = "".join(c for c in raw if c.isdigit())
    user: AppUser | None = None
    if len(digits) >= 10:
        try:
            key = normalize_ru_mobile_msisdn_key(raw)
            user = db.scalar(select(AppUser).where(AppUser.phone_normalized == key))
        except ValueError:
            user = None
    if user is None:
        nn = raw.lower()
        user = db.scalar(select(AppUser).where(AppUser.nickname_normalized == nn))
    if user is None or not verify_password(password, user.password_hash):
        return None
    return user


@router.post("/register", response_model=TokenOut, status_code=201)
def register(body: RegisterIn, db: Session = Depends(get_db)) -> TokenOut:
    phone_key = normalize_ru_mobile_msisdn_key(body.phone)
    nick_norm = body.nickname.lower()
    u = AppUser(
        nickname=body.nickname,
        nickname_normalized=nick_norm,
        phone_normalized=phone_key,
        password_hash=hash_password(body.password),
        avatar_mimetype=None,
        user_settings={},
    )
    db.add(u)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.scalar(select(AppUser).where(AppUser.nickname_normalized == nick_norm))
        if existing:
            raise HTTPException(status_code=409, detail="Такой никнейм уже занят") from None
        existing_p = db.scalar(select(AppUser).where(AppUser.phone_normalized == phone_key))
        if existing_p:
            raise HTTPException(status_code=409, detail="Этот номер уже зарегистрирован") from None
        raise HTTPException(status_code=409, detail="Не удалось создать аккаунт") from None
    db.refresh(u)
    tok = create_access_token(u.id)
    return TokenOut(access_token=tok, user=_user_to_public(u))


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    u = _resolve_login_user(db, body.login, body.password)
    if u is None:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    tok = create_access_token(u.id)
    return TokenOut(access_token=tok, user=_user_to_public(u))


@router.get("/me", response_model=UserPublicOut)
def me(user: AppUser = Depends(get_current_user)) -> UserPublicOut:
    return _user_to_public(user)


@router.patch("/me", response_model=UserPublicOut)
def patch_me(body: MePatchIn, user: AppUser = Depends(get_current_user), db: Session = Depends(get_db)) -> UserPublicOut:
    if body.nickname is None:
        return _user_to_public(user)
    nn = body.nickname.lower()
    if nn == user.nickname_normalized:
        user.nickname = body.nickname
        db.commit()
        db.refresh(user)
        return _user_to_public(user)
    conflict = db.scalar(select(AppUser).where(AppUser.nickname_normalized == nn, AppUser.id != user.id))
    if conflict:
        raise HTTPException(status_code=409, detail="Такой никнейм уже занят")
    user.nickname = body.nickname
    user.nickname_normalized = nn
    db.commit()
    db.refresh(user)
    return _user_to_public(user)


@router.delete("/me", status_code=204)
def delete_me(
    body: DeleteMeIn,
    user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный пароль")
    p = _avatar_path(user.id)
    if p.is_file():
        try:
            p.unlink()
        except OSError:
            pass
    db.delete(user)
    db.commit()


@router.post("/me/avatar", response_model=UserPublicOut)
async def upload_avatar(
    file: UploadFile = File(...),
    user: AppUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPublicOut:
    raw = await file.read()
    if len(raw) > _MAX_AVATAR:
        raise HTTPException(status_code=413, detail="Файл слишком большой (макс. 1.5 МБ)")
    mime: str | None = None
    if len(raw) >= 4 and raw[:4] == b"\x89PNG":
        mime = "image/png"
    elif len(raw) >= 3 and raw[:3] == b"\xff\xd8\xff":
        mime = "image/jpeg"
    if mime is None:
        raise HTTPException(status_code=422, detail="Нужен PNG или JPEG")
    _avatar_dir().mkdir(parents=True, exist_ok=True)
    path = _avatar_path(user.id)
    path.write_bytes(raw)
    user.avatar_mimetype = mime
    db.commit()
    db.refresh(user)
    return _user_to_public(user)


@router.delete("/me/avatar", response_model=UserPublicOut)
def delete_avatar(user: AppUser = Depends(get_current_user), db: Session = Depends(get_db)) -> UserPublicOut:
    p = _avatar_path(user.id)
    if p.is_file():
        try:
            p.unlink()
        except OSError:
            pass
    user.avatar_mimetype = None
    db.commit()
    db.refresh(user)
    return _user_to_public(user)


@router.get("/avatars/{user_id}")
def get_avatar(user_id: uuid.UUID, db: Session = Depends(get_db)):
    u = db.get(AppUser, user_id)
    if u is None or not u.avatar_mimetype:
        raise HTTPException(status_code=404, detail="Нет аватара")
    p = _avatar_path(user_id)
    if not p.is_file():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(str(p), media_type=u.avatar_mimetype)
