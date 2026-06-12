# agent_nodes.py

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ollama_client import run_inference
from json_parser import parse_llm_response


# ─────────────────────────────────────────
# PLACEHOLDER DETECTION
# ─────────────────────────────────────────

_PLACEHOLDER_VALUES = {
    "low or medium or high",
    "indicator1",
    "indicator2",
    "reasoning",
    "type",
    "reason",
    "ip",
    "step1",
    "impact",
    "action",
    "short summary",
    "list",
    "of",
    "real",
    "indicators",
    "from",
    "the",
    "data",
}


def _is_placeholder(val) -> bool:
    """Returns True if the value looks like an unfilled template placeholder."""
    if isinstance(val, str):
        return val.strip().lower() in _PLACEHOLDER_VALUES
    if isinstance(val, list):
        return len(val) == 0 or all(_is_placeholder(v) for v in val)
    return False


def _has_real_data(data: dict) -> bool:
    """
    Returns True if the dict has at least 2 non-placeholder values.
    Catches cases where the model echoes the template instead of filling it.
    """
    real_fields = 0
    for key in ["summary", "attack_type", "severity", "attack_analysis", "impact"]:
        val = data.get(key, "")
        if val and not _is_placeholder(val):
            real_fields += 1
    return real_fields >= 2


# ─────────────────────────────────────────
# MAIN NODE
# ─────────────────────────────────────────

