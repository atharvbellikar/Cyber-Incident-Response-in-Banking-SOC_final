# prompt_builder.py
# Location: layer_3_ai_analysis/prompt_builder.py

import json


SYSTEM_CONTEXT = """You are an expert cybersecurity analyst working in a
bank's Security Operations Center (SOC). You are analyzing a security
incident detected and enriched by automated systems.
Your analysis must be precise, actionable, and based only on the data provided.
You must respond in valid JSON only. No explanations outside the JSON block.
Do not include markdown formatting or code fences in your response."""


# ─────────────────────────────────────────
# NODE 1 — ANOMALY ANALYSIS PROMPT
# ─────────────────────────────────────────

def build_anomaly_prompt(incident_data: dict) -> str:

    anomaly_data = incident_data.get("anomaly_detection", {})
    raw_event    = incident_data.get("raw_event", {})
    feature_eng  = incident_data.get("feature_engineering", {})
    behavioral   = feature_eng
    temporal     = feature_eng

    return f"""{SYSTEM_CONTEXT}

## ANOMALY DETECTION DATA
Anomaly Score (0.0-1.0): {anomaly_data.get('anomaly_score', 'N/A')}
PyOD Score: {anomaly_data.get('pyod_score', 'N/A')}
Is Outlier: {anomaly_data.get('is_outlier', 'N/A')}
UEBA Flags: {json.dumps(anomaly_data.get('ueba_flags', []))}
UEBA Risk Boost: {anomaly_data.get('ueba_risk_boost', 'N/A')}
Anomaly Flagged: {anomaly_data.get('anomaly_flagged', 'N/A')}

## RAW EVENT
Source IP: {raw_event.get('source_ip', 'N/A')}
Destination IP: {raw_event.get('destination_ip', 'N/A')}
Affected User: {raw_event.get('affected_user', 'N/A')}
Affected Host: {raw_event.get('affected_host', 'N/A')}
Port: {raw_event.get('port', 'N/A')}
Failed Attempts: {raw_event.get('failed_attempts', 'N/A')}
Process: {raw_event.get('process', 'N/A')}
Parent Process: {raw_event.get('parent_process', 'N/A')}

## BEHAVIORAL CONTEXT
Deviation Score: {behavioral.get('deviation_score', 'N/A')}
Is New IP For User: {behavioral.get('is_new_ip_for_user', 'N/A')}
Excessive Failed Logins: {behavioral.get('excessive_failed_logins', 'N/A')}
Is Off Hours: {temporal.get('is_off_hours', 'N/A')}
Time Of Day: {temporal.get('time_of_day', 'N/A')}

## YOUR TASK
You are performing anomaly-based threat reasoning.

Carefully analyze:
- Statistical anomaly scores (PyOD, anomaly_score)
- Behavioral signals (UEBA flags, deviation_score)
- Contextual indicators (off-hours activity, new IP usage)

DETERMINE:

1. ATTACK INTENT
- Failed logins + port 22 → SSH brute force / credential access
- Suspicious process chain → execution attempt
- Off-hours + new IP → unauthorized access attempt

2. CONFIDENCE LEVEL (STRICT RULES)
- HIGH:
  anomaly_score >= 0.85 AND (is_outlier == True OR UEBA flags present)
- MEDIUM:
  anomaly_score between 0.6 and 0.85
- LOW:
  anomaly_score < 0.6

3. REASONING
- One sentence ONLY
- Must reference anomaly signals

CONSTRAINTS:
- Do NOT guess
- Use ONLY provided data

Respond in this exact JSON format:
{{
    "attack_intent": "clear description",
    "confidence": "must be exactly one of: high, medium, low (lowercase only)",
    "reasoning": "one sentence tied to anomaly data"
}}"""


# ─────────────────────────────────────────
# NODE 2 — THREAT INTEL ANALYSIS PROMPT
# ─────────────────────────────────────────

