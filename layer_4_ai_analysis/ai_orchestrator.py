# ai_orchestrator.py

import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from ollama_client import check_ollama_connection
from agent.agent_graph import build_graph
from agent.agent_state import AgentState


_graph = None

def _get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def _build_initial_state(incident_data: dict) -> AgentState:
    return {
        "incident_data": incident_data,
        "ai_analysis": None,
        "ai_failed": False,
        "ai_failure_reason": None,
        "error": None,
        "escalate": None
    }


def run_ai_analysis(incident_data: dict) -> dict:

    # ✅ Step 1: Check Ollama
    connection = check_ollama_connection()

    if not connection["connected"]:
        return {
            **incident_data,
            "ai_analysis": {},
            "ai_failed": True,
            "ai_failure_reason": connection["error"],
            "escalate": True
        }

    # ✅ Step 2: Initial state
    initial_state = _build_initial_state(incident_data)

    # ✅ Step 3: Run graph
    graph = _get_graph()

    try:
        final_state = graph.invoke(initial_state)

    except Exception as e:
        return {
            **incident_data,
            "ai_analysis": {},
            "ai_failed": True,
            "ai_failure_reason": str(e),
            "escalate": True
        }

    # ✅ Step 4: SAFE RETURN (never None)
    return {
        **incident_data,
        "ai_analysis": final_state.get("ai_analysis") or {},
        "ai_failed": final_state.get("ai_failed", False),
        "ai_failure_reason": final_state.get("ai_failure_reason"),
        "escalate": final_state.get("escalate")
    }