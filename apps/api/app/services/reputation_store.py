"""Запись в справочник msisdn_reputation (общая логика для REST и «из события»)."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import MsisdnReputation
from app.schemas import ReputationEntryOut
from app.services.masking import mask_msisdn


def reputation_row_to_entry_out(row: MsisdnReputation) -> ReputationEntryOut:
    synthetic = f"+{row.msisdn_normalized}" if row.msisdn_normalized else "+"
    return ReputationEntryOut(
        id=row.id,
        msisdn_masked=mask_msisdn(synthetic),
        list_type=row.list_type,  # type: ignore[arg-type]
        label=row.label,
        source=row.source,
        expires_at=row.expires_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


def upsert_reputation_row(
    db: Session,
    *,
    msisdn_normalized: str,
    list_type: str,
    label: str | None,
    source: str | None,
    expires_at: datetime | None,
) -> MsisdnReputation:
    now = datetime.now(timezone.utc)
    row = db.scalar(select(MsisdnReputation).where(MsisdnReputation.msisdn_normalized == msisdn_normalized))
    if row:
        row.list_type = list_type
        row.label = label
        row.source = source
        row.expires_at = expires_at
        row.updated_at = now
    else:
        row = MsisdnReputation(
            id=uuid.uuid4(),
            msisdn_normalized=msisdn_normalized,
            list_type=list_type,
            label=label,
            source=source,
            expires_at=expires_at,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def delete_reputation_by_normalized(db: Session, msisdn_normalized: str) -> bool:
    row = db.scalar(select(MsisdnReputation).where(MsisdnReputation.msisdn_normalized == msisdn_normalized))
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True
