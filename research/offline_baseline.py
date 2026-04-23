#!/usr/bin/env python3
"""
Offline baseline: TF-IDF + LogisticRegression vs «прокси правил» по ключевым фразам.

Связь с лекциями: жизненный цикл запроса заканчивается ответом, но улучшение сервиса
идёт через данные и метрики (SDPA: наблюдаемость, производительность мышление).

Здесь **нет** вызова FastAPI и **нет** артефакта модели в образе API — только отчёт в stdout.
См. также: docs/analytics/OFFLINE_EVALUATION.md
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "data" / "synthetic_sms_labelled.csv"

# Прокси текущих keyword-правил (подмножество паттернов из policies/default_rules.yaml).
_FRAUD_SUBSTRINGS = (
    "переведите на карту",
    "блокировка счета",
    "срочно пройдите по ссылке",
    "служба безопасности банка",
    "код из смс",
    "срочно",
    "немедленно",
    "прямо сейчас",
)


def rule_proxy_label(text: str) -> int:
    low = text.lower()
    return 1 if any(s in low for s in _FRAUD_SUBSTRINGS) else 0


def main() -> int:
    if not CSV_PATH.is_file():
        print(f"missing dataset: {CSV_PATH}", file=sys.stderr)
        return 2

    df = pd.read_csv(CSV_PATH)
    if list(df.columns) != ["text", "label"]:
        print("expected columns: text,label", file=sys.stderr)
        return 2

    x_raw = df["text"].astype(str).tolist()
    y = df["label"].astype(int).to_numpy()
    proxy = pd.Series(x_raw).map(rule_proxy_label).to_numpy()

    x_train, x_test, y_train, y_test, proxy_train, proxy_test = train_test_split(
        x_raw, y, proxy, test_size=0.25, random_state=42, stratify=y
    )

    vec = TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_df=1.0)
    x_train_m = vec.fit_transform(x_train)
    x_test_m = vec.transform(x_test)

    clf = LogisticRegression(max_iter=200, class_weight="balanced", random_state=42)
    clf.fit(x_train_m, y_train)
    ml_pred = clf.predict(x_test_m)

    print("=== NeBeri offline baseline (synthetic RU-ish SMS) ===\n")
    print(classification_report(y_test, ml_pred, digits=3, zero_division=0))

    agree_ml_proxy = (ml_pred == proxy_test).mean()
    agree_y_proxy = (y_test == proxy_test).mean()
    print(f"Test agreement ML vs rule-proxy: {agree_ml_proxy:.3f}")
    print(f"Test agreement gold vs rule-proxy: {agree_y_proxy:.3f}")
    print(
        "\nInterpretation: rule-proxy is rigid (FP/FN on edge phrasing); ML on the same corpus "
        "shows where labeled data would separate signals without swapping the hot path for a black box."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
