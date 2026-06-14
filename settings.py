"""
Centralized, environment-driven configuration for the SOC backend.

Everything that varies between dev and production (DB path, allowed CORS
origins, optional API key, Ollama endpoint, upload limits) is read from the
environment here with safe local-dev defaults, so the same code deploys
unchanged. A local .env file is loaded if python-dotenv is available.
"""
import os
from pathlib import Path

try:  # optional: load a .env file in dev
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent


def _csv(name: str, default: str) -> list[str]:
    raw = os.getenv(name, default)
    return [x.strip() for x in raw.split(",") if x.strip()]


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


# ── Database ──────────────────────────────────────────────────────────────
DB_FILE = Path(os.getenv("SOC_DB_PATH", str(BASE_DIR / "soc_incidents.db")))

# ── CORS ──────────────────────────────────────────────────────────────────
# Explicit allowlist of trusted frontend origins (never '*' + credentials).
CORS_ORIGINS = _csv("SOC_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")

# ── Optional API-key auth ───────────────────────────────────────────────────
# When SOC_API_KEY is set, all mutating/admin endpoints require the
# `X-API-Key` header. Unset (default) => open, for frictionless local dev.
API_KEY = os.getenv("SOC_API_KEY", "").strip() or None

# ── Upload limits (DoS protection) ──────────────────────────────────────────
MAX_UPLOAD_BYTES = _int("SOC_MAX_UPLOAD_BYTES", 10 * 1024 * 1024)   # 10 MB
MAX_EVENTS_PER_UPLOAD = _int("SOC_MAX_EVENTS", 5000)
MAX_JSON_DEPTH = _int("SOC_MAX_JSON_DEPTH", 100)

# ── Ollama (Layer 4 AI) ─────────────────────────────────────────────────────
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")
OLLAMA_TIMEOUT = _int("OLLAMA_TIMEOUT", 30)

# ── Misc ────────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv("SOC_LOG_LEVEL", "INFO").upper()
ENV = os.getenv("SOC_ENV", "development")
