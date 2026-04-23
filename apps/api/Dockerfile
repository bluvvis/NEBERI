FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY requirements.txt .
# Дольше таймаут — меньше срывов сборки при медленном PyPI
ENV PIP_DEFAULT_TIMEOUT=120
RUN pip install --no-cache-dir -r requirements.txt

FROM deps AS runtime
COPY app ./app
COPY policies ./policies
COPY ml_models ./ml_models
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
