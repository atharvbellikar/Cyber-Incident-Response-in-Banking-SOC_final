# ── SOC backend (FastAPI) ────────────────────────────────────────────────────
FROM python:3.13-slim AS backend

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    SOC_DB_PATH=/data/soc_incidents.db

WORKDIR /app

# Install deps first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# App code (the Frontend/ dir is built/served separately — exclude via .dockerignore).
COPY . .

# Persistent DB volume.
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8000

# Healthcheck hits the lightweight /healthz endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=4).status==200 else 1)"

# Multiple workers are safe now that Layer-1 state is reset per request.
CMD ["uvicorn", "api_server:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
