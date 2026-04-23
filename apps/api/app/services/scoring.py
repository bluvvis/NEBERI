from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import yaml
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import FraudEvent, MsisdnReputation
from app.services.masking import mask_msisdn, normalize_msisdn
from app.services.risk_levels import risk_level_from_score

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class SourceRef:
    title: str
    url: str
    kind: str | None = None


@dataclass(frozen=True)
class RuleHit:
    rule_id: str
    message: str
    weight: int
    references: tuple[SourceRef, ...] = ()


_MAX_REFERENCES_PER_RULE = 8


def _parse_rule_references(rule: dict[str, Any], rule_id: str) -> tuple[SourceRef, ...]:
    """Читает optional `references` из YAML; только https, чтобы не тащить javascript: в UI."""
    raw = rule.get("references")
    if raw is None:
        return ()
    if not isinstance(raw, list):
        logger.warning("rule %s: references must be a list, ignored", rule_id)
        return ()
    out: list[SourceRef] = []
    for item in raw[:_MAX_REFERENCES_PER_RULE]:
        if not isinstance(item, dict):
            continue
        title = item.get("title")
        url = item.get("url")
        if not isinstance(title, str) or not isinstance(url, str):
            continue
        title = title.strip()
        url = url.strip()
        kind = item.get("kind")
        kind_s = kind.strip() if isinstance(kind, str) and kind.strip() else None
        if not title or not url or not url.startswith("https://"):
            logger.warning("rule %s: skip bad reference entry (need https title+url)", rule_id)
            continue
        if len(title) > 200 or len(url) > 500 or (kind_s and len(kind_s) > 64):
            continue
        out.append(SourceRef(title=title, url=url, kind=kind_s))
    return tuple(out)


def _load_policy(path: str) -> dict[str, Any]:
    p = Path(path)
    if not p.is_file():
        p = Path(__file__).resolve().parent.parent.parent / path
    if not p.is_file():
        raise FileNotFoundError(f"policy file not found: {path}")
    with p.open(encoding="utf-8") as f:
        raw = yaml.safe_load(f)
    if not isinstance(raw, dict):
        raise ValueError("policy YAML must be a mapping at the root")
    if raw.get("rules") is not None and not isinstance(raw["rules"], list):
        raise ValueError("policy.rules must be a list")
    return raw


def _in_night_local(occurred_at: datetime, start_h: int, end_h: int) -> bool:
    """Локальное время UTC для MVP (в проде — TZ абонента)."""
    if occurred_at.tzinfo is None:
        occurred_at = occurred_at.replace(tzinfo=timezone.utc)
    h = occurred_at.astimezone(timezone.utc).hour
    if start_h <= end_h:
        return start_h <= h < end_h
    return h >= start_h or h < end_h


def _text_matches_keywords(text: str | None, patterns: list[str]) -> bool:
    if not text:
        return False
    low = text.lower()
    return any(p.lower() in low for p in patterns)


def count_keyword_pattern_hits(text: str | None, event_type: str, policy: dict[str, Any]) -> int:
    """Сколько отдельных паттернов keyword-правил встретилось в тексте (для дифференциации smishing при тех же весах)."""
    if not text or not text.strip():
        return 0
    low = text.lower()
    n = 0
    for rule in policy.get("rules", []):
        if not isinstance(rule, dict):
            continue
        when = rule.get("when") or {}
        if when.get("type") != "keywords":
            continue
        et_allowed = when.get("event_types")
        if et_allowed and event_type not in et_allowed:
            continue
        for p in when.get("patterns", []) or []:
            if isinstance(p, str) and p.lower() in low:
                n += 1
    return n


def _saturation_rule_weight(pattern_hits: int) -> int:
    """Доп. вес к rule_score: сколько разных keyword-паттернов из YAML встретилось в тексте (см. count_keyword_pattern_hits)."""
    if pattern_hits <= 1:
        return 0
    return min(12, (pattern_hits - 1) * 2)


