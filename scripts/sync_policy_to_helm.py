#!/usr/bin/env python3
"""Копирует apps/api/policies/default_rules.yaml → deploy/helm/neberi/files/ (единый источник правды для chart)."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    src = root / "apps" / "api" / "policies" / "default_rules.yaml"
    dst = root / "deploy" / "helm" / "neberi" / "files" / "default_rules.yaml"
    if not src.is_file():
        print(f"missing {src}", file=sys.stderr)
        return 1
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dst)
    print(f"copied {src} -> {dst}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
