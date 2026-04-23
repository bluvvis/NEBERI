"""
Защита справочника репутации от спама и «накрутки доверия».

Паттерны как у crowd-sourced phone reputation (TrueCaller / Nomorobo / community blocklists):
лимиты по клиенту, аудит мутаций, асимметрия «блок проще, allow только из консоли».
См. обзоры: STIR/SHAKEN (другое, аттестация вызова), T-Mobile Scam Shield / FTC robocall DB — идея не одного голоса.

Открытые ориентиры (не портированный код): Android blockers с мульти-источниками и офлайн-БД
(SpamBlocker, YetAnotherCallBlocker, Tranquille), схемы community-списков с confidence/source
(contactsmanager-io/spam) — при росте продукта можно добавить вес отчётов и модерацию PR, не меняя ядро лимитов.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.limiter import ingest_or_ip_key
from app.models import ReputationAuditLog
from app.services.reputation_store import upsert_reputation_row

_log = logging.getLogger(__name__)


def assert_reputation_mutation_allowed(
    db: Session,
    *,
    fingerprint: str,
    msisdn_normalized: str,
    list_type: str,
) -> None:
    now = datetime.now(timezone.utc)
    minute_ago = now - timedelta(minutes=1)
    day_ago = now - timedelta(hours=24)
    hour_ago = now - timedelta(hours=1)

    c_min = int(
        db.scalar(
            select(func.count())
            .select_from(ReputationAuditLog)
            .where(ReputationAuditLog.fingerprint_hash == fingerprint, ReputationAuditLog.created_at >= minute_ago)
        )
        or 0
    )
    if c_min >= settings.reputation_max_mutations_per_minute:
        raise HTTPException(
            status_code=429,
            detail="слишком частые изменения репутации с этого клиента, подождите минуту",
        )

    c_day = int(
        db.scalar(
            select(func.count())
            .select_from(ReputationAuditLog)
            .where(ReputationAuditLog.fingerprint_hash == fingerprint, ReputationAuditLog.created_at >= day_ago)
        )
        or 0
    )
    if c_day >= settings.reputation_max_mutations_per_day:
        raise HTTPException(
            status_code=429,
            detail="достигнут суточный лимит изменений репутации для этого клиента",
        )

    c_msisdn_hour = int(
        db.scalar(
            select(func.count())
            .select_from(ReputationAuditLog)
            .where(
                ReputationAuditLog.fingerprint_hash == fingerprint,
                ReputationAuditLog.msisdn_normalized == msisdn_normalized,
                ReputationAuditLog.created_at >= hour_ago,
            )
        )
        or 0
    )
    if c_msisdn_hour >= settings.reputation_max_same_msisdn_per_hour_per_fp:
        raise HTTPException(
            status_code=429,
            detail="слишком много правок этого номера за час с одного клиента",
        )

    # Allowlist дороже по риску злоупотребления: отдельный (более жёсткий) потолок
    if list_type == "allowlist":
        c_allow_hour = int(
            db.scalar(
                select(func.count())
                .select_from(ReputationAuditLog)
                .where(
                    ReputationAuditLog.fingerprint_hash == fingerprint,
                    ReputationAuditLog.list_type == "allowlist",
                    ReputationAuditLog.created_at >= hour_ago,
                )
            )
            or 0
        )
        if c_allow_hour >= settings.reputation_max_allowlist_per_hour_per_fp:
            raise HTTPException(
                status_code=429,
                detail="превышен часовой лимит записей в «доверенные» с этого клиента",
            )


def log_reputation_mutation(
    db: Session,
    *,
    msisdn_normalized: str,
    list_type: str,
    source: str,
    fingerprint: str,
    event_id: object | None = None,
) -> None:
    row = ReputationAuditLog(
        msisdn_normalized=msisdn_normalized,
        list_type=list_type,
        source=source[:64],
        fingerprint_hash=fingerprint,
        event_id=event_id,
    )
    db.add(row)
    db.commit()


def try_apply_missed_fraud_to_blocklist(
    db: Session,
    *,
    request: Request,
    event_id: object,
    msisdn_normalized: str,
    note: str | None,
    prior_missed_feedback_rows: int,
) -> bool:
    """
    Первая жалоба missed_fraud по событию → блок-лист (если ещё не добавляли из этого события).
    prior_missed_feedback_rows — число строк EventFeedback с kind=missed_fraud до вставки текущей.
    """
    if prior_missed_feedback_rows > 0:
        return False
    fp = ingest_or_ip_key(request)
    try:
        assert_reputation_mutation_allowed(db, fingerprint=fp, msisdn_normalized=msisdn_normalized, list_type="blocklist")
    except HTTPException:  # noqa: BLE001 — ожидаемый 429 от лимитов
        _log.warning("reputation skip (rate): missed_fraud event_id=%s msisdn=%s", event_id, msisdn_normalized[:4])
        return False

    label = "пропущенное мошенничество (отзыв)"
    if note and note.strip():
        label = (label + ": " + note.strip())[:250]

    upsert_reputation_row(
        db,
        msisdn_normalized=msisdn_normalized,
        list_type="blocklist",
        label=label,
        source="feedback_missed_fraud",
        expires_at=None,
    )
    log_reputation_mutation(
        db,
        msisdn_normalized=msisdn_normalized,
        list_type="blocklist",
        source="feedback_missed_fraud",
        fingerprint=fp,
        event_id=event_id,
    )
    return True