def _length_rule_weight(text: str | None, event_type: str) -> int:
    """Доп. вес для sms/voice_text: более длинные социальные сценарии — чуть выше скор (кап)."""
    if event_type not in ("sms", "voice_text") or not text or not text.strip():
        return 0
    n = len(text.strip())
    if n <= 36:
        return 0
    if n <= 72:
        return 2
    if n <= 120:
        return 4
    return min(8, 4 + (n - 120) // 60)


KEYWORD_SATURATION_RULE_ID = "keyword_saturation"
TEXT_LENGTH_SIGNAL_RULE_ID = "text_length_signal"
REPUTATION_BLOCK_RULE_ID = "msisdn_reputation_block"
REPUTATION_TRUST_RULE_ID = "msisdn_reputation_trust"
REPUTATION_BLOCK_WEIGHT = 18
REPUTATION_TRUST_WEIGHT = -12


def _apply_msisdn_reputation(db: Session, from_msisdn: str, reasons: list[RuleHit]) -> dict[str, Any] | None:
    key = normalize_msisdn(from_msisdn)
    if len(key) < 5:
        return None
    now = datetime.now(timezone.utc)
    row = db.scalar(
        select(MsisdnReputation).where(
            MsisdnReputation.msisdn_normalized == key,
            or_(MsisdnReputation.expires_at.is_(None), MsisdnReputation.expires_at > now),
        )
    )
    if not row:
        return None
    lt = (row.list_type or "").strip()
    if lt == "blocklist":
        reasons.append(
            RuleHit(
                REPUTATION_BLOCK_RULE_ID,
                "Номер отправителя в локальном блок-листе репутации",
                REPUTATION_BLOCK_WEIGHT,
                (),
            )
        )
        return {
            "list_type": "blocklist",
            "label": row.label,
            "source": row.source,
            "weight": REPUTATION_BLOCK_WEIGHT,
        }
    if lt == "allowlist":
        reasons.append(
            RuleHit(
                REPUTATION_TRUST_RULE_ID,
                "Номер отправителя в локальном списке доверенных",
                REPUTATION_TRUST_WEIGHT,
                (),
            )
        )
        return {
            "list_type": "allowlist",
            "label": row.label,
            "source": row.source,
            "weight": REPUTATION_TRUST_WEIGHT,
        }
    return None


def diversity_bonus_for_score(pattern_hits: int, text: str | None, event_type: str) -> float:
    """
    Прозрачный небольшой бонус к числовой смеси (не меняет сработавшие правила):
    сверх «типовых» двух совпадений — чуть выше скор; длиннее текст SMS/ASR — ещё чуть выше.
    """
    pb = min(2.2, max(0.0, (pattern_hits - 2) * 0.22))
    lb = 0.0
    if event_type in ("sms", "voice_text") and text and text.strip():
        lb = min(1.15, max(0.0, (len(text.strip()) - 36) / 200.0))
    return round(min(3.0, pb + lb), 2)


def _burst_short_calls(
    db: Session,
    from_digits: str,
    to_digits: str,
    window_minutes: int,
    min_calls: int,
    max_duration_seconds: int,
    before: datetime,
) -> bool:
    start = before - timedelta(minutes=window_minutes)
    q = (
        select(func.count())
        .select_from(FraudEvent)
        .where(
            FraudEvent.from_msisdn_masked == mask_msisdn(from_digits),
            FraudEvent.to_msisdn_masked == mask_msisdn(to_digits),
            FraudEvent.event_type == "call",
            FraudEvent.occurred_at >= start,
            FraudEvent.occurred_at < before,
            FraudEvent.duration_sec.isnot(None),
            FraudEvent.duration_sec <= max_duration_seconds,
        )
    )
    cnt = db.scalar(q) or 0
    return cnt >= (min_calls - 1)


def _burst_same_from_sms(db: Session, from_digits: str, window_minutes: int, min_events: int, before: datetime) -> bool:
    start = before - timedelta(minutes=window_minutes)
    q = (
        select(func.count())
        .select_from(FraudEvent)
        .where(
            FraudEvent.from_msisdn_masked == mask_msisdn(from_digits),
            FraudEvent.event_type == "sms",
            FraudEvent.occurred_at >= start,
            FraudEvent.occurred_at < before,
        )
    )
    cnt = db.scalar(q) or 0
    return cnt >= (min_events - 1)


def score_event(
    db: Session,
    *,
    event_type: str,
    duration_sec: int | None,
    text: str | None,
    occurred_at: datetime,
    from_msisdn: str,
    to_msisdn: str,
    policy_path: str | None = None,
) -> tuple[int, str, list[RuleHit], str, int, dict[str, Any] | None]:
    policy = _load_policy(policy_path or settings.policy_path)
    version = str(policy.get("version", settings.policy_version))
    reasons: list[RuleHit] = []

    for rule in policy.get("rules", []):
        if not isinstance(rule, dict):
            logger.warning("skip non-dict rule entry")
            continue
        rid = rule.get("id")
        if not rid:
            logger.warning("skip rule without id")
            continue
        try:
            w = int(rule.get("weight", 0))
        except (TypeError, ValueError):
            logger.warning("skip rule %s: bad weight", rid)
            continue
        msg = str(rule.get("message", ""))
        refs = _parse_rule_references(rule, str(rid))
        when = rule.get("when") or {}
        wtype = when.get("type")
        et_allowed = when.get("event_types")
        if et_allowed and event_type not in et_allowed:
            continue

        if wtype == "keywords":
            if _text_matches_keywords(text, when.get("patterns", [])):
                reasons.append(RuleHit(rid, msg, w, refs))

        elif wtype == "night_call":
            if _in_night_local(occurred_at, int(when.get("start_hour", 0)), int(when.get("end_hour", 5))):
                reasons.append(RuleHit(rid, msg, w, refs))

        elif wtype == "short_duration":
            max_sec = int(when.get("max_seconds", 3))
            if event_type == "call" and duration_sec is not None and duration_sec <= max_sec:
                reasons.append(RuleHit(rid, msg, w, refs))

        elif wtype == "burst_short_calls":
            if event_type == "call" and duration_sec is not None and duration_sec <= int(
                when.get("max_duration_seconds", 5)
            ):
                if _burst_short_calls(
                    db,
                    from_msisdn,
                    to_msisdn,
                    int(when.get("window_minutes", 20)),
                    int(when.get("min_calls", 5)),
                    int(when.get("max_duration_seconds", 5)),
                    occurred_at,
                ):
                    reasons.append(RuleHit(rid, msg, w, refs))

        elif wtype == "burst_same_from":
            if event_type == "sms" and _burst_same_from_sms(
                db,
                from_msisdn,
                int(when.get("window_minutes", 10)),
                int(when.get("min_events", 8)),
                occurred_at,
            ):
                reasons.append(RuleHit(rid, msg, w, refs))

        else:
            logger.debug("unknown rule type %s for %s", wtype, rid)

    pattern_hits = count_keyword_pattern_hits(text, event_type, policy)
    sat_w = _saturation_rule_weight(pattern_hits)
    if sat_w > 0:
        reasons.append(
            RuleHit(
                KEYWORD_SATURATION_RULE_ID,
                "В тексте несколько разных маркеров из политики (плотность smishing-сигналов)",
                sat_w,
                (),
            )
        )
    len_w = _length_rule_weight(text, event_type)
    if len_w > 0:
        reasons.append(
            RuleHit(
                TEXT_LENGTH_SIGNAL_RULE_ID,
                "Длина текста в канале sms/voice_text (типично длиннее у социальной инженерии)",
                len_w,
                (),
            )
        )

    rep_snapshot = _apply_msisdn_reputation(db, from_msisdn, reasons)

    total = min(100, max(0, sum(r.weight for r in reasons)))
    return total, risk_level_from_score(total), reasons, version, pattern_hits, rep_snapshot
