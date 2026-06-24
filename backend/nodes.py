"""LangGraph node implementations for the ToT agent."""

import asyncio
from typing import List

from config import BEAM_K, BRANCH_COUNT, MAX_CONCURRENT_EVALS, MAX_DEPTH, REASONING_LABEL
from llm import call_gemini, extract_json
from models import AgentState, _append_error, build_tree_state, make_node
from prompts import get_evaluator_prompt, get_generation_prompt
from verifier import verify_node


async def node_generate(state: AgentState) -> AgentState:
    if state.get("error"):
        return state

    ctx = state["user_context"]
    api_key = state["api_key"]
    frontier = state["frontier"]
    depth = state["depth"]
    next_depth = depth + 1
    all_nodes = list(state["all_nodes"])
    all_edges = list(state["all_edges"])
    events = list(state["events"])
    counter_box = [state["node_counter"]]

    try:
        async def gen_for_parent(parent: dict) -> List[dict]:
            system, user = get_generation_prompt(parent, next_depth, ctx, BRANCH_COUNT)
            resp = await call_gemini(api_key, system, user, max_tokens=2000)
            data = extract_json(resp)

            children = []
            for t in data.get("thoughts", []):
                counter_box[0] += 1
                ctr = counter_box[0]
                pid = parent["id"]
                cid = f"{pid}_{ctr}" if pid != "root" else f"d1_{ctr}"
                child = make_node(
                    id=cid, label=t["label"], content=t["content"],
                    parent_id=pid, depth=next_depth, node_counter=ctr,
                )
                parent_path = parent.get("path", [])
                child["path"] = [] if parent["id"] == "root" else (
                    parent_path + [parent.get("content", parent.get("description", ""))]
                )
                children.append(child)
            return children

        tasks = [gen_for_parent(p) for p in frontier]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        all_children: List[dict] = []
        for result in results:
            if isinstance(result, Exception):
                raise result
            for child in result:
                all_children.append(child)
                all_nodes.append(child)
                all_edges.append({"from": child["parent_id"], "to": child["id"]})

        depth_label = REASONING_LABEL.get(next_depth, f"Depth {next_depth}")
        parent_word = "parent" if len(frontier) == 1 else "parents"
        events.append({
            "type": "phase_complete",
            "phase": "generate",
            "depth": next_depth,
            "title": f"Depth {next_depth} — Generate ({depth_label})",
            "message": f"Generated {len(all_children)} reasoning nodes from {len(frontier)} {parent_word}",
            "tree_state": build_tree_state(all_nodes, all_edges, depth),
            "new_nodes": all_children,
        })

        return {
            **state,
            "depth": depth,
            "next_depth": next_depth,
            "current_children": all_children,
            "all_nodes": all_nodes,
            "all_edges": all_edges,
            "events": events,
            "node_counter": counter_box[0],
        }

    except Exception as e:
        return _append_error(state, "generate", next_depth, e)


async def node_verify(state: AgentState) -> AgentState:
    if state.get("error"):
        return state

    children = state["current_children"]
    ctx = state["user_context"]
    all_nodes = list(state["all_nodes"])
    all_edges = list(state["all_edges"])
    events = list(state["events"])

    verified: List[dict] = []
    pruned_count = 0

    for child in children:
        ok, reason = verify_node(child, ctx)
        if ok:
            verified.append(child)
        else:
            pruned_count += 1
            child["status"] = "pruned_verifier"
            child["prune_reason"] = f"[VERIFIER] {reason}"
            for i, n in enumerate(all_nodes):
                if n["id"] == child["id"]:
                    all_nodes[i] = child

    events.append({
        "type": "phase_complete",
        "phase": "verify",
        "depth": state["next_depth"],
        "title": f"Depth {state['next_depth']} — Programmatic Verification",
        "message": f"Verifier: {len(verified)}/{len(children)} passed; {pruned_count} killed by hard constraints",
        "tree_state": build_tree_state(all_nodes, all_edges, state["depth"]),
        "verified_nodes": verified,
        "pruned_count": pruned_count,
    })

    return {
        **state,
        "verified_children": verified,
        "all_nodes": all_nodes,
        "events": events,
    }


