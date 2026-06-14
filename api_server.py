import json
import logging
import uuid
import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, UploadFile, File, Body, Depends, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field

import settings
from layer_1_feature_engineering.ingestion_orchestrator import (
    process_json_text,
    process_jsonl_text,
    process_csv_text,
)
from layer_2_detection.detection_orchestrator import run_detection_batch
from layer_3_cis.orchestrator import run_layer3
from frontend_formatter import format_pipeline_for_frontend, build_dashboard_block, build_final_report
from layer_4_ai_analysis.incident_report_builder import run_layer4
from layer_5_cvss.cvss_orchestrator import run_cvss
from layer_6_response.response_orchestrator import run_response

from db_manager import (
    init_db,
    save_incident,
    get_all_incidents,
    get_incident,
    update_incident_status,
    clear_all_incidents,
    save_feedback,
    get_suppression_list,
    get_feedback_for_incident,
)

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
log = logging.getLogger("sentra.api")

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_PATH = BASE_DIR / "Frontend" / "public" / "frontend_output.json"


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Initializing database (env=%s, db=%s)", settings.ENV, settings.DB_FILE)
    init_db()
    yield


app = FastAPI(title="SENTRA SOC API Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,          # explicit allowlist, never '*'+credentials
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)


# ── Optional API-key auth ────────────────────────────────────────────────────
async def require_api_key(x_api_key: str | None = Header(default=None)):
    """No-op when SOC_API_KEY is unset (local dev). When set, require the header."""
    if settings.API_KEY and x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


# ── Consistent error envelopes ───────────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def on_validation_error(request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"status": "error", "message": "Invalid request body or parameters."})


@app.exception_handler(Exception)
async def on_unhandled(request, exc: Exception):
    ref = uuid.uuid4().hex[:12]
    log.exception("Unhandled error ref=%s on %s %s", ref, request.method, request.url.path)
    return JSONResponse(status_code=500, content={
        "status": "error",
        "message": f"Internal server error. Reference ID: {ref}",
    })


# ── Request models (validation) ──────────────────────────────────────────────
ALLOWED_ACTIONS = {
    "close", "false_positive", "contain", "Closed",
    "escalate", "true_positive", "Investigate", "investigating", "Investigating",
    "open", "Open",
}
VALID_LABELS = {"true_positive", "false_positive", "false_negative", "escalated"}


class ActionBody(BaseModel):
    action: str = Field(..., min_length=1, max_length=64)


class FeedbackBody(BaseModel):
    label: str = Field(..., max_length=32)
    reason: str = Field(default="", max_length=200)
    analyst_notes: str = Field(default="", max_length=4000)


class SimulateBody(BaseModel):
    events: list[dict] = Field(default_factory=list)


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "sentra-soc-api", "version": "1.0.0"}


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.get("/readyz")
def readyz():
    try:
        get_all_incidents()
        return {"status": "ready", "db": "ok"}
    except Exception:
        return JSONResponse(status_code=503, content={"status": "not_ready", "db": "error"})


# ── Pipeline (heavy; offloaded to threadpool so it never blocks the loop) ─────
def _run_full_pipeline(normalized: list) -> dict:
    from layer_1_feature_engineering.feature_orchestrator import run_feature_engineering
    from layer_1_feature_engineering.state_reset import reset_feature_state
    reset_feature_state()  # deterministic, self-contained batch
    layer1 = [run_feature_engineering(rec) for rec in normalized]
    layer2 = run_detection_batch(layer1)
    layer3 = run_layer3(layer2)
    frontend_output = format_pipeline_for_frontend(None, layer1, layer2, layer3)
    enriched = run_layer4(frontend_output["events"])
    for event in enriched:
        event["cvss"] = run_cvss(event["ai_analysis"])
        event["response"] = run_response(event)
        event["dashboard"] = build_dashboard_block(event)
        event["final_report"] = build_final_report(event)
    frontend_output["events"] = enriched
    for event in enriched:
        save_incident(event)
    # The DB save above is the source of truth for the dashboard. Writing the
    # static fallback file is best-effort: a non-writable Frontend/public dir
    # must not turn a successful pipeline run into an HTTP 500.
    try:
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(frontend_output, f, indent=2)
    except OSError as e:
        log.warning("Static frontend_output.json write failed (non-fatal): %s", e)
    return {"status": "success", "events": len(enriched)}


