from fastapi import FastAPI, UploadFile, File, Body, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import hashlib
import secrets
from pathlib import Path

from layer_1_feature_engineering.ingestion_orchestrator import process_json_text
from layer_2_detection.detection_orchestrator import run_detection_batch
from layer_3_cis.orchestrator import run_layer3
from frontend_formatter import format_pipeline_for_frontend
from layer_4_ai_analysis.incident_report_builder import run_layer4
from layer_5_cvss.cvss_orchestrator import run_cvss
from layer_6_response.response_orchestrator import run_response

from db_manager import (
    init_db,
    init_users_db,
    create_user,
    get_user_by_username,
    create_session,
    get_session,
    delete_session,
    save_incident,
    get_all_incidents,
    get_incident,
    update_incident_status,
    clear_all_incidents,
    save_feedback,
    get_suppression_list,
    get_feedback_for_incident,
)

app = FastAPI(title="SENTRA SOC API Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_PATH = BASE_DIR / "Frontend" / "public" / "frontend_output.json"

@app.on_event("startup")
async def startup_event():
    print("[api_server] Initializing SQLite database...")
    init_db()
    init_users_db()


# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@app.post("/auth/register")
async def register(payload: dict = Body(...)):
    username = payload.get("username", "").strip().lower()
    password = payload.get("password", "")
    role = payload.get("role", "analyst")

    if not username or not password:
        return JSONResponse(status_code=400, content={"message": "Username and password are required"})
    if len(password) < 6:
        return JSONResponse(status_code=400, content={"message": "Password must be at least 6 characters"})

    existing = get_user_by_username(username)
    if existing:
        return JSONResponse(status_code=409, content={"message": "Username already exists"})

    password_hash = hash_password(password)
    user = create_user(username=username, password_hash=password_hash, role=role)
    return {"status": "success", "message": "Account created", "username": username, "role": role}


@app.post("/auth/login")
async def login(payload: dict = Body(...)):
    username = payload.get("username", "").strip().lower()
    password = payload.get("password", "")

    if not username or not password:
        return JSONResponse(status_code=400, content={"message": "Username and password are required"})

    user = get_user_by_username(username)
    if not user:
        return JSONResponse(status_code=401, content={"message": "Invalid credentials"})

    if user["password_hash"] != hash_password(password):
        return JSONResponse(status_code=401, content={"message": "Invalid credentials"})

    token = secrets.token_hex(32)
    create_session(user_id=user["user_id"], token=token)

    return {
        "status": "success",
        "token": token,
        "username": user["username"],
        "role": user["role"],
    }


@app.post("/auth/logout")
async def logout(authorization: str = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if token:
        delete_session(token)
    return {"status": "success", "message": "Logged out"}


@app.get("/auth/me")
async def get_me(authorization: str = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    if not token:
        return JSONResponse(status_code=401, content={"message": "Not authenticated"})
    session = get_session(token)
    if not session:
        return JSONResponse(status_code=401, content={"message": "Session expired"})
    return {
        "username": session["username"],
        "role": session["role"],
        "user_id": session["user_id"],
    }

@app.post("/run-pipeline")
async def run_pipeline(file: UploadFile = File(...)):
    content = await file.read()
    content_str = content.decode("utf-8")

    # Layer 1
    normalized = process_json_text(content_str)
    from layer_1_feature_engineering.feature_orchestrator import run_feature_engineering
    layer1 = [run_feature_engineering(rec) for rec in normalized]

    # Layer 2
    layer2 = run_detection_batch(layer1)

    # Layer 3
    layer3 = run_layer3(layer2)

    # Frontend format
    frontend_output = format_pipeline_for_frontend(
        parsed_logs=None,
        layer1_output=layer1,
        layer2_output=layer2,
        layer3_output=layer3,
    )

    # Layer 4
    enriched = run_layer4(frontend_output["events"])

    for event in enriched:
        event["cvss"] = run_cvss(event["ai_analysis"])
        event["response"] = run_response(event)

    frontend_output["events"] = enriched

    # Save to SQLite Database
    for event in enriched:
        save_incident(event)

    # Save to public/frontend_output.json for static fallback
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(frontend_output, f, indent=2)

    return {"status": "success", "events": len(enriched)}

@app.get("/api/incidents")
async def list_incidents():
    return get_all_incidents()

@app.get("/api/incidents/{event_id}")
async def read_incident(event_id: str):
    incident = get_incident(event_id)
    if not incident:
        return JSONResponse(status_code=404, content={"message": "Incident not found"})
    return incident

@app.post("/api/incidents/{event_id}/action")
async def trigger_action(event_id: str, payload: dict = Body(...)):
    action = payload.get("action")
    status = "open"
    
    if action in ["close", "false_positive", "contain", "Closed"]:
        status = "closed"
    elif action in ["escalate", "true_positive", "Investigate", "investigating", "Investigating"]:
        status = "investigating"
        
    success = update_incident_status(event_id, status)
    if not success:
        return JSONResponse(status_code=404, content={"message": "Incident not found"})
        
    return {
        "status": "success",
        "incidentId": event_id,
        "action": action,
        "currentStatus": status
    }

@app.delete("/api/incidents")
async def delete_incidents():
    clear_all_incidents()
    return {"status": "success", "message": "All incidents cleared"}


@app.post("/api/incidents/{event_id}/feedback")
async def submit_feedback(event_id: str, payload: dict = Body(...)):
    """
    Record analyst feedback (TP/FP/FN/Escalated) for an incident.
    Extracts source_ip, threat_type, affected_user from the stored incident
    and persists them alongside the label/reason/notes in analyst_feedback table.
    If the label is false_positive, this also creates a suppression rule for future pipeline runs.
    """
    label = payload.get("label", "")
    reason = payload.get("reason", "")
    analyst_notes = payload.get("analyst_notes", "")

    valid_labels = {"true_positive", "false_positive", "false_negative", "escalated"}
    if label not in valid_labels:
        return JSONResponse(status_code=400, content={"message": f"Invalid label. Must be one of: {', '.join(valid_labels)}"})

    # Look up the incident to extract matching features for suppression
    incident = get_incident(event_id)
    if not incident:
        return JSONResponse(status_code=404, content={"message": "Incident not found"})

    dashboard = incident.get("dashboard") or {}
    detection = incident.get("detection") or {}

    source_ip     = dashboard.get("source_ip") or incident.get("raw_event", {}).get("source_ip")
    threat_type   = detection.get("threat_type") or dashboard.get("threat_type")
    affected_user = dashboard.get("affected_user") or incident.get("raw_event", {}).get("user")

    # Save the feedback record
    save_feedback(
        event_id=event_id,
        label=label,
        reason=reason,
        analyst_notes=analyst_notes,
        source_ip=source_ip,
        threat_type=threat_type,
        affected_user=affected_user,
    )

    # Update incident status based on label
    status_map = {
        "true_positive":  "investigating",
        "false_positive": "closed",
        "false_negative": "investigating",
        "escalated":      "investigating",
    }
    update_incident_status(event_id, status_map[label])

    suppression_note = ""
    if label == "false_positive":
        suppression_note = f" A suppression rule has been created for source_ip={source_ip}, threat_type={threat_type}."

    return {
        "status": "success",
        "incidentId": event_id,
        "label": label,
        "reason": reason,
        "suppression_created": label == "false_positive",
        "message": f"Feedback recorded as {label}.{suppression_note}"
    }


@app.get("/api/incidents/{event_id}/feedback")
async def get_incident_feedback(event_id: str):
    """Return the full analyst feedback history for an incident."""
    return get_feedback_for_incident(event_id)


@app.get("/api/suppression-rules")
async def list_suppression_rules():
    """Return all active False Positive suppression rules derived from analyst feedback."""
    rules = get_suppression_list()
    return {
        "count": len(rules),
        "rules": rules
    }