async def node_evaluate(state: AgentState) -> AgentState:
    if state.get("error"):
        return state

    ctx = state["user_context"]
    api_key = state["api_key"]
    verified = state["verified_children"]
    all_nodes = list(state["all_nodes"])
    events = list(state["events"])
    depth = state["next_depth"]

    if not verified:
        events.append({
            "type": "phase_complete",
            "phase": "evaluate",
            "depth": depth,
            "title": f"Depth {depth} — Evaluate",
            "message": "No nodes survived verification — skipping evaluation",
            "tree_state": build_tree_state(all_nodes, state["all_edges"], state["depth"]),
            "scored_nodes": [],
        })
        return {**state, "scored_children": [], "events": events}

    try:
        semaphore = asyncio.Semaphore(MAX_CONCURRENT_EVALS)

        async def eval_one(node: dict) -> dict:
            async with semaphore:
                system, user = get_evaluator_prompt(node, ctx)
                resp = await call_gemini(api_key, system, user, max_tokens=1500)
                data = extract_json(resp)
                node["metrics"] = data.get("metrics", [])
                node["value"] = data.get("value", 6.0)
                node["weighted_score"] = data.get("value", 6.0)
                node["confidence"] = data.get("confidence", 0.5)
                node["score_range"] = data.get("score_range", [5.0, 7.0])
                node["status"] = "evaluated"
                node["eval_risk"] = data.get("risk", "")
                node["should_explore"] = data.get("should_explore", True)
                return node

        results = await asyncio.gather(*[eval_one(n) for n in verified], return_exceptions=True)

        scored: List[dict] = []
        error_msgs: List[str] = []
        for node, result in zip(verified, results):
            if isinstance(result, Exception):
                err_text = str(result)
                node["status"] = "pruned_error"
                node["prune_reason"] = f"[EVAL ERROR] {err_text}"
                error_msgs.append(err_text[:80])
                for i, n in enumerate(all_nodes):
                    if n["id"] == node["id"]:
                        all_nodes[i] = node
            else:
                scored.append(result)
                for i, n in enumerate(all_nodes):
                    if n["id"] == result["id"]:
                        all_nodes[i] = result

        if not scored and verified:
            for node in verified:
                node["value"] = 6.0
                node["weighted_score"] = 6.0
                node["confidence"] = 0.5
                node["score_range"] = [5.0, 7.0]
                node["status"] = "evaluated"
                node["eval_risk"] = "API error — assigned default score"
                node["metrics"] = []
                for i, n in enumerate(all_nodes):
                    if n["id"] == node["id"]:
                        all_nodes[i] = node
            scored = verified
            events.append({
                "type": "phase_complete",
                "phase": "evaluate",
                "depth": depth,
                "title": f"Depth {depth} — Evaluate (Fallback)",
                "message": f"All {len(verified)} LLM evals failed — rescued with default scores ({'; '.join(set(error_msgs))})",
                "tree_state": build_tree_state(all_nodes, state["all_edges"], state["depth"]),
                "scored_nodes": scored,
            })
        else:
            err_summary = f"; {len(error_msgs)} failed: {error_msgs[0]}" if error_msgs else ""
            events.append({
                "type": "phase_complete",
                "phase": "evaluate",
                "depth": depth,
                "title": f"Depth {depth} — Evaluate Partial Paths",
                "message": f"Evaluated {len(scored)} partial reasoning chains in parallel{err_summary}",
                "tree_state": build_tree_state(all_nodes, state["all_edges"], state["depth"]),
                "scored_nodes": scored,
            })

        return {**state, "scored_children": scored, "all_nodes": all_nodes, "events": events}

    except Exception as e:
        return _append_error(state, "evaluate", depth, e)


