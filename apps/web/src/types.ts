export type RiskLevel = "low" | "medium" | "high";

export type ReputationListType = "blocklist" | "allowlist";

export type FeedbackKind = "false_positive" | "missed_fraud" | "other";

/** Репутация отправителя, учтённая при расчёте (снимок в событии). */
export interface CallerReputation {
  list_type: ReputationListType;
  label?: string | null;
  source?: string | null;
  weight: number;
}

export interface EventFeedback {
  id: string;
  event_id: string;
  kind: FeedbackKind;
  note?: string | null;
  created_at: string;
}

/** Тип канала события (ingest / GET ленты). */
export type FraudEventType = "call" | "sms" | "voice_text";

/** GET /v1/events/feedback/recent — отзыв + маска отправителя события. */
export interface EventFeedbackRecent extends EventFeedback {
  from_msisdn_masked: string;
  event_type: FraudEventType;
}

export interface ReputationEntry {
  id: string;
  msisdn_masked: string;
  list_type: ReputationListType;
  label?: string | null;
  source?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Открытый источник из политики (YAML `references` → API). */
export interface ReasonReference {
  title: string;
  url: string;
  kind?: string | null;
}

export interface Reason {
  rule_id: string;
  message: string;
  weight: number;
  references?: ReasonReference[];
}

/** Разбор скора для оператора (API score_explanation). */
export interface ScoreExplanation {
  rule_score: number;
  blended_score: number;
  blended_exact: number;
  blended_base?: number | null;
  diversity_bonus?: number | null;
  keyword_pattern_hits?: number | null;
  /** С новых версий API; для старых событий может отсутствовать. */
  rules_fired_count?: number;
  blended_components?: Record<string, number> | null;
  ml_fraud_proba?: number | null;
  ml_blend_weight?: number | null;
  effective_for_risk_level: number;
  low_max: number;
  medium_max: number;
  fairness_notes?: string[];
}

export interface FraudEvent {
  id: string;
  idempotency_key?: string | null;
  created_at: string;
  occurred_at: string;
  event_type: string;
  from_msisdn_masked: string;
  to_msisdn_masked: string;
  duration_sec: number | null;
  text_excerpt: string | null;
  risk_score: number;
  risk_level: RiskLevel;
  policy_version: string;
  reasons: Reason[];
  /** Сумма весов правил до смешивания с ML (если API отдал). */
  rule_score?: number | null;
  /** Вероятность fraud по текстовой модели (0..1), вне hot path обучения см. research/. */
  ml_fraud_proba?: number | null;
  ml_model_version?: string | null;
  score_explanation?: ScoreExplanation | null;
  caller_reputation?: CallerReputation | null;
  /** Можно отправить отправителя в репутацию с карточки (RU +7 сохранён на сервере). */
  sender_reputation_supported?: boolean;
  /** 10 цифр после +7 для ссылки на /reputation?tail=…; только на GET карточки события. */
  from_msisdn_prefill_tail?: string | null;
  /** На GET /v1/events/:id — разметка оператора; в списке обычно пусто. */
  feedbacks?: EventFeedback[];
}
