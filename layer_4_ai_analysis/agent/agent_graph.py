# agent_graph.py
# Location: layer_3_ai_analysis/agent/agent_graph.py
#
# PURPOSE:
# Defines and compiles the LangGraph agent graph.
# Simplified to a SINGLE AI node for full SOC analysis.
#
# NEW DESIGN:
# START → ai_analysis → END
#
# WHY:
# - Faster (1 LLM call instead of 6)
# - Better reasoning (global context)
# - Cleaner architecture
# - Matches real-world SOC systems
#
# CALLED BY:
# ai_orchestrator.py


import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langgraph.graph import StateGraph, END
from agent.agent_state import AgentState
from agent.agent_nodes import run_full_ai_analysis


# ─────────────────────────────────────────
# GRAPH BUILDER
# ─────────────────────────────────────────

def build_graph():
    """
    Builds and compiles the LangGraph agent graph.

    Returns:
        Compiled LangGraph runnable
    """

    # ── Initialize graph ──
    graph = StateGraph(AgentState)

    # ── Register single AI node ──
    graph.add_node("ai_analysis", run_full_ai_analysis)

    # ── Define flow ──
    graph.set_entry_point("ai_analysis")

    # ai_analysis → END
    graph.add_edge("ai_analysis", END)

    # ── Compile ──
    return graph.compile()