async def node_beam_select(state: AgentState) -> AgentState:
    if state.get("error"):
        return state

    children = state["scored_children"]
    depth = state["next_depth"]
    all_nodes = list(state["all_nodes"])
    events = list(state["events"])

    if not children:
        depth_nodes = [
            n for n in all_nodes
            if n["depth"] == depth and n["status"] not in ("pruned_verifier", "pruned_error")
        ]
        if depth_nodes:
            children = sorted(depth_nodes, key=lambda x: x.get("value", 0), reverse=True)[:1]

    children.sort(key=lambda x: x.get("value", 0), reverse=True)
    top_k = children[:BEAM_K]
    pruned = children[BEAM_K:]

    for b in pruned:
        b["status"] = "pruned_beam"
        b["prune_reason"] = f"Beam search: ranked outside top-{BEAM_K} (value {b.get('value', 0):.1f})"
        for i, n in enumerate(all_nodes):
            if n["id"] == b["id"]:
                all_nodes[i] = b

    for b in top_k:
        b["status"] = "survived"
        for i, n in enumerate(all_nodes):
            if n["id"] == b["id"]:
                all_nodes[i] = b

    if not top_k and children:
        rescued = children[0]
        rescued["status"] = "survived_rescued"
        top_k = [rescued]
        for i, n in enumerate(all_nodes):
            if n["id"] == rescued["id"]:
                all_nodes[i] = rescued

    events.append({
        "type": "phase_complete",
        "phase": "beam_select",
        "depth": depth,
        "title": f"Depth {depth} — Beam Select (k={BEAM_K})",
        "message": f"Kept {len(top_k)}/{len(children)} nodes; {len(pruned)} pruned",
        "tree_state": build_tree_state(all_nodes, state["all_edges"], depth),
        "survivors": top_k,
        "pruned_count": len(pruned),
    })

    return {
        **state,
        "frontier": top_k,
        "depth": depth,
        "all_nodes": all_nodes,
        "events": events,
    }


def route_after_beam(state: AgentState) -> str:
    if state.get("error"):
        return "synthesize"
    if state["depth"] < MAX_DEPTH:
        return "continue"
    return "synthesize"


