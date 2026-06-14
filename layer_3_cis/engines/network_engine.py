from copy import deepcopy
from layer_3_cis.benchmark_matcher import retrieve_benchmarks


def process_network_event(entry: dict) -> dict:
    enriched = deepcopy(entry)

    raw_event = entry.get("raw_event", {}) or {}
    # Read the keys Layer 2 actually emits (threat_analysis / correlation_analysis);
    # keep the legacy names as fallbacks for older payloads.
    detection = entry.get("detection", {}) or {}
    threat = entry.get("threat_analysis", {}) or entry.get("engine_2_threat_intel", {}) or {}
    correlation = entry.get("correlation_analysis", {}) or entry.get("engine_3_correlation", {}) or {}

    port = raw_event.get("port")
    protocol = str(raw_event.get("protocol", "") or "").lower()
    threat_type = str(detection.get("threat_type", "") or "").lower()
    mapped_pattern = str(threat.get("mapped_pattern", "") or "").lower()
    mitre_tactic = str(threat.get("mitre_tactic", "") or "").lower()
    mitre_name = str(threat.get("mitre_technique_name", "") or "").lower()
    action = str(raw_event.get("action", "") or "").lower()
    # Include the raw action so attack types the detector generalized to
    # "suspicious_activity" (e.g. lateral_movement, beaconing) still drive matching.
    signal = f"{mitre_tactic} {mitre_name} {threat_type} {mapped_pattern} {action}"

    query_tags = []
    query_keywords = []
    section_hint = []

    if port == 22:
        query_tags.extend(["ssh", "authentication", "remote_access"])
        query_keywords.extend(["ssh", "port 22"])
        section_hint.extend(["ssh", "authentication"])

    if protocol:
        query_keywords.append(protocol)

    if any(w in signal for w in ["recon", "scan", "port_scan"]):
        query_tags.extend(["reconnaissance", "service_exposure"])
        query_keywords.extend(["scan", "reconnaissance"])

    if any(w in signal for w in ["lateral", "movement", "pivot"]):
        query_tags.extend(["network_segmentation", "lateral_movement"])
        query_keywords.extend(["segmentation", "lateral movement"])

    if any(w in signal for w in ["beacon", "c2", "command_and_control", "exfil", "data_transfer"]):
        query_tags.extend(["egress_filtering", "network_monitoring"])
        query_keywords.extend(["egress", "command and control", "exfiltration"])

    timeline = correlation.get("attack_timeline", []) or []
    if timeline:
        query_keywords.extend(["firewall", "network access"])

    matched = retrieve_benchmarks(
        domain="network",
        query_tags=query_tags,
        query_keywords=query_keywords,
        section_hint=section_hint,
        max_results=1
    )

    enriched["cis_benchmark"] = {
        "framework": "network_controls_catalog",
        "retrieval_query": {
            "query_tags": query_tags,
            "query_keywords": query_keywords,
            "section_hint": section_hint,
        },
        "matched_benchmarks": matched
    }

    return enriched