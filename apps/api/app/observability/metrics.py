from prometheus_client import Counter, Histogram

REQUEST_LATENCY = Histogram(
    "neberi_http_request_duration_seconds",
    "HTTP request latency",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5),
)

EVENTS_INGESTED = Counter(
    "neberi_events_ingested_total",
    "Fraud events ingested",
    ["event_type", "risk_level"],
)

HIGH_RISK_EVENTS = Counter(
    "neberi_high_risk_events_total",
    "Events scored as high risk",
)

IDEMPOTENT_REPLAYS = Counter(
    "neberi_idempotent_replays_total",
    "POST /v1/events returned existing row by idempotency_key",
)

RULE_FIRES_TOTAL = Counter(
    "neberi_rule_fires_total",
    "Each rule hit contributing to score (explainability + capacity planning)",
    ["rule_id", "event_type"],
)

ML_BLEND_APPLIED = Counter(
    "neberi_ml_blend_applied_total",
    "Events where ML fraud proba contributed to final risk_score",
    ["event_type"],
)
