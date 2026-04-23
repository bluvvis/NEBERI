import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.limiter import ingest_or_ip_key, limiter
from app.models import EventFeedback, FraudEvent
from app.observability.metrics import (
    EVENTS_INGESTED,
    HIGH_RISK_EVENTS,
    IDEMPOTENT_REPLAYS,
    ML_BLEND_APPLIED,
    REQUEST_LATENCY,
    RULE_FIRES_TOTAL,
)
from app.ingest_auth import verify_ingest_api_key
from app.schemas import (
    EventFeedbackIn,
    EventFeedbackOut,
    EventFeedbackRecentOut,
    EventIn,
    EventOut,
    EventSenderReputationIn,
    EventsStatsOut,
    ReputationEntryOut,
    event_feedback_to_out,
    fraud_event_to_event_out,
)
from app.services.masking import excerpt_text, mask_msisdn
from app.services.reputation_guard import (
    assert_reputation_mutation_allowed,
    log_reputation_mutation,
    try_apply_missed_fraud_to_blocklist,
)
from app.services.reputation_store import reputation_row_to_entry_out, upsert_reputation_row
from app.services.ru_msisdn import normalize_ru_mobile_msisdn_key
from app.services.ml_scoring import predict_fraud_proba, read_manifest_model_version
from app.services.risk_levels import effective_risk_level_score, risk_level_from_score
from app.services.score_combine import blended_score_exact, combine_rule_and_ml
from app.services.score_explanation import build_score_explanation
from app.services.scoring import RuleHit, diversity_bonus_for_score, score_event


def _hits_to_reasons_json(hits: list[RuleHit]) -> list[dict]:
    rows: list[dict] = []
    for h in hits:
        refs = [{"title": r.title, "url": r.url, **({"kind": r.kind} if r.kind else {})} for r in h.references]
        rows.append({"rule_id": h.rule_id, "message": h.message, "weight": h.weight, "references": refs})
    return rows

router = APIRouter(prefix="/v1/events", tags=["events"])


