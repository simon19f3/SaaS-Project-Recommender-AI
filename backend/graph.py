"""LangGraph definition."""

from langgraph.graph import END, StateGraph

from models import AgentState
from nodes import (
    node_beam_select,
    node_evaluate,
    node_generate,
    node_synthesize,
    node_verify,
    route_after_beam,
)


def build_graph():
    g = StateGraph(AgentState)
    g.add_node("generate", node_generate)
    g.add_node("verify", node_verify)
    g.add_node("evaluate", node_evaluate)
    g.add_node("beam_select", node_beam_select)
    g.add_node("synthesize", node_synthesize)

    g.set_entry_point("generate")
    g.add_edge("generate", "verify")
    g.add_edge("verify", "evaluate")
    g.add_edge("evaluate", "beam_select")
    g.add_conditional_edges(
        "beam_select",
        route_after_beam,
        {"continue": "generate", "synthesize": "synthesize"},
    )
    g.add_edge("synthesize", END)
    return g.compile()


GRAPH = build_graph()