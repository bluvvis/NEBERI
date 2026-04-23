#!/usr/bin/env python3
"""CI / offline_baseline: строгая проверка синтетического RU-CSV. Полный корпус — validate_labeled_csv.py."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent

if __name__ == "__main__":
    r = subprocess.run([sys.executable, str(ROOT / "validate_labeled_csv.py"), "--synthetic"])
    raise SystemExit(r.returncode)