@router.post("", response_model=EventOut, dependencies=[Depends(verify_ingest_api_key)])
@limiter.limit(settings.rate_limit_events)
def create_event(request: Request, body: EventIn, db: Session = Depends(get_db)) -> EventOut:
    t0 = time.perf_counter()
    occurred = body.occurred_at or datetime.now(timezone.utc)
    if occurred.tzinfo is None:
        occurred = occurred.replace(tzinfo=timezone.utc)

    if body.idempotency_key:
        existing = db.scalar(
            select(FraudEvent).where(FraudEvent.idempotency_key == body.idempotency_key.strip())
        )
        if existing:
            IDEMPOTENT_REPLAYS.inc()
            REQUEST_LATENCY.labels(method="POST", path="/v1/events").observe(time.perf_counter() - t0)
            return fraud_event_to_event_out(existing, db=db)

    try:
        rule_score, _rule_level, hits, policy_version, pattern_hits, rep_snapshot = score_event(
            db,
            event_type=body.event_type,
            duration_sec=body.duration_sec,
            text=body.text,
            occurred_at=occurred,
            from_msisdn=body.from_msisdn,
            to_msisdn=body.to_msisdn,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=f"policy file missing: {e}") from e
    except ValueError as e:
        raise HTTPException(status_code=500, detail=f"invalid policy: {e}") from e

    for h in hits:
        RULE_FIRES_TOTAL.labels(rule_id=h.rule_id, event_type=body.event_type).inc()

    reasons_json = _hits_to_reasons_json(hits)
    idem = body.idempotency_key.strip() if body.idempotency_key else None

    ml_channel_attempted = (
        body.event_type in ("sms", "voice_text")
        and settings.ml_blend_weight > 0
        and bool(body.text and body.text.strip())
    )
    ml_proba: float | None = None
    if ml_channel_attempted:
        ml_proba = predict_fraud_proba(body.text)

    div_bonus = diversity_bonus_for_score(pattern_hits, body.text, body.event_type)
    blended_base = blended_score_exact(rule_score, ml_proba, settings.ml_blend_weight, 0.0)
    blended_exact = blended_score_exact(rule_score, ml_proba, settings.ml_blend_weight, div_bonus)
    combined_score, ml_stored = combine_rule_and_ml(rule_score, ml_proba, settings.ml_blend_weight, div_bonus)
    # risk_score в ответе = max(смесь, правила), как и порог risk_level (не округлённая смесь).
    eff_level = effective_risk_level_score(combined_score, rule_score)
    risk_level = risk_level_from_score(eff_level)
    if ml_proba is not None and settings.ml_blend_weight > 0:
        ML_BLEND_APPLIED.labels(event_type=body.event_type).inc()

    ml_ver = read_manifest_model_version() if ml_proba is not None else None

    score_explanation = build_score_explanation(
        rule_score=rule_score,
        combined_score=combined_score,
        blended_exact=blended_exact,
        blended_base=blended_base,
        diversity_bonus=div_bonus,
        keyword_pattern_hits=pattern_hits,
        ml_fraud_proba=ml_stored,
        blend_weight=settings.ml_blend_weight,
        ml_channel_attempted=ml_channel_attempted,
        rules_fired_count=len(hits),
    )

    try:
        from_norm_key = normalize_ru_mobile_msisdn_key(body.from_msisdn)
    except ValueError:
        from_norm_key = None

    ev = FraudEvent(
        id=uuid.uuid4(),
        idempotency_key=idem,
        occurred_at=occurred,
        event_type=body.event_type,
        from_msisdn_masked=mask_msisdn(body.from_msisdn),
        from_msisdn_normalized=from_norm_key,
        to_msisdn_masked=mask_msisdn(body.to_msisdn),
        duration_sec=body.duration_sec,
        text_excerpt=excerpt_text(body.text),
        payload={
            "event_type": body.event_type,
            "duration_sec": body.duration_sec,
            "idempotency_key": idem,
            "rule_score": rule_score,
            "ml_fraud_proba": ml_stored,
            "ml_model_version": ml_ver,
            "score_explanation": score_explanation,
            **({"caller_reputation": rep_snapshot} if rep_snapshot else {}),
        },
        risk_score=eff_level,
        risk_level=risk_level,
        policy_version=policy_version,
        reasons=reasons_json,
    )
    db.add(ev)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        if idem:
            replay = db.scalar(select(FraudEvent).where(FraudEvent.idempotency_key == idem))
            if replay:
                IDEMPOTENT_REPLAYS.inc()
                REQUEST_LATENCY.labels(method="POST", path="/v1/events").observe(time.perf_counter() - t0)
                return fraud_event_to_event_out(replay, db=db)
        raise
    db.refresh(ev)

    EVENTS_INGESTED.labels(event_type=body.event_type, risk_level=risk_level).inc()
    if risk_level == "high":
        HIGH_RISK_EVENTS.inc()

    REQUEST_LATENCY.labels(method="POST", path="/v1/events").observe(time.perf_counter() - t0)
    return fraud_event_to_event_out(ev, db=db)


@router.get("", response_model=list[EventOut])
def list_events(
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    risk_level: str | None = Query(None, pattern="^(low|medium|high)$"),
    event_type: str | None = Query(None, pattern="^(call|sms|voice_text)$"),
) -> list[EventOut]:
    t0 = time.perf_counter()
    stmt = select(FraudEvent).order_by(FraudEvent.occurred_at.desc())
    if risk_level:
        stmt = stmt.where(FraudEvent.risk_level == risk_level)
    if event_type:
        stmt = stmt.where(FraudEvent.event_type == event_type)
    stmt = stmt.offset(offset).limit(limit)
    rows = db.scalars(stmt).all()
    REQUEST_LATENCY.labels(method="GET", path="/v1/events").observe(time.perf_counter() - t0)
    return [fraud_event_to_event_out(r, db=db) for r in rows]


