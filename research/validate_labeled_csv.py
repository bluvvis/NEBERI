#!/usr/bin/env python3
"""Проверка CSV text,label: для малого синтетика — жёстко; для UCI — только целостность и конфликты меток."""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path

import pandas as pd


def validate(
    path: Path,
    *,
    min_rows: int,
    min_minority: int,
    check_label_balance: bool,
) -> int:
    if not path.is_file():
        print(f"FAIL: missing {path}", file=sys.stderr)
        return 2
    df = pd.read_csv(path)
    if list(df.columns) != ["text", "label"]:
        print("FAIL: columns must be exactly text,label", file=sys.stderr)
        return 2
    if df["text"].isna().any() or (df["text"].astype(str).str.strip() == "").any():
        print("FAIL: empty text rows", file=sys.stderr)
        return 2
    labels = set(df["label"].unique().tolist())
    if not labels.issubset({0, 1}):
        print(f"FAIL: labels must be 0/1, got {labels}", file=sys.stderr)
        return 2
    n = len(df)
    if n < min_rows:
        print(f"FAIL: need at least {min_rows} rows, got {n}", file=sys.stderr)
        return 2
    vc = df["label"].value_counts()
    if check_label_balance and vc.min() < min_minority:
        print(f"FAIL: minority class too small: {vc.to_dict()} (min {min_minority})", file=sys.stderr)
        return 2

    dup_map: dict[str, list[int]] = defaultdict(list)
    for i, t in enumerate(df["text"].astype(str).str.strip().str.lower()):
        dup_map[t].append(int(df["label"].iloc[i]))
    conflicts = [k for k, labs in dup_map.items() if len(set(labs)) > 1]
    if conflicts:
        print(f"FAIL: same text different labels (first): {conflicts[0][:80]!r}", file=sys.stderr)
        return 2

    print(f"OK: {n} rows, balance label={vc.to_dict()}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", type=Path, nargs="?", help="path to text,label csv")
    ap.add_argument("--uci", action="store_true", help="validate research/data/uci_smsspam_labeled.csv")
    ap.add_argument("--synthetic", action="store_true", help="validate small synthetic with strict rules")
    ap.add_argument(
        "--combined",
        action="store_true",
        help="проверить оба CSV для train_export.py --dataset combined (UCI + synthetic)",
    )
    args = ap.parse_args()

    root = Path(__file__).resolve().parent
    if args.combined:
        uci = root / "data" / "uci_smsspam_labeled.csv"
        syn = root / "data" / "synthetic_sms_labelled.csv"
        rc = validate(uci, min_rows=1000, min_minority=100, check_label_balance=True)
        if rc != 0:
            return rc
        return validate(syn, min_rows=32, min_minority=8, check_label_balance=True)
    if args.synthetic:
        p = root / "data" / "synthetic_sms_labelled.csv"
        return validate(p, min_rows=32, min_minority=8, check_label_balance=True)
    if args.uci or args.csv is None:
        p = root / "data" / "uci_smsspam_labeled.csv"
        return validate(p, min_rows=1000, min_minority=100, check_label_balance=True)
    return validate(
        args.csv,
        min_rows=32,
        min_minority=8,
        check_label_balance=True,
    )


if __name__ == "__main__":
    raise SystemExit(main())
