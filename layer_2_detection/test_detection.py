from detection_orchestrator import run_detection
import json

event = {
    "event_id": "evt_001",
    "log_type": "auth",
    "action": "login_failed",
    "source_ip": "203.0.113.45",

    "temporal_features": {
        "is_off_hours": True
    },

    "behavioral_features": {
        "failed_login_count": 7,
        "rare_source_ip": True
    },

    "statistical_features": {
        "z_score": 2.9,
        "event_count_window": 15
    },

    "network_features": {},
    "web_features": {},
    "identity_features": {}
}

output = run_detection(event)

print(json.dumps(output, indent=2))