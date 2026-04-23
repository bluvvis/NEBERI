"""После изменения msisdn_reputation — выровнять risk_* и снимок репутации в fraud_events."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import FraudEvent
from app.schemas import fraud_event_to_event_out


def resync_fraud_events_risk_for_msisdn(db: Session, msisdn_normalized: str) -> int:
    """
    Пересчитать уровень/скор так же, как в ответе API (live reputation vs снимок в payload),
    и записать в колонки + обновить payload['caller_reputation'] под live, чтобы дельта стала 0.
    """
    stmt = select(FraudEvent).where(FraudEvent.from_msisdn_normalized == msisdn_normalized)
    evs = list(db.scalars(stmt).all())
    for ev in evs:
        out = fraud_event_to_event_out(ev, db=db)
        ev.risk_score = int(out.risk_score)
        ev.risk_level = str(out.risk_level)
        p = dict(ev.payload) if isinstance(ev.payload, dict) else {}
        if out.caller_reputation is not None:
            p["caller_reputation"] = out.caller_reputation.model_dump()
        else:
            p.pop("caller_reputation", None)
        ev.payload = p
    if evs:
        db.commit()
    return len(evs)