def run_full_ai_analysis(state):

    incident = state.get("incident_data", {})

    try:
        print("\n================ NODE START ================")

        raw      = incident.get("raw_event", {}) or {}
        anomaly  = incident.get("anomaly_detection", {}) or {}
        feature_eng = incident.get("feature_engineering", {}) or {}
        detection = incident.get("detection", {}) or {}

        # ✅ FIX: use the actual Layer 2 key names
        threat   = incident.get("engine_2_threat_intel", {}) or {}
        # ioc is also bundled in threat intel
        ioc      = threat

        # ✅ FIX: pull src_ip/dst_ip from the right place (handle both variations)
        src_ip   = str(raw.get("source_ip") or raw.get("src_ip") or "N/A")
        dst_ip   = str(raw.get("destination_ip") or raw.get("dst_ip") or "N/A")

        port          = str(raw.get("port", "N/A"))
        failures      = int(raw.get("failed_attempts", 0))
        user          = str(raw.get("affected_user", "N/A"))
        host          = str(raw.get("affected_host", "N/A"))
        process       = str(raw.get("process", "N/A"))
        parent_proc   = str(raw.get("parent_process", "N/A"))

        anomaly_score = float(anomaly.get("anomaly_score", 0.0))
        is_outlier    = bool(anomaly.get("is_outlier", False))
        ueba_flags    = anomaly.get("ueba_flags", [])

        behavior = feature_eng
        time_win = feature_eng
        new_ip        = bool(behavior.get("is_new_ip_for_user", False))
        off_hours     = bool(time_win.get("is_off_hours", False))
        excess_logins = bool(behavior.get("excessive_failed_logins", False))
        deviation     = float(behavior.get("deviation_score", 0.0))

        # ✅ FIX: pull from threat (engine_2_threat_intel)
        mitre         = str(threat.get("mitre_tactic", "N/A"))
        ioc_matches   = threat.get("ioc_matches", [])
        threat_match  = bool(threat.get("threat_intel_match", False))

        # ✅ FIX: CIS context
        cis = incident.get("cis_benchmark", {}) or {}
        cis_matched = cis.get("matched_benchmarks", [])
        cis_title = cis_matched[0].get("title", "None") if cis_matched else "None"
        cis_remediation = cis_matched[0].get("remediation", "None") if cis_matched else "None"

        # ── Derive severity so the model does not have to guess ──
        if anomaly_score >= 0.85 and is_outlier:
            severity_hint = "HIGH"
        elif anomaly_score >= 0.6:
            severity_hint = "MEDIUM"
        else:
            severity_hint = "LOW"

        # ── Pre-build asset list so model has exact values ──
        asset_list = [
            "ip:" + src_ip,
            "host:" + host,
            "user:" + user
        ]
        asset_list_str = str(asset_list)

        # ─────────────────────────────────────────
        # PROMPT
        # ─────────────────────────────────────────

        prompt = (
            "You are a cybersecurity analyst. Analyze the security event and return ONE JSON object.\n\n"
            "SECURITY EVENT:\n"
            "- Source IP: " + src_ip + "\n"
            "- Destination IP: " + dst_ip + "\n"
            "- Port: " + port + "\n"
            "- Failed Login Attempts: " + str(failures) + "\n"
            "- Affected User: " + user + "\n"
            "- Affected Host: " + host + "\n"
            "- Process: " + process + "\n"
            "- Parent Process: " + parent_proc + "\n"
            "- Anomaly Score: " + str(anomaly_score) + "\n"
            "- Is Statistical Outlier: " + str(is_outlier) + "\n"
            "- UEBA Flags: " + str(ueba_flags) + "\n"
            "- Special Indicators: " + str({"new_ip": new_ip, "off_hours": off_hours}) + "\n"
            "- MITRE Tactic: " + mitre + "\n"
            "- IOC Matches: " + str(ioc_matches) + "\n"
            "- Threat Intel Match: " + str(threat_match) + "\n"
            "- CIS Control: " + cis_title + "\n"
            "- Remediation Guidance: " + cis_remediation + "\n\n"
            "SEVERITY IS: " + severity_hint + "\n"
            "AFFECTED ASSETS ARE: " + asset_list_str + "\n\n"
            "RECOMMENDED ACTIONS must reference real asset names from the event.\n\n"
            "You MUST also generate the following CVSS contextual fields using EXACTLY these lowercase values:\n"
            "- attack_vector: 'network', 'adjacent', 'local', or 'physical'.\n"
            "- attack_complexity: 'low' or 'high'.\n"
            "- privileges_required: 'none', 'low', or 'high'.\n"
            "- user_interaction: 'none' or 'required'.\n"
            "- scope: 'unchanged' or 'changed'.\n"
            "- impact.confidentiality: 'high', 'low', or 'none'.\n"
            "- impact.integrity: 'high', 'low', or 'none'.\n"
            "- impact.availability: 'high', 'low', or 'none'.\n"
            "- asset_criticality: 'low', 'medium', 'high', or 'critical'.\n\n"
            "Return this JSON object with every field filled using REAL values from the event above:\n\n"
            "{\n"
            '  "intent": "String describing the context and motivation behind the attack",\n'
            '  "summary": "one sentence describing what happened in this specific event",\n'
            '  "attack_vector": "network",\n'
            '  "attack_complexity": "low",\n'
            '  "privileges_required": "none",\n'
            '  "user_interaction": "none",\n'
            '  "scope": "unchanged",\n'
            '  "impact": {\n'
            '    "confidentiality": "none",\n'
            '    "integrity": "none",\n'
            '    "availability": "none"\n'
            '  },\n'
            '  "narrative": "complete 2-4 sentence incident narrative explaining what happened, who was affected, and why it is suspicious. No markdown."\n'
            "}"
        )

        print(f"[DEBUG] Event: src={src_ip} dst={dst_ip} port={port} score={anomaly_score} severity={severity_hint}")

        # ── Call LLM ──
        result = run_inference(prompt)

        if not result["success"]:
            return _fail(state, result["error"])

        raw_output = result["response"]
        print("\n[DEBUG] RAW OUTPUT:\n", raw_output)

        parsed = parse_llm_response(raw_output)

        if not parsed["parsed"]:
            return _fail(state, parsed["error"])

        data = parsed["data"]

        # ── Handle list response ──
        # Model sometimes wraps output in a list.
        # Pick the last dict that has real (non-placeholder) data.
        if isinstance(data, list):
            chosen = None
            for item in reversed(data):
                if isinstance(item, dict) and _has_real_data(item):
                    chosen = item
                    break
            if chosen is None:
                # Fallback: take the last dict even if weak
                for item in reversed(data):
                    if isinstance(item, dict):
                        chosen = item
                        break
            if chosen is None:
                return _fail(state, "Model returned a list with no usable dict")
            data = chosen

        # ── Normalize severity ──
        severity_raw = str(data.get("severity", "")).upper().strip()
        if severity_raw not in ("LOW", "MEDIUM", "HIGH"):
            severity_raw = severity_hint  # always fall back to computed hint

        # ── Normalize keys (camelCase → snake_case fallback) ──
        normalized = {
            "intent":             data.get("intent", "Suspicious Activity"),
            "summary":            data.get("summary", "Potentially suspicious activity detected based on available telemetry."),
            "attack_vector":      data.get("attack_vector", "unknown"),
            "attack_complexity":  data.get("attack_complexity", "unknown"),
            "privileges_required":data.get("privileges_required", "unknown"),
            "user_interaction":   data.get("user_interaction", "unknown"),
            "scope":              data.get("scope", "unknown"),
            "impact":             data.get("impact", {
                                      "confidentiality": "low",
                                      "integrity": "low",
                                      "availability": "low"
                                  }),
            "narrative":          data.get("narrative", "The event requires analyst review due to suspicious indicators.")
        }

        return {
            **state,
            "ai_analysis":       normalized,
            "ai_failed":         False,
            "ai_failure_reason": None,
            "escalate":          severity_hint == "HIGH"
        }

    except Exception as e:
        import traceback
        print(f"[EXCEPTION] {traceback.format_exc()}")
        return _fail(state, str(e))


# ─────────────────────────────────────────
# FAILURE HANDLER
# ─────────────────────────────────────────

def _fail(state, reason):
    print(f"[ERROR] AI analysis failed: {reason}")
    return {
        **state,
        "ai_failed": True,
        "ai_failure_reason": reason,
        "ai_analysis": None
    }