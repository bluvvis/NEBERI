from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/healthcheck")
def healthcheck() -> dict[str, str]:
    """Совместимость с примерами K8s readiness/liveness из курса."""
    return {"status": "ok"}
