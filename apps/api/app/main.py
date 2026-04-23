import logging
import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db import Base, engine
from app.db_schema_ensure import ensure_schema
from app.limiter import limiter
from app.models import AppUser  # noqa: F401 — таблица app_users в metadata
from app.routers import auth, events, health, reputation


def _cors_origins() -> list[str]:
    raw = (settings.cors_allow_origins or "*").strip()
    if raw == "*":
        return ["*"]
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    return parts or ["*"]

_log = logging.StreamHandler()
_log.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
root = logging.getLogger()
root.handlers.clear()
root.addHandler(_log)
root.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    ensure_schema(engine)
    Path(settings.user_upload_dir).joinpath("avatars").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.4",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

_origins = _cors_origins()
# credentials + wildcard origin недопустимы в браузерах
_allow_cred = _origins != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=_allow_cred,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = rid
    start = time.perf_counter()
    response: Response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    logging.getLogger("neberi.access").info(
        "request_id=%s method=%s path=%s status=%s duration_ms=%s",
        rid,
        request.method,
        request.url.path,
        response.status_code,
        round((time.perf_counter() - start) * 1000, 2),
    )
    return response


app.include_router(health.router)
app.include_router(events.router)
app.include_router(reputation.router)
app.include_router(auth.router)


@app.get("/")
def root() -> dict[str, str | list[str]]:
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/health",
        "metrics": "/metrics",
        "events_api": "/v1/events",
        "reputation_api": "/v1/reputation",
        "auth_api": "/v1/auth",
    }


@app.get("/metrics")
def metrics() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
