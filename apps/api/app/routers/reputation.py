import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.ingest_auth import verify_ingest_api_key
from app.limiter import ingest_or_ip_key, limiter
from app.models import MsisdnReputation
from app.schemas import ReputationDeleteIn, ReputationEntryOut, ReputationUpsertIn
from app.services.reputation_guard import assert_reputation_mutation_allowed, log_reputation_mutation
from app.services.reputation_store import delete_reputation_by_normalized, reputation_row_to_entry_out, upsert_reputation_row
from app.services.ru_msisdn import normalize_ru_mobile_msisdn_key

router = APIRouter(prefix="/v1/reputation", tags=["reputation"])


@router.get("", response_model=list[ReputationEntryOut])
def list_reputation(
    db: Session = Depends(get_db),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    list_type: str | None = Query(None, pattern="^(blocklist|allowlist)$"),
) -> list[ReputationEntryOut]:
    now = datetime.now(timezone.utc)
    stmt = select(MsisdnReputation).where(
        (MsisdnReputation.expires_at.is_(None)) | (MsisdnReputation.expires_at > now)
    )
    if list_type:
        stmt = stmt.where(MsisdnReputation.list_type == list_type)
    stmt = stmt.order_by(MsisdnReputation.updated_at.desc()).offset(offset).limit(limit)
    rows = db.scalars(stmt).all()
    return [reputation_row_to_entry_out(r) for r in rows]


@router.post("", response_model=ReputationEntryOut, dependencies=[Depends(verify_ingest_api_key)])
@limiter.limit(settings.rate_limit_reputation_mutations, key_func=ingest_or_ip_key)
def upsert_reputation(request: Request, body: ReputationUpsertIn, db: Session = Depends(get_db)) -> ReputationEntryOut:
    try:
        key = normalize_ru_mobile_msisdn_key(body.msisdn)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    fp = ingest_or_ip_key(request)
    assert_reputation_mutation_allowed(db, fingerprint=fp, msisdn_normalized=key, list_type=body.list_type)
    row = upsert_reputation_row(
        db,
        msisdn_normalized=key,
        list_type=body.list_type,
        label=body.label,
        source=body.source,
        expires_at=body.expires_at,
    )
    log_reputation_mutation(
        db,
        msisdn_normalized=key,
        list_type=body.list_type,
        source=(body.source or "manual")[:64],
        fingerprint=fp,
        event_id=None,
    )
    return reputation_row_to_entry_out(row)


@router.delete("/{entry_id}", dependencies=[Depends(verify_ingest_api_key)])
@limiter.limit(settings.rate_limit_reputation_mutations, key_func=ingest_or_ip_key)
def delete_reputation_entry(request: Request, entry_id: uuid.UUID, db: Session = Depends(get_db)) -> dict[str, bool]:
    row = db.get(MsisdnReputation, entry_id)
    if not row:
        raise HTTPException(status_code=404, detail="reputation entry not found")
    db.delete(row)
    db.commit()
    return {"removed": True}


@router.post("/remove", dependencies=[Depends(verify_ingest_api_key)])
@limiter.limit(settings.rate_limit_reputation_mutations, key_func=ingest_or_ip_key)
def remove_reputation(request: Request, body: ReputationDeleteIn, db: Session = Depends(get_db)) -> dict[str, bool]:
    try:
        key = normalize_ru_mobile_msisdn_key(body.msisdn)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from e
    fp = ingest_or_ip_key(request)
    assert_reputation_mutation_allowed(db, fingerprint=fp, msisdn_normalized=key, list_type="remove")
    removed = delete_reputation_by_normalized(db, key)
    if removed:
        log_reputation_mutation(
            db,
            msisdn_normalized=key,
            list_type="remove",
            source="manual_remove",
            fingerprint=fp,
            event_id=None,
        )
    return {"removed": removed}
