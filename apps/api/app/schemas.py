import uuid
from datetime import datetime, timezone
from typing import Literal, cast

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models import EventFeedback, FraudEvent, MsisdnReputation
from app.services.risk_levels import risk_level_from_score
from app.services.scoring import REPUTATION_BLOCK_WEIGHT, REPUTATION_TRUST_WEIGHT

EventType = Literal["call", "sms", "voice_text"]
RiskLevel = Literal["low", "medium", "high"]
ReputationListType = Literal["blocklist", "allowlist"]
FeedbackKind = Literal["false_positive", "missed_fraud", "other"]


class ReferenceOut(BaseModel):
    """Открытый источник из политики (YAML `references`) — не «доказательство факта», а трассировка сигнала."""

    model_config = ConfigDict(extra="ignore")

    title: str = Field(..., max_length=200)
    url: str = Field(..., max_length=500, pattern=r"^https://")
    kind: str | None = Field(None, max_length=64, description="dataset | paper | chapter | …")


class ReasonOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    rule_id: str
    message: str
    weight: int
    references: list[ReferenceOut] = Field(default_factory=list)

    @field_validator("references", mode="before")
    @classmethod
    def _references_none_as_empty(cls, v: object) -> object:
        return [] if v is None else v


class ScoreExplanationOut(BaseModel):
    """Разбор скора для оператора: правила, ML, пороги, справедливое согласование уровня."""

    model_config = ConfigDict(extra="ignore")

    rule_score: int = Field(..., ge=0, le=100)
    blended_score: int = Field(..., ge=0, le=100, description="Округлённая смесь правил и ML")
    blended_base: float | None = Field(default=None, ge=0.0, le=100.0, description="Смесь без diversity-бонуса")
    blended_exact: float = Field(..., ge=0.0, le=100.0, description="Смесь с бонусом, 1 знак в UI")
    diversity_bonus: float | None = Field(default=None, ge=0.0, le=10.0)
    keyword_pattern_hits: int | None = Field(default=None, ge=0, le=256)
    rules_fired_count: int = Field(0, ge=0, le=64, description="Число сработавших правил (дискретный сигнал)")
    blended_components: dict[str, float] | None = Field(default=None, description="Вклады для графиков: rule_branch, ml_branch, diversity_bonus")
    ml_fraud_proba: float | None = Field(default=None, ge=0.0, le=1.0)
    ml_blend_weight: float | None = Field(default=None, ge=0.0, le=1.0)
    effective_for_risk_level: int = Field(..., ge=0, le=100, description="max(правила, смесь) для risk_level")
    low_max: int = Field(20, ge=0, le=100)
    medium_max: int = Field(54, ge=0, le=100)
    fairness_notes: list[str] = Field(default_factory=list)


