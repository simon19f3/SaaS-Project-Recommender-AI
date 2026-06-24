"""Public async generator that runs the ToT agent and yields SSE events."""

from typing import AsyncGenerator

from config import BEAM_K, BRANCH_COUNT, MAX_DEPTH
from graph import build_graph
from models import AgentState, UserContext


PHASE_MESSAGES = {
    "generate": "Generating reasoning nodes...",
    "verify": "Running programmatic verifiers...",
    "evaluate": "Evaluating partial reasoning chains...",
    "beam_select": "Pruning with beam search...",
    "synthesize": "Synthesizing final Venture Dossier...",
}


async def run_tot_agent(ctx: UserContext) -> AsyncGenerator[dict, None]:
    initial: AgentState = {
        "user_context": {
            "region": ctx.region,
            "industry": ctx.industry,
            "budget": ctx.budget,
            "background": ctx.background,
        },
        "api_key": ctx.api_key,
        "depth": 0,
        "next_depth": 1,
        "max_depth": MAX_DEPTH,
        "all_nodes": [],
        "all_edges": [],
        "frontier": [{"id": "root", "label": "Market Context",
                      "content": "Root", "depth": 0, "path": []}],
        "current_children": [],
        "verified_children": [],
        "scored_children": [],
        "global_winner": None,
        "execution_paths": None,
        "events": [],
        "error": None,
        "node_counter": 0,
    }

    yield {
        "type": "start",
        "message": f"🌳 True ToT BFS — Depth {MAX_DEPTH}, Beam k={BEAM_K}, Branching={BRANCH_COUNT}",
    }

    last_event_count = 0
    has_error = False

    async for step_output in build_graph().astream(initial):
        for node_name, node_state in step_output.items():
            if node_state.get("error"):
                has_error = True

            if node_name in PHASE_MESSAGES and not has_error:
                depth = node_state.get("depth", 0)
                nd = node_state.get("next_depth")
                display_depth = nd if nd else depth
                yield {
                    "type": "phase_start",
                    "phase_name": node_name,
                    "depth": display_depth,
                    "message": f"Depth {display_depth} — {PHASE_MESSAGES[node_name]}",
                }

            new_events = node_state.get("events", [])
            for evt in new_events[last_event_count:]:
                yield evt
                if evt.get("type") == "error":
                    has_error = True
            last_event_count = len(new_events)

    yield {
        "type": "done",
        "message": "❌ Research failed — see error above." if has_error else "✅ Research complete!",
    }