from layer_3_cis.engines.web_engine import process_web_event
from layer_3_cis.engines.network_engine import process_network_event
from layer_3_cis.engines.iot_engine import process_iot_event


def route_entry(event: dict) -> dict:
    log_type = event.get("log_type", "").lower()  # <-- add .lower() here
    threat_type = event.get("detection", {}).get("threat_type", "").lower()
    # rest unchanged

    # 🔥 NEW LOGIC (THIS FIXES YOUR PIPELINE)

    if log_type == "web":
        return process_web_event(event)

    elif log_type == "network":
        return process_network_event(event)

    elif log_type == "iot":
        return process_iot_event(event)

    # 🔥 HANDLE AUTH EVENTS (IMPORTANT)
    elif log_type == "auth":

        # Route based on threat type
        if threat_type in ["suspicious_login_behavior", "risky_signin_detected"]:
            return process_web_event(event)  # auth ≈ application/auth security

        else:
            return process_network_event(event)

    # fallback
    return event