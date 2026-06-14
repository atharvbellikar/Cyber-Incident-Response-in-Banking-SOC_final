from layer_3_cis.engines.web_engine import process_web_event
from layer_3_cis.engines.network_engine import process_network_event
from layer_3_cis.engines.iot_engine import process_iot_event


def route_entry(event: dict) -> dict:
    # Layer-2 output does not carry a top-level "log_type"; the log family lives
    # under raw_event.log_type / log_family / classification. Derive it from
    # whichever is present so events actually route to the domain engines
    # instead of silently falling through to the no-op fallback.
    raw_event = event.get("raw_event", {}) or {}
    log_type = (
        event.get("log_type")
        or raw_event.get("log_type")
        or event.get("log_family")
        or raw_event.get("log_family")
        or ""
    )
    log_type = str(log_type).lower()
    threat_type = str((event.get("detection", {}) or {}).get("threat_type", "") or "").lower()

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