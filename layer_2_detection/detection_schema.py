from typing import Any


def initialize_detection_event(log: dict) -> dict:
    """
    Adds all standard detection-layer blocks to a Layer 1 enriched log.
    Ensures every engine writes into a predictable structure.
    """
    event = dict(log)

    event.setdefault("anomaly_detection", {})
    event.setdefault("threat_analysis", {})
    event.setdefault("ioc_enrichment", {})
    event.setdefault("correlation_analysis", {})
    event.setdefault("detection", {})

    return event


def build_empty_detection_block() -> dict[str, Any]:
    return {
        "label": "benign",
        "threat_type": "unknown",
        "severity": "low",
        "confidence": 0.0,
        "triggered_engines": [],
        "reasoning": []
    }