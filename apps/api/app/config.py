from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/api/.env — всегда от каталога API, не от cwd (uvicorn из корня монорепо).
_API_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_API_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "NeBeri Fraud Signal"
    debug: bool = False
    database_url: str = "postgresql+psycopg2://neberi:neberi@localhost:5432/neberi"
    policy_path: str = "policies/default_rules.yaml"
    policy_version: str = "2026.04.5"
    # Лимит на POST /v1/events (slowapi), например "60/minute". В тестах env RATE_LIMIT_EVENTS=10000/minute.
    rate_limit_events: str = "120/minute"
    # POST /v1/reputation, /v1/events/{id}/reputation, DELETE /v1/reputation/{id}, POST /remove
    rate_limit_reputation_mutations: str = "45/minute"
    # POST /v1/events/{id}/feedback
    rate_limit_event_feedback: str = "90/minute"
    rate_limit_enabled: bool = True
    # Окна для ReputationAuditLog (анти-дудос / накрутка доверия)
    reputation_max_mutations_per_minute: int = 25
    reputation_max_mutations_per_day: int = 200
    reputation_max_same_msisdn_per_hour_per_fp: int = 10
    reputation_max_allowlist_per_hour_per_fp: int = 8
    # Демо: массовое удаление событий (DELETE /v1/events). В проде выключить.
    allow_demo_event_purge: bool = True
    # Непустой ключ: POST /v1/events и purge требуют заголовок X-API-Key (или X-Ingest-Key).
    ingest_api_key: str = ""
    # CORS: через запятую, например https://app.example.com,http://localhost:5173 ; "*" — любые origin.
    cors_allow_origins: str = "*"
    # Аккаунты операторов (MVP): JWT HS256, каталог загрузок аватаров.
    jwt_secret: str = "dev-only-change-in-prod-neberi-jwt-secret-min-32-chars!"
    jwt_expires_hours: int = 72
    user_upload_dir: str = "uploads"
    # ML (TF-IDF + LR, joblib): пустая строка — выключено. Путь относительно корня apps/api если не абсолютный.
    ml_pipeline_path: str = "ml_models/fraud_text_pipeline.joblib"
    # Доля ML в итоговом risk_score для sms/voice_text при успешном predict (0..1).
    ml_blend_weight: float = 0.42


settings = Settings()