@app.post("/run-pipeline")
async def run_pipeline(file: UploadFile = File(...), _=Depends(require_api_key)):
    # Read with a hard byte cap (DoS protection) — read MAX+1 then check.
    raw = await file.read(settings.MAX_UPLOAD_BYTES + 1)
    if len(raw) > settings.MAX_UPLOAD_BYTES:
        return JSONResponse(status_code=413, content={
            "status": "error",
            "message": f"Upload too large. Maximum is {settings.MAX_UPLOAD_BYTES // (1024*1024)} MB.",
        })
    try:
        content_str = raw.decode("utf-8")
    except UnicodeDecodeError:
        return JSONResponse(status_code=400, content={
            "status": "error", "message": "File is not valid UTF-8 text. Upload a JSON log file.",
        })

    try:
        # Dispatch the parser by filename extension; the UI advertises
        # .json/.jsonl, and the CSV parser is available too. For unknown
        # extensions, try JSON first and fall back to JSONL (a multi-line
        # NDJSON file is not itself valid JSON).
        name = (file.filename or "").lower()
        if name.endswith(".jsonl") or name.endswith(".ndjson"):
            normalized = process_jsonl_text(content_str)
        elif name.endswith(".csv"):
            normalized = process_csv_text(content_str)
        else:
            try:
                normalized = process_json_text(content_str)
            except (ValueError, RecursionError):
                normalized = process_jsonl_text(content_str)
    except (ValueError, RecursionError) as e:
        return JSONResponse(status_code=400, content={
            "status": "error",
            "message": "Invalid log file. Provide JSON (an array or object of log events), "
                       "newline-delimited JSON (.jsonl/.ndjson), or CSV with a header row "
                       "(e.g. [{\"timestamp\":..., \"log_type\":..., \"source_ip\":..., \"action\":...}, ...]).",
        })

    if not normalized:
        return JSONResponse(status_code=400, content={
            "status": "error", "message": "No log events found. Provide a non-empty JSON array of events.",
        })
    if len(normalized) > settings.MAX_EVENTS_PER_UPLOAD:
        return JSONResponse(status_code=413, content={
            "status": "error",
            "message": f"Too many events ({len(normalized)}). Maximum is {settings.MAX_EVENTS_PER_UPLOAD} per upload.",
        })

    try:
        # Offload CPU/IO-heavy pipeline to a worker thread so one upload can't
        # freeze the event loop for all other requests.
        result = await asyncio.to_thread(_run_full_pipeline, normalized)
        log.info("Pipeline processed %s events", result.get("events"))
        return result
    except Exception:
        ref = uuid.uuid4().hex[:12]
        log.exception("Pipeline failed ref=%s", ref)
        return JSONResponse(status_code=500, content={
            "status": "error", "message": f"Pipeline processing failed. Reference ID: {ref}",
        })


# ── Incident reads ────────────────────────────────────────────────────────────
@app.get("/api/incidents")
def list_incidents(_=Depends(require_api_key)):
    return get_all_incidents()


@app.get("/api/incidents/{event_id}")
def read_incident(event_id: str, _=Depends(require_api_key)):
    incident = get_incident(event_id)
    if not incident:
        return JSONResponse(status_code=404, content={"message": "Incident not found"})
    return incident


