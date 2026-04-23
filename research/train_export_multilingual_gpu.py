#!/usr/bin/env python3
"""
Опционально: мультиязычные эмбеддинги (sentence-transformers) + LogisticRegression на GPU.

Требования (локально, не в slim Docker API):
  pip install torch sentence-transformers scikit-learn pandas joblib
  # PyTorch с CUDA: https://pytorch.org/get-started/locally/

Сохраняет apps/api/ml_models/fraud_text_embed_pipeline.joblib — подставьте в compose:
  ML_PIPELINE_PATH=/app/ml_models/fraud_text_embed_pipeline.joblib
(смонтируйте файл или скопируйте в образ)

По умолчанию тренируется на UCI SMS Spam (EN); для русских текстов в консоли эмбеддинги всё равно полезнее, чем чистый TF-IDF на EN.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent
UCI_CSV = ROOT / "data" / "uci_smsspam_labeled.csv"
API_MODEL_DIR = Path(__file__).resolve().parent.parent / "apps" / "api" / "ml_models"
OUT_PATH = API_MODEL_DIR / "fraud_text_embed_pipeline.joblib"
MANIFEST_PATH = API_MODEL_DIR / "manifest_embed.json"


class SentenceEmbeddingTransformer(BaseEstimator, TransformerMixin):
    def __init__(
        self,
        model_name: str = "paraphrase-multilingual-MiniLM-L12-v2",
        batch_size: int = 64,
        device: str | None = None,
    ):
        self.model_name = model_name
        self.batch_size = batch_size
        self.device = device
        self._model = None

    def fit(self, X, y=None):
        import torch
        from sentence_transformers import SentenceTransformer

        dev = self.device or ("cuda" if torch.cuda.is_available() else "cpu")
        print(f"loading {self.model_name} on {dev} …")
        self._model = SentenceTransformer(self.model_name, device=dev)
        return self

    def transform(self, X):
        texts = [str(s) if s is not None else "" for s in X]
        emb = self._model.encode(
            texts,
            batch_size=self.batch_size,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True,
        )
        return np.asarray(emb, dtype=np.float32)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=0, help="0 = все строки; иначе случайная подвыборка для прогона")
    ap.add_argument("--model", default="paraphrase-multilingual-MiniLM-L12-v2")
    ap.add_argument("--batch-size", type=int, default=64)
    args = ap.parse_args()

    if not UCI_CSV.is_file():
        subprocess.run([sys.executable, str(ROOT / "fetch_uci_sms_spam.py")], check=False)
    if not UCI_CSV.is_file():
        print(f"FAIL: нет {UCI_CSV}, сначала fetch_uci_sms_spam.py", file=sys.stderr)
        return 2

    df = pd.read_csv(UCI_CSV)
    if args.sample and args.sample < len(df):
        df = df.sample(n=args.sample, random_state=42, stratify=df["label"])
        print(f"using subsample n={len(df)}")
    x = df["text"].astype(str).tolist()
    y = df["label"].astype(int).to_numpy()

    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)

    pipe = Pipeline(
        [
            ("emb", SentenceEmbeddingTransformer(model_name=args.model, batch_size=args.batch_size)),
            ("clf", LogisticRegression(max_iter=3000, class_weight="balanced", random_state=42, solver="saga")),
        ]
    )
    pipe.fit(x_train, y_train)
    proba_test = pipe.predict_proba(x_test)[:, 1]
    pred_test = (proba_test >= 0.5).astype(int)
    print("=== hold-out (20%) ===")
    print(classification_report(y_test, pred_test, digits=3, zero_division=0))
    auc = roc_auc_score(y_test, proba_test)
    print(f"ROC-AUC (hold-out): {auc:.3f}")

    pipe.fit(x, y)
    API_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, OUT_PATH)
    manifest = {
        "model_version": "minilm-multilingual-lr-2026.04.5",
        "dataset": "uci-sms-spam-collection-en",
        "embedding_model": args.model,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_samples": int(len(df)),
        "holdout_roc_auc": float(auc),
        "artifact": str(OUT_PATH.name),
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")
    print(f"Wrote {MANIFEST_PATH}")
    print("Подключение: скопируйте joblib в ml_models и выставьте ML_PIPELINE_PATH на этот файл.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