class EventIn(BaseModel):
    """Вход события. idempotency_key — опциональный ключ интегратора (повтор POST вернёт тот же ресурс)."""

    event_type: EventType
    from_msisdn: str = Field(..., min_length=5, max_length=32)
    to_msisdn: str = Field(..., min_length=5, max_length=32)
    duration_sec: int | None = Field(None, ge=0, le=86400)
    text: str | None = Field(None, max_length=4000)
    occurred_at: datetime | None = None
    idempotency_key: str | None = Field(None, max_length=128, description="Уникальный ключ клиента для идемпотентности")

    @field_validator("idempotency_key")
    @classmethod
    def strip_idempotency(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None

    @field_validator("from_msisdn", "to_msisdn")
    @classmethod
    def strip_msisdn(cls, v: str) -> str:
        return v.strip()


class CallerReputationOut(BaseModel):
    """Снимок репутации отправителя на момент ingest (хранится в payload события)."""

    model_config = ConfigDict(extra="ignore")

    list_type: ReputationListType
    label: str | None = None
    source: str | None = None
    weight: int = Field(..., ge=-100, le=100, description="Вклад в сумму весов правил")


class EventSenderReputationIn(BaseModel):
    """С карточки события — только блок-лист; доверенные только через POST /v1/reputation вручную."""

    list_type: Literal["blocklist"] = Field(
        default="blocklist",
        description="С API карточки принимается только blocklist",
    )
    label: str | None = Field(None, max_length=256)
    source: str | None = Field(None, max_length=128)

    @field_validator("label", "source")
    @classmethod
    def strip_opt_rep(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None


class EventFeedbackIn(BaseModel):
    kind: FeedbackKind
    note: str | None = Field(None, max_length=2000)

    @field_validator("note")
    @classmethod
    def strip_note(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None


class EventFeedbackOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: uuid.UUID
    event_id: uuid.UUID
    kind: FeedbackKind
    note: str | None = None
    created_at: datetime


class EventFeedbackRecentOut(BaseModel):
    """Отзыв оператора + маска отправителя события (для страницы «Репутация» / сводки)."""

    model_config = ConfigDict(extra="ignore")

    id: uuid.UUID
    event_id: uuid.UUID
    kind: FeedbackKind
    note: str | None = None
    created_at: datetime
    from_msisdn_masked: str
    event_type: EventType


class ReputationUpsertIn(BaseModel):
    msisdn: str = Field(..., min_length=5, max_length=32)
    list_type: ReputationListType
    label: str | None = Field(None, max_length=256)
    source: str | None = Field(None, max_length=128)
    expires_at: datetime | None = None

    @field_validator("msisdn")
    @classmethod
    def strip_msisdn(cls, v: str) -> str:
        return v.strip()

    @field_validator("label", "source")
    @classmethod
    def strip_opt(cls, v: str | None) -> str | None:
        if v is None:
            return None
        s = v.strip()
        return s or None


class ReputationDeleteIn(BaseModel):
    msisdn: str = Field(..., min_length=5, max_length=32)

    @field_validator("msisdn")
    @classmethod
    def strip_msisdn(cls, v: str) -> str:
        return v.strip()


class ReputationEntryOut(BaseModel):
    """Запись справочника (номер в ответе замаскирован)."""

    model_config = ConfigDict(extra="ignore")

    id: uuid.UUID
    msisdn_masked: str
    list_type: ReputationListType
    label: str | None = None
    source: str | None = None
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class EventsStatsOut(BaseModel):
    """Сводка по ленте: общее число (с тем же фильтром, что и GET /v1/events) и разбивка по уровням по всей таблице."""

    model_config = ConfigDict(extra="ignore")

    total: int = Field(..., ge=0, description="Число событий с учётом risk_level в query, если передан")
    by_risk: dict[str, int] = Field(
        ...,
        description="Глобальные счётчики low/medium/high по всей таблице (для бейджей UI)",
    )


class EventOut(BaseModel):
    id: uuid.UUID
    idempotency_key: str | None = None
    created_at: datetime
    occurred_at: datetime
    event_type: str
    from_msisdn_masked: str
    to_msisdn_masked: str
    duration_sec: int | None
    text_excerpt: str | None
    risk_score: int
    risk_level: RiskLevel
    policy_version: str
    reasons: list[ReasonOut]
    rule_score: int | None = Field(default=None, description="Сумма весов правил до смешивания с ML")
    ml_fraud_proba: float | None = Field(default=None, ge=0.0, le=1.0)
    ml_model_version: str | None = None
    score_explanation: ScoreExplanationOut | None = Field(
        default=None,
        description="Почему такой уровень риска и скор (правила vs ML, пороги)",
    )
    caller_reputation: CallerReputationOut | None = Field(
        default=None,
        description="Текущая репутация отправителя из справочника (если есть RU-ключ); иначе null",
    )
    sender_reputation_supported: bool = Field(
        default=False,
        description="Можно добавить отправителя в справочник репутации с карточки (есть RU +7 в БД)",
    )
    from_msisdn_prefill_tail: str | None = Field(
        default=None,
        description="10 цифр после +7 для префилла /reputation?tail=…; только на GET /v1/events/:id при sender_reputation_supported",
    )
    feedbacks: list[EventFeedbackOut] = Field(default_factory=list, description="Разметка оператора (на детальном GET)")

    model_config = ConfigDict(extra="ignore")


def event_feedback_to_out(fb: EventFeedback) -> EventFeedbackOut:
    return EventFeedbackOut(
        id=fb.id,
        event_id=fb.event_id,
        kind=fb.kind,  # type: ignore[arg-type]
        note=fb.note,
        created_at=fb.created_at,
    )


def fraud_event_to_event_out(
    ev: FraudEvent,
    *,
    feedbacks: list[EventFeedback] | None = None,
    include_operator_prefill: bool = False,
    db: Session | None = None,
) -> EventOut:
    p = ev.payload if isinstance(ev.payload, dict) else {}
    rs = p.get("rule_score")
    mp = p.get("ml_fraud_proba")
    mv = p.get("ml_model_version")
    raw_ex = p.get("score_explanation")
    raw_rep = p.get("caller_reputation")
    score_explanation = None
    if isinstance(raw_ex, dict):
        try:
            score_explanation = ScoreExplanationOut.model_validate(raw_ex)
        except ValidationError:
            score_explanation = None

    snap_weight = 0
    if isinstance(raw_rep, dict) and raw_rep.get("weight") is not None:
        try:
            snap_weight = int(raw_rep["weight"])
        except (TypeError, ValueError):
            snap_weight = 0

    caller_reputation: CallerReputationOut | None = None
    if isinstance(raw_rep, dict):
        try:
            caller_reputation = CallerReputationOut.model_validate(raw_rep)
        except ValidationError:
            caller_reputation = None

    risk_score_out = int(ev.risk_score)
    risk_level_out = cast(RiskLevel, ev.risk_level)

    if db is not None and ev.from_msisdn_normalized:
        now = datetime.now(timezone.utc)
        live_row = db.scalar(
            select(MsisdnReputation).where(
                MsisdnReputation.msisdn_normalized == ev.from_msisdn_normalized,
                or_(MsisdnReputation.expires_at.is_(None), MsisdnReputation.expires_at > now),
            )
        )
        live_weight = 0
        if live_row is not None:
            if live_row.list_type == "blocklist":
                live_weight = REPUTATION_BLOCK_WEIGHT
            elif live_row.list_type == "allowlist":
                live_weight = REPUTATION_TRUST_WEIGHT
        delta = live_weight - snap_weight
        risk_score_out = max(0, min(100, risk_score_out + delta))
        risk_level_out = cast(RiskLevel, risk_level_from_score(risk_score_out))
        if live_row is not None:
            caller_reputation = CallerReputationOut(
                list_type=live_row.list_type,  # type: ignore[arg-type]
                label=live_row.label,
                source=live_row.source,
                weight=live_weight,
            )
        else:
            caller_reputation = None

    fb_out = [event_feedback_to_out(f) for f in feedbacks] if feedbacks is not None else []
    fn = ev.from_msisdn_normalized
    prefill_tail = None
    if include_operator_prefill and fn and len(fn) == 11 and fn.startswith("7"):
        prefill_tail = fn[1:]

    return EventOut(
        id=ev.id,
        idempotency_key=ev.idempotency_key,
        created_at=ev.created_at,
        occurred_at=ev.occurred_at,
        event_type=ev.event_type,
        from_msisdn_masked=ev.from_msisdn_masked,
        to_msisdn_masked=ev.to_msisdn_masked,
        duration_sec=ev.duration_sec,
        text_excerpt=ev.text_excerpt,
        risk_score=risk_score_out,
        risk_level=risk_level_out,
        policy_version=ev.policy_version,
        reasons=ev.reasons if isinstance(ev.reasons, list) else [],
        rule_score=int(rs) if rs is not None else None,
        ml_fraud_proba=float(mp) if mp is not None else None,
        ml_model_version=str(mv) if mv is not None else None,
        score_explanation=score_explanation,
        caller_reputation=caller_reputation,
        sender_reputation_supported=bool(ev.from_msisdn_normalized),
        from_msisdn_prefill_tail=prefill_tail,
        feedbacks=fb_out,
    )
