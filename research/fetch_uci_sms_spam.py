#!/usr/bin/env python3
"""
Скачивает открытый датасет UCI SMS Spam Collection и сохраняет research/data/uci_smsspam_labeled.csv
(колонки text, label: 0=ham, 1=spam). Источник: https://archive.ics.uci.edu/dataset/228/sms+spam+collection
"""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent
OUT_CSV = ROOT / "data" / "uci_smsspam_labeled.csv"
# Прямая статическая выгрузка UCI (без логина).
UCI_ZIP_URL = "https://archive.ics.uci.edu/static/public/228/sms+spam+collection.zip"
INNER_NAME = "SMSSpamCollection"


def _parse_collection(raw: str) -> list[tuple[str, int]]:
    rows: list[tuple[str, int]] = []
    for line in raw.splitlines():
        line = line.strip("\r")
        if not line:
            continue
        parts = line.split("\t", 1)
        if len(parts) != 2:
            continue
        lab, txt = parts[0].strip().lower(), parts[1].strip()
        if lab not in ("ham", "spam"):
            continue
        if not txt:
            continue
        rows.append((txt, 1 if lab == "spam" else 0))
    return rows


def download_to_csv(force: bool = False) -> Path:
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    if OUT_CSV.is_file() and not force and OUT_CSV.stat().st_size > 50_000:
        print(f"cache hit: {OUT_CSV} ({OUT_CSV.stat().st_size} bytes)")
        return OUT_CSV

    print(f"downloading {UCI_ZIP_URL} …")
    with urlopen(UCI_ZIP_URL, timeout=180) as resp:  # noqa: S310 — фиксированный URL UCI
        blob = resp.read()
    zf = zipfile.ZipFile(io.BytesIO(blob))
    names = zf.namelist()
    inner = next((n for n in names if n.endswith(INNER_NAME)), None)
    if inner is None:
        raise RuntimeError(f"no {INNER_NAME} in zip, got: {names[:8]}…")

    raw = zf.read(inner).decode("utf-8", errors="replace")
    pairs = _parse_collection(raw)
    if len(pairs) < 1000:
        raise RuntimeError(f"too few rows parsed: {len(pairs)}")

    lines = ["text,label"]
    for txt, lab in pairs:
        esc = txt.replace('"', '""')
        lines.append(f'"{esc}",{lab}')
    OUT_CSV.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {OUT_CSV} ({len(pairs)} messages)")
    return OUT_CSV


def main() -> int:
    force = "--force" in sys.argv
    try:
        download_to_csv(force=force)
    except Exception as e:
        print(f"FAIL: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