def build_threat_intel_prompt(
        incident_data: dict,
        anomaly_analysis: dict
) -> str:

    threat_data = incident_data.get("threat_analysis", {})
    ioc_data    = incident_data.get("ioc_enrichment", {})
    cis_data    = incident_data.get("cis", {})
    raw_event   = incident_data.get("raw_event", {})

    return f"""{SYSTEM_CONTEXT}

## ANOMALY ANALYSIS
Attack Intent: {anomaly_analysis.get('attack_intent', 'N/A')}
Confidence: {anomaly_analysis.get('confidence', 'N/A')}
Reasoning: {anomaly_analysis.get('reasoning', 'N/A')}

## THREAT INTELLIGENCE DATA
IOC Matches: {json.dumps(ioc_data.get('ioc_matches', []))}
Threat Intel Match: {threat_data.get('threat_intel_match', False)}
MITRE Tactic: {threat_data.get('mitre_tactic', 'N/A')}
CIS Violations: {json.dumps(cis_data.get('cis_violations', []))}

## AFFECTED ASSETS CONTEXT
Source IP: {raw_event.get('source_ip', 'N/A')}
Affected User: {raw_event.get('affected_user', 'N/A')}
Affected Host: {raw_event.get('affected_host', 'N/A')}

## YOUR TASK
You are performing threat intelligence correlation.

DETERMINE:

1. ATTACK STAGE
- Use MITRE tactic + anomaly intent
- Multi-stage allowed → "Credential Access -> Execution"

2. KILL CHAIN POSITION (STRICT MAPPING)
- Credential Access → Stage 3 of 7 — Credential Access
- Execution → Stage 4 of 7 — Execution
- Privilege Escalation → Stage 5 of 7 — Privilege Escalation

RULES:

- If attack_stage contains multiple stages (e.g. "Credential Access -> Execution"):
    → kill_chain_position MUST reflect ONLY the FINAL stage
    → Example:
        "Credential Access -> Execution" → "Stage 4 of 7 — Execution"

- If attack_stage contains a single stage:
    → map directly using:
        Credential Access → Stage 3 of 7 — Credential Access
        Execution → Stage 4 of 7 — Execution
        Privilege Escalation → Stage 5 of 7 — Privilege Escalation

- attack_stage and kill_chain_position MUST NOT contradict each other

- Do NOT invent new stages
- Do NOT mix unrelated stages

3. AFFECTED ASSETS
Format:
- "user:name"
- "host:name"
- "ip:address"

Respond in this exact JSON format:
{{
    "attack_stage": "...",
    "kill_chain_position": "Stage X of 7 — exact stage name",
    "affected_assets": ["user:name", "host:name", "ip:address"]
}}"""


# ─────────────────────────────────────────
# NODE 3 — CORRELATION (UNCHANGED)
# ─────────────────────────────────────────

def build_correlation_prompt(
        incident_data: dict,
        anomaly_analysis: dict,
        threat_analysis: dict
) -> str:

    correlation_data = incident_data.get("correlation_analysis", {})
    timeline         = correlation_data.get("attack_timeline", [])
    linked_events    = correlation_data.get("linked_events", [])

    return f"""{SYSTEM_CONTEXT}

## ANOMALY ANALYSIS
Attack Intent: {anomaly_analysis.get('attack_intent', 'N/A')}
Confidence: {anomaly_analysis.get('confidence', 'N/A')}

## THREAT ANALYSIS
Attack Stage: {threat_analysis.get('attack_stage', 'N/A')}
Kill Chain Position: {threat_analysis.get('kill_chain_position', 'N/A')}
Affected Assets: {json.dumps(threat_analysis.get('affected_assets', []))}

## CORRELATION DATA
Linked Events Count: {correlation_data.get('event_count', 0)}
Linked Events:
{json.dumps(linked_events, indent=2)}

## ATTACK TIMELINE
{json.dumps(timeline, indent=2)}

## YOUR TASK
Analyze correlation and timeline.

Respond in JSON:
{{
    "attack_sequence": "...",
    "scope": "...",
    "is_multi_stage": true or false
}}"""


