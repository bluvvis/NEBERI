#!/usr/bin/env python3
"""
Обучает TF-IDF + LogisticRegression и сохраняет pipeline в apps/api/ml_models/.

По умолчанию — открытый корпус UCI SMS Spam (англ.), см. fetch_uci_sms_spam.py.
Альтернатива: `--dataset synthetic` (только RU-CSV) или **`--dataset combined`** (UCI + RU — лучше для русских текстов в консоли).
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.base import clone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent
SYNTHETIC = ROOT / "data" / "synthetic_sms_labelled.csv"
UCI_CSV = ROOT / "data" / "uci_smsspam_labeled.csv"
API_MODEL_DIR = Path(__file__).resolve().parent.parent / "apps" / "api" / "ml_models"
PIPE_PATH = API_MODEL_DIR / "fraud_text_pipeline.joblib"
MANIFEST_PATH = API_MODEL_DIR / "manifest.json"


def _ensure_uci() -> None:
    subprocess.run([sys.executable, str(ROOT / "fetch_uci_sms_spam.py")], check=False)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dataset",
        choices=("uci", "synthetic", "combined"),
        default="uci",
        help="uci | synthetic | combined (UCI + synthetic RU, дедуп по нормализованному text)",
    )
    ap.add_argument("--force-fetch", action="store_true", help="перекачать UCI zip")
    args = ap.parse_args()

    if args.dataset == "uci":
        if args.force_fetch:
            subprocess.run([sys.executable, str(ROOT / "fetch_uci_sms_spam.py"), "--force"], check=False)
        else:
            _ensure_uci()
        val = subprocess.run([sys.executable, str(ROOT / "validate_labeled_csv.py"), "--uci"], check=False)
        dataset_id = "uci-sms-spam-collection-en"
        model_ver = "tfidf-lr-uci-en-2026.04.6"
        source_note = "https://archive.ics.uci.edu/dataset/228/sms+spam+collection"
        language_note = (
            "Только UCI (англ.); для русских SMS в консоли предпочтительнее `--dataset combined` "
            "или `train_export_multilingual_gpu.py`."
        )
    elif args.dataset == "synthetic":
        val = subprocess.run([sys.executable, str(ROOT / "validate_labeled_csv.py"), "--synthetic"], check=False)
        dataset_id = "synthetic-ru-demo"
        model_ver = "tfidf-lr-synthetic-ru-2026.04.6"
        source_note = "research/data/synthetic_sms_labelled.csv"
        language_note = "Только учебный RU CSV (мало примеров); для стабильности лучше combined или UCI."
    else:
        if args.force_fetch:
            subprocess.run([sys.executable, str(ROOT / "fetch_uci_sms_spam.py"), "--force"], check=False)
        else:
            _ensure_uci()
        val = subprocess.run([sys.executable, str(ROOT / "validate_labeled_csv.py"), "--combined"], check=False)
        dataset_id = "uci-en-plus-synthetic-ru"
        model_ver = "tfidf-lr-combined-2026.04.6"
        source_note = "UCI SMS Spam + research/data/synthetic_sms_labelled.csv"
        language_note = (
            "Смесь EN (UCI) и размеченных RU-строк: лучше TF-IDF+LR на русских smishing-формулировках, "
            "чем только UCI; без GPU."
        )

    if val.returncode != 0:
        return val.returncode

    if args.dataset == "combined":
        uci_df = pd.read_csv(UCI_CSV)
        syn_df = pd.read_csv(SYNTHETIC)
        df = pd.concat([uci_df, syn_df], ignore_index=True)
        tnorm = df["text"].astype(str).str.strip().str.lower()
        df = df.assign(_tn=tnorm)
        df = df.sort_values("label", ascending=False).drop_duplicates(subset=["_tn"], keep="first")
        df = df.drop(columns=["_tn"]).reset_index(drop=True)
    elif args.dataset == "uci":
        df = pd.read_csv(UCI_CSV)
    else:
        df = pd.read_csv(SYNTHETIC)
    x = df["text"].astype(str).tolist()
    y = df["label"].astype(int).to_numpy()

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)

    pipe = Pipeline(
        [
            ("vec", TfidfVectorizer(ngram_range=(1, 2), min_df=2, max_df=0.9, sublinear_tf=True, max_features=50_000)),
            ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=42, solver="saga")),
        ]
    )
    pipe.fit(x_train, y_train)
    proba_test = pipe.predict_proba(x_test)[:, 1]
    pred_test = (proba_test >= 0.5).astype(int)

    print(f"=== dataset={dataset_id} rows={len(df)} ===")
    print("=== hold-out (20%) ===")
    print(classification_report(y_test, pred_test, digits=3, zero_division=0))
    try:
        auc = roc_auc_score(y_test, proba_test)
        print(f"ROC-AUC (hold-out): {auc:.3f}")
    except ValueError:
        auc = None

    n_pos, n_neg = int(y.sum()), int(len(y) - y.sum())
    n_folds = min(5, n_pos, n_neg)
    if n_folds >= 2:
        cv = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=42)
        tmpl = clone(pipe)
        scores = cross_val_score(tmpl, x, y, cv=cv, scoring="roc_auc")
        print(f"ROC-AUC CV ({n_folds} folds): mean={scores.mean():.3f} std={scores.std():.3f}")

    pipe.fit(x, y)
    API_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, PIPE_PATH)

    manifest = {
        "model_version": model_ver,
        "dataset": dataset_id,
        "open_data_source": source_note,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_samples": int(len(df)),
        "label_counts": {str(k): int(v) for k, v in df["label"].value_counts().items()},
        "holdout_roc_auc": auc,
        "sklearn_pipeline": "TfidfVectorizer(1-2gram, max_features=50k, min_df=2) + LogisticRegression(saga, balanced)",
        "language_note": language_note,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {PIPE_PATH} ({PIPE_PATH.stat().st_size} bytes)")
    print(f"Wrote {MANIFEST_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
