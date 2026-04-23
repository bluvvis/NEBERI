"""Регистрация, вход, профиль, удаление аккаунта."""

import pytest


def _reg(client, nick: str, phone: str, pwd: str = "password123"):
    return client.post(
        "/v1/auth/register",
        json={"nickname": nick, "phone": phone, "password": pwd},
    )


def test_register_login_me(client):
    r = _reg(client, "alpha_user", "+79991112233")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["access_token"]
    assert body["user"]["nickname"] == "alpha_user"
    assert "+***" in body["user"]["phone_masked"]
    tok = body["access_token"]

    r2 = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r2.status_code == 200
    assert r2.json()["nickname"] == "alpha_user"

    r3 = client.post("/v1/auth/login", json={"login": "alpha_user", "password": "password123"})
    assert r3.status_code == 200

    r4 = client.post("/v1/auth/login", json={"login": "+7 999 111-22-33", "password": "password123"})
    assert r4.status_code == 200


def test_register_duplicate_nickname(client):
    assert _reg(client, "dup_nick", "+79991112200").status_code == 201
    r2 = _reg(client, "dup_nick", "+79991112201")
    assert r2.status_code == 409
    assert "ник" in r2.json()["detail"].lower() or "занят" in r2.json()["detail"].lower()


def test_register_duplicate_phone(client):
    assert _reg(client, "user_a", "+79992221100").status_code == 201
    r2 = _reg(client, "user_b", "+79992221100")
    assert r2.status_code == 409
    assert "номер" in r2.json()["detail"].lower()


def test_login_wrong_password(client):
    assert _reg(client, "pw_user", "+79993331100").status_code == 201
    r = client.post("/v1/auth/login", json={"login": "pw_user", "password": "wrongwrong9"})
    assert r.status_code == 401


def test_me_without_token(client):
    assert client.get("/v1/auth/me").status_code == 401


def test_delete_me_requires_password(client):
    r = _reg(client, "del_user", "+79994441100")
    assert r.status_code == 201
    tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    bad = client.request("DELETE", "/v1/auth/me", headers=h, json={"password": "wrong"})
    assert bad.status_code == 401

    ok = client.request("DELETE", "/v1/auth/me", headers=h, json={"password": "password123"})
    assert ok.status_code == 204

    assert client.get("/v1/auth/me", headers=h).status_code == 401


def test_patch_nickname(client):
    r = _reg(client, "patch_me", "+79995551100")
    assert r.status_code == 201
    tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    r2 = client.patch("/v1/auth/me", headers=h, json={"nickname": "new_nick_ok"})
    assert r2.status_code == 200
    assert r2.json()["nickname"] == "new_nick_ok"


def test_patch_nickname_conflict(client):
    assert _reg(client, "owner_x", "+79996661100").status_code == 201
    r = _reg(client, "other_y", "+79996661101")
    assert r.status_code == 201
    tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    r2 = client.patch("/v1/auth/me", headers=h, json={"nickname": "owner_x"})
    assert r2.status_code == 409


def test_avatar_png_roundtrip(client):
    r = _reg(client, "av_user", "+79997771100")
    assert r.status_code == 201
    tok = r.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    uid = r.json()["user"]["id"]
    png = b"\x89PNG\r\n\x1a\n" + b"\x00" * 40
    r2 = client.post(
        "/v1/auth/me/avatar",
        headers=h,
        files={"file": ("a.png", png, "image/png")},
    )
    assert r2.status_code == 200, r2.text
    assert r2.json()["avatar_url"] == f"/v1/auth/avatars/{uid}"

    r3 = client.get(f"/v1/auth/avatars/{uid}")
    assert r3.status_code == 200
    assert r3.content.startswith(b"\x89PNG")

    r4 = client.delete("/v1/auth/me/avatar", headers=h)
    assert r4.status_code == 200
    assert r4.json()["avatar_url"] is None