@router.get("/stats", response_model=EventsStatsOut)
def events_stats(
    db: Session = Depends(get_db),
    risk_level: str | None = Query(None, pattern="^(low|medium|high)$"),
) -> EventsStatsOut:
    """Счётчики для UI: total с опциональным фильтром + разбивка по уровням по всей БД."""
    t0 = time.perf_counter()
    stmt_total = select(func.count()).select_from(FraudEvent)
    if risk_level:
        stmt_total = stmt_total.where(FraudEvent.risk_level == risk_level)
    total = int(db.scalar(stmt_total) or 0)

    rows = db.execute(select(FraudEvent.risk_level, func.count()).group_by(FraudEvent.risk_level)).all()
    by_risk: dict[str, int] = {"low": 0, "medium": 0, "high": 0}
    for lvl, cnt in rows:
        if lvl in by_risk:
            by_risk[lvl] = int(cnt)

    REQUEST_LATENCY.labels(method="GET", path="/v1/events/stats").observe(time.perf_counter() - t0)
    return EventsStatsOut(total=total, by_risk=by_risk)


def _purge_all_events_impl(db: Session) -> dict[str, int]:
    """Удалить все события (демо). Выключается через ALLOW_DEMO_EVENT_PURGE=false."""
    if not settings.allow_demo_event_purge:
        raise HTTPException(status_code=403, detail="demo event purge is disabled")
    stmt = delete(FraudEvent).returning(FraudEvent.id)
    result = db.execute(stmt)
    deleted_ids = result.scalars().all()
    db.commit()
    return {"deleted": len(deleted_ids)}


# POST — основной путь для консоли (DELETE часто режется прокси/старыми образами).
@router.post("/purge", status_code=200, dependencies=[Depends(verify_ingest_api_key)])
def purge_all_events_post(db: Session = Depends(get_db)) -> dict[str, int]:
    t0 = time.perf_counter()
    out = _purge_all_events_impl(db)
    REQUEST_LATENCY.labels(method="POST", path="/v1/events/purge").observe(time.perf_counter() - t0)
    return out


@router.delete("", status_code=200, dependencies=[Depends(verify_ingest_api_key)])
def purge_all_events_delete(db: Session = Depends(get_db)) -> dict[str, int]:
    t0 = time.perf_counter()
    out = _purge_all_events_impl(db)
    REQUEST_LATENCY.labels(method="DELETE", path="/v1/events").observe(time.perf_counter() - t0)
    return out


@router.post(
    "/{event_id}/reputation",
    response_model=ReputationEntryOut,
    dependencies=[Depends(verify_ingest_api_key)],
)
@limiter.limit(settings.rate_limit_reputation_mutations, key_func=ingest_or_ip_key)
def post_sender_reputation_from_event(
    request: Request,
    event_id: uuid.UUID,
    body: EventSenderReputationIn,
    db: Session = Depends(get_db),
) -> ReputationEntryOut:
    """Добавить отправителя события в блок-лист (allowlist только из раздела «Репутация» вручную)."""
    t0 = time.perf_counter()
    ev = db.get(FraudEvent, event_id)
    if not ev:
        REQUEST_LATENCY.labels(method="POST", path="/v1/events/reputation_from_event").observe(time.perf_counter() - t0)
        raise HTTPException(status_code=404, detail="event not found")
    if not ev.from_msisdn_normalized:
        REQUEST_LATENCY.labels(method="POST", path="/v1/events/reputation_from_event").observe(time.perf_counter() - t0)
        raise HTTPException(
            status_code=400,
            detail="для события нет российского номера +7 (10 цифр); добавьте номер вручную в разделе «Репутация»",
        )
    fp = ingest_or_ip_key(request)
    assert_reputation_mutation_allowed(
        db,
        fingerprint=fp,
        msisdn_normalized=ev.from_msisdn_normalized,
        list_type="blocklist",
    )
    row = upsert_reputation_row(
        db,
        msisdn_normalized=ev.from_msisdn_normalized,
        list_type="blocklist",
        label=body.label,
        source=body.source or "event_card_block",
        expires_at=None,
    )
    log_reputation_mutation(
        db,
        msisdn_normalized=ev.from_msisdn_normalized,
        list_type="blocklist",
        source="event_card_block",
        fingerprint=fp,
        event_id=event_id,
    )
    REQUEST_LATENCY.labels(method="POST", path="/v1/events/reputation_from_event").observe(time.perf_counter() - t0)
    return reputation_row_to_entry_out(row)