async def node_synthesize(state: AgentState) -> AgentState:
    if state.get("error"):
        return state

    ctx = state["user_context"]
    api_key = state["api_key"]
    frontier = state["frontier"]
    all_nodes = list(state["all_nodes"])
    events = list(state["events"])

    try:
        if not frontier:
            raise RuntimeError("No frontier nodes survived to synthesis")

        winner = max(frontier, key=lambda x: x.get("value", 0))
        winner["status"] = "winner"
        for i, n in enumerate(all_nodes):
            if n["id"] == winner["id"]:
                all_nodes[i] = winner

        path = winner.get("path", []) + [winner.get("content", "")]

        system = "You are a startup execution expert. Build a Venture Dossier from a winning reasoning chain. Return ONLY valid JSON."
        user = f"""The following strategic reasoning chain won the ToT evaluation (value {winner.get('value', 0):.1f}/10):

Step 1 (Market Thesis):       {path[0] if len(path) > 0 else 'N/A'}
Step 2 (ICP & Pain):          {path[1] if len(path) > 1 else 'N/A'}
Step 3 (Solution Mechanism):  {path[2] if len(path) > 2 else 'N/A'}
Step 4 (Business Model+Moat): {path[3] if len(path) > 3 else 'N/A'}

Turn this into a complete venture dossier with 3 execution paths.

Return ONLY this JSON:
{{
  "one_sentence_pitch": "X for Y that does Z — targeting $ARR through B2B SaaS.",
  "path_a": {{
    "name": "Lean / No-Code",
    "focus": "Speed-to-market",
    "stack": ["Bubble", "Zapier", "Stripe"],
    "timeline": "8-12 weeks to MVP",
    "budget_required": "$5k–$15k",
    "first_milestone": "10 paying beta users at $99/mo",
    "pros": ["Fast launch", "Low risk"],
    "cons": ["Scale ceiling", "Higher unit cost"],
    "score": 7.5
  }},
  "path_b": {{
    "name": "AI-Moat",
    "focus": "Deep technical defensibility",
    "stack": ["Next.js", "Python", "LLM APIs", "Vector DB"],
    "timeline": "16-24 weeks",
    "budget_required": "$20k–$50k",
    "first_milestone": "AI feature with measurable 30% efficiency gain",
    "pros": ["Defensible moat", "Premium pricing"],
    "cons": ["Longer TTM", "Higher burn"],
    "score": 8.2
  }},
  "path_c": {{
    "name": "Vertical Niche",
    "focus": "Industry hyper-focus",
    "stack": ["React", "Node.js", "PostgreSQL"],
    "timeline": "12-16 weeks",
    "budget_required": "$10k–$30k",
    "first_milestone": "5 enterprise pilots in one vertical",
    "pros": ["Clear ICP", "Word-of-mouth"],
    "cons": ["TAM ceiling", "Niche risk"],
    "score": 7.8
  }},
  "recommended_path": "path_b",
  "data_lineage": [
    {{"source": "Crunchbase", "url": "https://crunchbase.com", "used_for": "Funding data"}},
    {{"source": "G2 Reviews", "url": "https://g2.com", "used_for": "Pain validation"}},
    {{"source": "Reddit", "url": "https://reddit.com/r/entrepreneur", "used_for": "Founder sentiment"}}
  ]
}}"""

        resp = await call_gemini(api_key, system, user, max_tokens=2500)
        data = extract_json(resp)
        winner["one_sentence_pitch"] = data.get("one_sentence_pitch", "")
        winner["metrics"] = winner.get("metrics", [])

        all_edges = list(state["all_edges"])
        exec_nodes = [
            {"id": "path_a", "label": "Path A: Lean/No-Code", "depth": "exec",
             "weighted_score": {"val": data["path_a"]["score"], "conf": 0.8,
                                "range": [data["path_a"]["score"]-0.5, data["path_a"]["score"]+0.5]},
             "status": "execution_path", "parent_id": winner["id"], "reason": "", "reasoning_type": "execution"},
            {"id": "path_b", "label": "Path B: AI-Moat", "depth": "exec",
             "weighted_score": {"val": data["path_b"]["score"], "conf": 0.8,
                                "range": [data["path_b"]["score"]-0.5, data["path_b"]["score"]+0.5]},
             "status": "execution_path", "parent_id": winner["id"], "reason": "", "reasoning_type": "execution"},
            {"id": "path_c", "label": "Path C: Vertical Niche", "depth": "exec",
             "weighted_score": {"val": data["path_c"]["score"], "conf": 0.8,
                                "range": [data["path_c"]["score"]-0.5, data["path_c"]["score"]+0.5]},
             "status": "execution_path", "parent_id": winner["id"], "reason": "", "reasoning_type": "execution"},
        ]
        all_edges += [
            {"from": winner["id"], "to": "path_a"},
            {"from": winner["id"], "to": "path_b"},
            {"from": winner["id"], "to": "path_c"},
        ]

        final_tree_nodes = [
            {
                "id": n["id"], "label": n["label"], "depth": n.get("depth", 1),
                "reasoning_type": n.get("reasoning_type", ""),
                "weighted_score": {
                    "val": n.get("value", n.get("weighted_score", 0)),
                    "conf": n.get("confidence", 0.4),
                    "range": n.get("score_range", [0, 0]),
                },
                "status": n["status"], "reason": n.get("prune_reason", ""),
                "parent_id": n.get("parent_id", "root"),
            }
            for n in all_nodes
        ] + exec_nodes

        final_tree_state = {
            "metadata": {"current_depth": "done", "max_depth": MAX_DEPTH, "total_nodes": len(final_tree_nodes)},
            "nodes": final_tree_nodes,
            "edges": all_edges,
        }

        events.append({
            "type": "phase_complete",
            "phase": "synthesize",
            "depth": "final",
            "title": "Synthesize — Venture Dossier Ready",
            "message": f"Winner: {winner['label']} (value {winner.get('value', 0):.1f}/10)",
            "tree_state": final_tree_state,
            "winner": winner,
            "execution_paths": data,
            "reasoning_chain": path,
        })
        events.append({
            "type": "research_complete",
            "winner": winner,
            "execution_paths": data,
            "tree_state": final_tree_state,
            "all_branches": all_nodes,
            "reasoning_chain": path,
        })

        return {
            **state,
            "global_winner": winner,
            "execution_paths": data,
            "all_nodes": all_nodes,
            "all_edges": all_edges,
            "events": events,
        }

    except Exception as e:
        return _append_error(state, "synthesize", MAX_DEPTH, e)