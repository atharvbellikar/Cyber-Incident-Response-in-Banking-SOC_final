# agent_state.py
# Location: layer_3_ai_analysis/agent/agent_state.py

from typing import TypedDict, Optional, Dict, Any


class AgentState(TypedDict):
    """
    Simplified state for single-node AI analysis pipeline.
    """

    # ── Input ─────────────────────────────
    incident_data: Dict[str, Any]

    # ── AI Output ─────────────────────────
    ai_analysis: Optional[Dict[str, Any]]

    # ── Control / Status ──────────────────
    ai_failed: bool
    ai_failure_reason: Optional[str]
    error: Optional[str]

    # ── Optional derived fields ───────────
    escalate: Optional[bool]