@router.post(
    "/{event_id}/feedback",
    response_model=EventFeedbackOut,
    dependencies=[Depends(verify_ingest_api_key)],
)
@limiter.limit(settings.rate_limit_event_feedback, key_func=ingest_or_ip_key)
def post_event_feedback(
    request: Request,
    event_id: uuid.UUID,
    body: EventFeedbackIn,
    db: Session = Depends(get_db),
) -> EventFeedbackOut:
    t0 = time.perf_counter()
    ev = db.get(FraudEvent, event_id)
    if not ev:
        REQUEST_LATENCY.labels(method="POST", path="/v1/events/feedback").observe(time.perf_counter() - t0)
        raise HTTPException(status_code=404, detail="event not found")
    prior_missed = int(
        db.scalar(
            select(func.count()).where(
                EventFeedback.event_id == event_id,
                EventFeedback.kind == "missed_fraud",
            )
        )
        or 0
    )
    fb = EventFeedback(id=uuid.uuid4(), event_id=event_id, kind=body.kind, note=body.note)
    db.add(fb)
    db.commit()
    db.refresh(fb)
    if body.kind == "missed_fraud" and ev.from_msisdn_normalized:
        try_apply_missed_fraud_to_blocklist(
            db,
            request=request,
            event_id=event_id,
            msisdn_normalized=ev.from_msisdn_normalized,
            note=body.note,
            prior_missed_feedback_rows=prior_missed,
        )
    REQUEST_LATENCY.labels(method="POST", path="/v1/events/feedback").observe(time.perf_counter() - t0)
    return event_feedback_to_out(fb)


@router.get("/feedback/recent", response_model=list[EventFeedbackRecentOut])
def list_recent_event_feedback(
    db: Session = Depends(get_db),
    limit: int = Query(80, ge=1, le=200),
) -> list[EventFeedbackRecentOut]:
    """Последние отзывы по событиям (для UI «Текущие записи» рядом со справочником репутации)."""
    t0 = time.perf_counter()
    stmt = (
        select(EventFeedback, FraudEvent.from_msisdn_masked, FraudEvent.event_type)
        .join(FraudEvent, EventFeedback.event_id == FraudEvent.id)
        .order_by(EventFeedback.created_at.desc())
        .limit(limit)
    )
    rows = db.execute(stmt).all()
    out: list[EventFeedbackRecentOut] = []
    for fb, masked, ev_type in rows:
        out.append(
            EventFeedbackRecentOut(
                id=fb.id,
                event_id=fb.event_id,
                kind=fb.kind,  # type: ignore[arg-type]
                note=fb.note,
                created_at=fb.created_at,
                from_msisdn_masked=str(masked),
                event_type=ev_type,  # type: ignore[arg-type]
            )
        )
    REQUEST_LATENCY.labels(method="GET", path="/v1/events/feedback_recent").observe(time.perf_counter() - t0)
    return out


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: uuid.UUID, db: Session = Depends(get_db)) -> EventOut:
    t0 = time.perf_counter()
    row = db.get(FraudEvent, event_id)
    REQUEST_LATENCY.labels(method="GET", path="/v1/events/by_id").observe(time.perf_counter() - t0)
    if not row:
        raise HTTPException(status_code=404, detail="event not found")
    feedbacks = db.scalars(
        select(EventFeedback)
        .where(EventFeedback.event_id == event_id)
        .order_by(EventFeedback.created_at.desc())
    ).all()
    return fraud_event_to_event_out(
        row, feedbacks=list(feedbacks), include_operator_prefill=True, db=db
    )
