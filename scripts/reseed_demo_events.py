#!/usr/bin/env python3
"""
Перезаливка демо-событий в UTF-8.

Не используйте PowerShell `>` для JSON из stdout Node — получится UTF-16 и
испорченные строки в PostgreSQL (кракозябры в text_excerpt).

Пример (из корня репозитория):
  python scripts/reseed_demo_events.py
  set NEBERI_API_BASE=http://127.0.0.1:8000 && python scripts/reseed_demo_events.py --purge
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path


def _resolve_npx() -> str:
    exe = shutil.which("npx")
    if exe:
        return exe
    if sys.platform == "win32":
        exe = shutil.which("npx.cmd")
        if exe:
            return exe
    raise RuntimeError("npx не найден в PATH — установите Node.js и повторите.")


def _repo_root() -> Path:
    # .../NeBeri/scripts/reseed_demo_events.py -> корень репозитория
    return Path(__file__).resolve().parents[1]


def _load_demo_payloads() -> list[dict]:
    web_dir = _repo_root() / "apps" / "web"
    if not web_dir.is_dir():
        raise FileNotFoundError(f"apps/web not found: {web_dir}")
    export_ts = web_dir / "scripts" / "exportDemoPayloads.ts"
    if not export_ts.is_file():
        raise FileNotFoundError(f"missing {export_ts}")
    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp:
        out_path = Path(tmp.name)
    try:
        cmd = [_resolve_npx(), "--yes", "tsx", str(export_ts.relative_to(web_dir)), str(out_path)]
        proc = subprocess.run(
            cmd,
            cwd=web_dir,
            capture_output=True,
            check=False,
            env={**os.environ, "FORCE_COLOR": "0"},
        )
        if proc.returncode != 0:
            err = (proc.stderr or b"").decode("utf-8", errors="replace")
            raise RuntimeError(f"tsx failed rc={proc.returncode}: {err}")
        raw = out_path.read_bytes()
        if raw.startswith(b"\xef\xbb\xbf"):
            raw = raw[3:]
        return json.loads(raw.decode("utf-8"))
    finally:
        out_path.unlink(missing_ok=True)


def _post_json(url: str, body: object | None, method: str = "POST") -> tuple[int, str]:
    data = None if body is None else json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={"Content-Type": "application/json; charset=utf-8"} if data is not None else {},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} {url}: {body}") from e


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--api-base",
        default=os.environ.get("NEBERI_API_BASE", "http://127.0.0.1:8000").rstrip("/"),
        help="База URL API (переменная окружения NEBERI_API_BASE)",
    )
    p.add_argument("--purge", action="store_true", help="Сначала POST /v1/events/purge")
    args = p.parse_args()
    base = args.api_base

    if args.purge:
        status, text = _post_json(f"{base}/v1/events/purge", None)
        print("purge", status, text)

    payloads = _load_demo_payloads()
    for i, row in enumerate(payloads):
        status, _ = _post_json(f"{base}/v1/events", row)
        print(f"POST {i + 1}/{len(payloads)}", status)
    print("done", len(payloads))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, ValueError, subprocess.SubprocessError) as e:
        print(f"error: {e}", file=sys.stderr)
        raise SystemExit(1) from e
