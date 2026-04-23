from __future__ import annotations

import json
import logging
import math
import threading
from pathlib import Path
from typing import Any

import joblib

from app.config import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_cached: Any = None  # sklearn Pipeline or False if missing / load error


def _api_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


def _resolved_pipeline_path() -> Path | None:
    raw = (settings.ml_pipeline_path or "").strip()
    if not raw:
        return None
    p = Path(raw)
    if not p.is_absolute():
        p = _api_root() / p
    if not p.is_file():
        return None
    return p


def _load_pipeline_locked() -> Any:
    global _cached
    with _lock:
        if _cached is not None:
            return _cached
        path = _resolved_pipeline_path()
        if path is None:
            if (settings.ml_pipeline_path or "").strip():
                logger.warning("ML pipeline path set but file not found: %s", settings.ml_pipeline_path)
            _cached = False
            return _cached
        try:
            _cached = joblib.load(path)
            logger.info("loaded ML pipeline from %s", path)
        except Exception:
            logger.exception("failed to load ML pipeline from %s", path)
            _cached = False
        return _cached


def predict_fraud_proba(text: str | None) -> float | None:
    """
    Вероятность класса fraud (1) для текста SMS/ASR; None если модель недоступна или пустой текст.
    """
    if not text or not text.strip():
        return None
    pipe = _load_pipeline_locked()
    if pipe is False or pipe is None:
        return None
    try:
        proba = pipe.predict_proba([text.strip()])[:, 1]
        val = float(proba[0])
        if not math.isfinite(val):
            logger.warning("ML returned non-finite proba: %s", val)
            return None
        return float(max(0.0, min(1.0, val)))
    except Exception:
        logger.exception("ML predict_proba failed")
        return None


def reset_pipeline_cache_for_tests() -> None:
    global _cached
    with _lock:
        _cached = None


def _manifest_path_for_pipeline(pipe_path: Path) -> Path:
    """Рядом с joblib: TF-IDF — manifest.json; multilingual embed — manifest_embed.json."""
    name = pipe_path.name.lower()
    if "embed" in name:
        return pipe_path.parent / "manifest_embed.json"
    return pipe_path.parent / "manifest.json"


def read_manifest_model_version() -> str | None:
    pipe = _resolved_pipeline_path()
    if pipe is None:
        return None
    m = _manifest_path_for_pipeline(pipe)
    if not m.is_file():
        return None
    try:
        data = json.loads(m.read_text(encoding="utf-8"))
        v = data.get("model_version")
        return str(v) if v else None
    except (OSError, json.JSONDecodeError, TypeError):
        return None
