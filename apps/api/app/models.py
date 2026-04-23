import uuid
from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Index, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db import Base


class FraudEvent(Base):
    __tablename__ = "fraud_events"
    __table_args__ = (
        Index("ix_fraud_events_occurred_at", "occurred_at"),
        Index("ix_fraud_events_risk_occurred_at", "risk_level", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    from_msisdn_masked: Mapped[str] = mapped_column(String(32), nullable=False)
    # RU mobile 7XXXXXXXXXX (11 цифр); хвост для префилла формы репутации — только GET /v1/events/:id (см. EventOut).
    from_msisdn_normalized: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    to_msisdn_masked: Mapped[str] = mapped_column(String(32), nullable=False)
    duration_sec: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text_excerpt: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_level: Mapped[str] = mapped_column(String(16), nullable=False)
    policy_version: Mapped[str] = mapped_column(String(32), nullable=False)
    reasons: Mapped[list] = mapped_column(JSON, nullable=False, default=list)


class MsisdnReputation(Base):
    """Локальный справочник: блок / доверие по номеру отправителя (влияет на скор при ingest)."""

    __tablename__ = "msisdn_reputation"
    __table_args__ = (Index("ix_msisdn_reputation_list_type", "list_type"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    msisdn_normalized: Mapped[str] = mapped_column(String(24), nullable=False, unique=True)
    list_type: Mapped[str] = mapped_column(String(16), nullable=False)
    label: Mapped[str | None] = mapped_column(String(256), nullable=True)
    source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EventFeedback(Base):
    """Обратная связь оператора по событию (разметка для дообучения / аудита)."""

    __tablename__ = "event_feedback"
    __table_args__ = (Index("ix_event_feedback_event_id_created", "event_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fraud_events.id", ondelete="CASCADE"),
        nullable=False,
    )
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AppUser(Base):
    """Оператор консоли: ник, телефон RU +7, пароль, аватар (MVP)."""

    __tablename__ = "app_users"
    __table_args__ = (
        Index("ix_app_users_phone", "phone_normalized"),
        Index("ix_app_users_nick_norm", "nickname_normalized"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nickname: Mapped[str] = mapped_column(String(32), nullable=False)
    nickname_normalized: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    phone_normalized: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    avatar_mimetype: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_settings: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ReputationAuditLog(Base):
    """Журнал изменений репутации (анти-спам, разбор инцидентов)."""

    __tablename__ = "reputation_audit_log"
    __table_args__ = (
        Index("ix_rep_audit_fp_created", "fingerprint_hash", "created_at"),
        Index("ix_rep_audit_msisdn_created", "msisdn_normalized", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    msisdn_normalized: Mapped[str] = mapped_column(String(16), nullable=False)
    list_type: Mapped[str] = mapped_column(String(16), nullable=False)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    fingerprint_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    event_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("fraud_events.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
