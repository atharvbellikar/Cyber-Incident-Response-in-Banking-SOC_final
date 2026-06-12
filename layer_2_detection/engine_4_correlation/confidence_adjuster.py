from .correlation_utils import safe_float


def adjust_confidence(event: dict, matched_result: dict) -> dict:
    anomaly_score = safe_float(event.get("anomaly_detection", {}).get("anomaly_score"), 0.0)
    threat_confidence = safe_float(event.get("threat_analysis", {}).get("confidence"), 0.0)

    ioc_block = event.get("ioc_enrichment", {}) or {}
    ioc_matched = bool(ioc_block.get("matched", False))
    ioc_risk = ioc_block.get("risk_level", "low")

    correlation_strength = matched_result.get("correlation_strength", "none")

    base_confidence = max(anomaly_score, threat_confidence)

    if ioc_matched:
        if ioc_risk == "high":
            base_confidence += 0.20
        elif ioc_risk == "medium":
            base_confidence += 0.10
        else:
            base_confidence += 0.05

    if correlation_strength == "strong":
        base_confidence += 0.15
    elif correlation_strength == "medium":
        base_confidence += 0.08
    elif correlation_strength == "weak":
        base_confidence += 0.03

    adjusted_confidence = min(round(base_confidence, 2), 0.99)

    return {
        "adjusted_confidence": adjusted_confidence
    }