# ── Incident mutations ──────────────────────────────────────────────────────
@app.post("/api/incidents/{event_id}/action")
def trigger_action(event_id: str, body: ActionBody, _=Depends(require_api_key)):
    action = body.action
    if action not in ALLOWED_ACTIONS:
        return JSONResponse(status_code=400, content={
            "status": "error", "message": f"Invalid action '{action}'.",
        })
    if action in ["close", "false_positive", "contain", "Closed"]:
        status = "closed"
    elif action in ["escalate", "true_positive", "Investigate", "investigating", "Investigating"]:
        status = "investigating"
    else:
        status = "open"

    if not update_incident_status(event_id, status):
        return JSONResponse(status_code=404, content={"message": "Incident not found"})

    return {"status": "success", "incidentId": event_id, "action": action, "currentStatus": status}


@app.post("/api/simulate")
def simulate_events(body: SimulateBody, _=Depends(require_api_key)):
    if len(body.events) > settings.MAX_EVENTS_PER_UPLOAD:
        return JSONResponse(status_code=413, content={
            "status": "error", "message": f"Too many events. Max {settings.MAX_EVENTS_PER_UPLOAD}.",
        })
    count = 0
    skipped_invalid = 0
    skipped_duplicate = 0
    for event in body.events:
        if not isinstance(event, dict):
            skipped_invalid += 1
            continue
        # Don't silently drop events that lack an event_id — give them one so
        # they still land in the dashboard (the PRIMARY KEY requires a value).
        if not event.get("event_id"):
            event["event_id"] = uuid.uuid4().hex
        if get_incident(event["event_id"]):
            skipped_duplicate += 1
            continue
        save_incident(event)
        count += 1
    return {
        "status": "success",
        "count": count,
        "skipped_duplicate": skipped_duplicate,
        "skipped_invalid": skipped_invalid,
    }


@app.delete("/api/incidents")
def delete_incidents(_=Depends(require_api_key)):
    clear_all_incidents()
    log.info("All incidents cleared")
    return {"status": "success", "message": "All incidents cleared"}


@app.post("/api/incidents/{event_id}/feedback")
def submit_feedback(event_id: str, body: FeedbackBody, _=Depends(require_api_key)):
    """Record analyst feedback (TP/FP/FN/Escalated). false_positive creates a suppression rule."""
    if body.label not in VALID_LABELS:
        return JSONResponse(status_code=400, content={
            "message": f"Invalid label. Must be one of: {', '.join(sorted(VALID_LABELS))}",
        })

    incident = get_incident(event_id)
    if not incident:
        return JSONResponse(status_code=404, content={"message": "Incident not found"})

    dashboard = incident.get("dashboard") or {}
    detection = incident.get("detection") or {}
    source_ip = dashboard.get("source_ip") or incident.get("raw_event", {}).get("source_ip")
    threat_type = detection.get("threat_type") or dashboard.get("threat_type")
    affected_user = dashboard.get("affected_user") or incident.get("raw_event", {}).get("user")

    save_feedback(
        event_id=event_id, label=body.label, reason=body.reason, analyst_notes=body.analyst_notes,
        source_ip=source_ip, threat_type=threat_type, affected_user=affected_user,
    )

    status_map = {
        "true_positive": "investigating", "false_positive": "closed",
        "false_negative": "investigating", "escalated": "investigating",
    }
    update_incident_status(event_id, status_map[body.label])

    suppression_note = ""
    if body.label == "false_positive":
        suppression_note = f" A suppression rule has been created for source_ip={source_ip}, threat_type={threat_type}."

    return {
        "status": "success", "incidentId": event_id, "label": body.label, "reason": body.reason,
        "suppression_created": body.label == "false_positive",
        "message": f"Feedback recorded as {body.label}.{suppression_note}",
    }


@app.get("/api/incidents/{event_id}/feedback")
def get_incident_feedback(event_id: str, _=Depends(require_api_key)):
    return get_feedback_for_incident(event_id)


@app.get("/api/suppression-rules")
def list_suppression_rules(_=Depends(require_api_key)):
    rules = get_suppression_list()
    return {"count": len(rules), "rules": rules}