# ─────────────────────────────────────────
# NODE 4 — NARRATIVE (UNCHANGED)
# ─────────────────────────────────────────

def build_narrative_prompt(
        incident_data: dict,
        anomaly_analysis: dict,
        threat_analysis: dict,
        correlation_analysis: dict
) -> str:

    raw_event = incident_data.get("raw_event", {})

    return f"""{SYSTEM_CONTEXT}

## COMPLETE ANALYSIS SUMMARY

Attack Intent: {anomaly_analysis.get('attack_intent', 'N/A')}
Confidence: {anomaly_analysis.get('confidence', 'N/A')}
Reasoning: {anomaly_analysis.get('reasoning', 'N/A')}

Attack Stage: {threat_analysis.get('attack_stage', 'N/A')}
Kill Chain Position: {threat_analysis.get('kill_chain_position', 'N/A')}
Affected Assets: {json.dumps(threat_analysis.get('affected_assets', []))}

Attack Sequence: {correlation_analysis.get('attack_sequence', 'N/A')}
Scope: {correlation_analysis.get('scope', 'N/A')}
Is Multi Stage: {correlation_analysis.get('is_multi_stage', 'N/A')}

## RAW EVENT CONTEXT
Source IP: {raw_event.get('source_ip', 'N/A')}
Affected User: {raw_event.get('affected_user', 'N/A')}
Affected Host: {raw_event.get('affected_host', 'N/A')}
Process: {raw_event.get('process', 'N/A')}
Parent Process: {raw_event.get('parent_process', 'N/A')}

## YOUR TASK

Write a complete SOC incident narrative.

REQUIREMENTS:
- 2 to 4 sentences
- Must explain what happened, who was affected, and why it is suspicious
- Must align with attack_stage and anomaly signals
- No assumptions beyond provided data

CRITICAL OUTPUT RULES:
- Output MUST be valid JSON
- Output ONLY the JSON object
- Do NOT include explanations, headers, or extra text
- Do NOT use markdown or code blocks

Respond in this exact JSON format:
{{
    "narrative": "complete 2-4 sentence incident narrative"
}}"""

# ─────────────────────────────────────────
# NODE 5 — RECOMMENDATIONS (FIXED)
# ─────────────────────────────────────────

def build_recommendations_prompt(
        incident_data: dict,
        narrative: str,
        threat_analysis: dict
) -> str:

    anomaly_data  = incident_data.get("anomaly_detection", {})
    anomaly_score = anomaly_data.get("anomaly_score", 0)
    raw_event     = incident_data.get("raw_event", {})

    return f"""{SYSTEM_CONTEXT}

## INCIDENT NARRATIVE
{narrative}

## THREAT CONTEXT
Attack Stage: {threat_analysis.get('attack_stage')}
Affected Assets: {json.dumps(threat_analysis.get('affected_assets', []))}

## YOUR TASK
Generate EXACTLY 4 SOC actions:

1. Containment (block IP / isolate host)
2. Account security (lock user)
3. Investigation (review logs)
4. Monitoring

RULES:
- Must include real asset names
- Must be executable
- NO generic actions

ESCALATION:
- anomaly_score >= 0.8 → true

id="fixrec1"
Respond in this exact JSON format:

{{
    "recommended_actions": [
        "Block IP 192.168.1.105 at firewall immediately",
        "Lock account john.doe and reset credentials",
        "Review authentication logs on host CORP-PC-042 for last 24 hours",
        "Enable monitoring alerts for repeated login attempts from 192.168.1.105"
    ],
    "escalate": true or false
}}

CRITICAL:
- Each item MUST be a STRING
- DO NOT return objects, dictionaries, or structured data
- DO NOT use keys like action_type
"""