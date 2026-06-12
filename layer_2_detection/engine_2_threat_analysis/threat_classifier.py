PATTERN_PRIORITY = [
    "brute_force_attempt",
    "suspicious_command_execution",
    "suspicious_web_access",
    "anomalous_activity"
]

SEVERITY_MAP = {
    "brute_force_attempt": "high",
    "suspicious_command_execution": "high",
    "suspicious_web_access": "medium",
    "anomalous_activity": "medium"
}


def classify_threat(mapped: dict) -> dict:
    patterns = mapped.get("matched_patterns", [])
    reasons = mapped.get("reasoning", [])

    if not patterns:
        return {
            "threat_type": "unknown",
            "severity": "low",
            "confidence": 0.0,
            "reasoning": reasons
        }

    selected = None
    for p in PATTERN_PRIORITY:
        if p in patterns:
            selected = p
            break

    if not selected:
        selected = patterns[0]

    severity = SEVERITY_MAP.get(selected, "medium")

    confidence = min(0.95, 0.5 + 0.1 * len(patterns))

    reasons.append(f"Classified as {selected}")

    return {
        "threat_type": selected,
        "severity": severity,
        "confidence": round(confidence, 2),
        "reasoning": reasons
    }