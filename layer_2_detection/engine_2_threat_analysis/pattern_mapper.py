from .threat_utils import normalize_text, safe_float, as_bool, append_reason


def map_threat_patterns(event: dict) -> dict:
    log_type = normalize_text(event.get("log_type"))
    action = normalize_text(event.get("action"))
    url = normalize_text(event.get("url"))
    command = normalize_text(event.get("command"))

    temporal = event.get("temporal_features", {}) or {}
    behavioral = event.get("behavioral_features", {}) or {}
    statistical = event.get("statistical_features", {}) or {}
    anomaly = event.get("anomaly_detection", {}) or {}
    identity = event.get("identity_features", {}) or {}

    reasons = []
    patterns = []

    failed_logins = safe_float(behavioral.get("failed_login_count", 0))
    off_hours = as_bool(temporal.get("is_off_hours"))
    rare_source = as_bool(behavioral.get("rare_source_ip"))
    rare_user = as_bool(behavioral.get("rare_user_activity"))
    anomaly_score = safe_float(anomaly.get("anomaly_score", 0))

    normalized_action = action.replace("-", "").replace(" ", "")

    is_signin = as_bool(identity.get("is_signin_activity"))
    is_failed = as_bool(identity.get("is_failed_login"))
    is_risky_signin = as_bool(identity.get("is_risky_signin"))
    is_new_ip_for_user = as_bool(behavioral.get("is_new_ip_for_user"))
    is_new_user = as_bool(behavioral.get("is_new_user"))

    # Auth / sign-in patterns
    if log_type == "auth":
        if any(x in normalized_action for x in ["login", "signin"]) or is_signin:
            if failed_logins >= 3 or is_failed:
                patterns.append("brute_force_attempt")
                append_reason(reasons, "Multiple authentication attempts observed")

            if is_new_ip_for_user or rare_source:
                patterns.append("suspicious_login_behavior")
                append_reason(reasons, "Login from unusual or new IP for user")

            if is_new_user or rare_user:
                append_reason(reasons, "Unusual user activity detected")

            if is_risky_signin:
                patterns.append("risky_signin_detected")
                append_reason(reasons, "Identity signals indicate risky sign-in")

            if off_hours:
                append_reason(reasons, "Authentication during off-hours")

    # Suspicious web access
    if log_type == "web":
        if any(x in url for x in ["admin", "login", ".env", "config", "wp-admin", "shell"]):
            patterns.append("suspicious_web_access")
            append_reason(reasons, "Sensitive endpoint accessed")

    # Suspicious command execution
    if any(x in command for x in ["powershell", "cmd", "curl", "wget", "nc", "netcat"]):
        patterns.append("suspicious_command_execution")
        append_reason(reasons, "Suspicious command execution")

    # Generic anomaly fallback
    if anomaly_score > 0.85 and not patterns:
        patterns.append("anomalous_activity")
        append_reason(reasons, "High anomaly score detected")

    return {
        "matched_patterns": patterns,
        "reasoning": reasons
    }