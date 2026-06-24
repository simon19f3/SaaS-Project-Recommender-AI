"""State definitions, data models, and node utilities."""

from dataclasses import dataclass
from typing import Any, List, Optional, TypedDict

from config import MAX_DEPTH, REASONING_TYPE


class AgentState(TypedDict):
    user_context: dict
    api_key: str
    depth: int
    next_depth: int
    max_depth: int
    all_nodes: List[dict]
    all_edges: List[dict]
    frontier: List[dict]
    current_children: List[dict]
    verified_children: List[dict]
    scored_children: List[dict]
    global_winner: Optional[dict]
    execution_paths: Optional[dict]
    events: List[dict]
    error: Optional[str]
    node_counter: int


@dataclass
class UserContext:
    region: str
    industry: str
    budget: str
    background: str
    api_key: str


def make_node(
    id: str,
    label: str,
    content: str,
    parent_id: str,
    depth: int,
    node_counter: int,
) -> dict:
    return {
        "id": id,
        "label": label,
        "content": content,
        "description": content,
        "parent_id": parent_id,
        "depth": depth,
        "reasoning_type": REASONING_TYPE.get(depth, "unknown"),
        "path": [],
        "weighted_score": 6.0,
        "value": 6.0,
        "confidence": 0.4,
        "score_range": [4.5, 7.5],
        "metrics": [],
        "status": "active",
        "prune_reason": "",
        "node_counter": node_counter,
    }


def build_tree_state(all_nodes: list, all_edges: list, depth: int) -> dict:
    return {
        "metadata": {
            "current_depth": depth,
            "max_depth": MAX_DEPTH,
            "total_nodes": len(all_nodes),
        },
        "nodes": [
            {
                "id": n["id"],
                "label": n["label"],
                "depth": n["depth"],
                "reasoning_type": n.get("reasoning_type", ""),
                "weighted_score": {
                    "val": n.get("value", n.get("weighted_score", 0)),
                    "conf": n.get("confidence", 0.4),
                    "range": n.get("score_range", [0, 0]),
                },
                "status": n["status"],
                "reason": n.get("prune_reason", ""),
                "parent_id": n.get("parent_id", "root"),
            }
            for n in all_nodes
        ],
        "edges": all_edges,
    }


def _append_error(state: AgentState, phase: str, depth: int, exc: Exception) -> AgentState:
    events = list(state.get("events", []))
    events.append({
        "type": "error",
        "phase": phase,
        "depth": depth,
        "title": f"Error in {phase}",
        "message": str(exc),
        "tree_state": build_tree_state(
            state.get("all_nodes", []), state.get("all_edges", []), depth
        ),
    })
    return {**state, "events": events, "error": str(exc), "frontier": []}