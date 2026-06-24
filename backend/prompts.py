"""LLM prompt builders for generation and evaluation."""

from config import MAX_DEPTH, REASONING_LABEL


def get_generation_prompt(
    parent: dict, depth: int, ctx: dict, branch_count: int
) -> tuple[str, str]:
    """Return (system, user) prompts for generating children at a given depth."""
    system = "You are a Chief Startup Strategist building a strategic reasoning chain. Return ONLY valid JSON."

    parent_content = parent.get("content", parent.get("description", ""))
    path = parent.get("path", [])
    if parent["id"] != "root":
        path = path + [parent_content]

    if depth == 1:
        user = f"""Founder context:
- Region: {ctx['region']}
- Industry: {ctx['industry']}
- Budget: {ctx['budget']}
- Background: {ctx['background']}

Generate {branch_count} diverse, evidence-based MARKET THESES for the {ctx['industry']} industry.
Each thesis is a strategic market observation (NOT a product idea yet).
They must be specific, contrarian, or insight-driven.

Return ONLY this JSON:
{{
  "thoughts": [
    {{"id": "PLACEHOLDER", "label": "Short thesis name (3-5 words)", "content": "2-3 sentence market thesis with specific logic"}}
  ]
}}"""

    elif depth == 2:
        user = f"""Given this market thesis:
{parent_content}

Generate {branch_count} specific ICP (Ideal Customer Profile) + Pain Point hypotheses.
Each must identify WHO exactly feels the pain and WHAT the specific pain is.
The pain must logically follow from the market thesis above.

Return ONLY this JSON:
{{
  "thoughts": [
    {{"id": "PLACEHOLDER", "label": "ICP: [specific persona]", "content": "2-3 sentences: who is the customer and what is their acute pain"}}
  ]
}}"""

    elif depth == 3:
        chain = "\n".join([f"Step {i+1}: {p}" for i, p in enumerate(path)])
        user = f"""Given the reasoning chain so far:
{chain}

Generate {branch_count} solution mechanisms (HOW the product works technically).
Do NOT include business model or pricing yet — focus on the core product mechanism.
Each must directly address the pain point from Step 2.

Return ONLY this JSON:
{{
  "thoughts": [
    {{"id": "PLACEHOLDER", "label": "Mechanism name (3-5 words)", "content": "2-3 sentences describing the core technical/product mechanism"}}
  ]
}}"""

    else:
        chain = "\n".join([f"Step {i+1}: {p}" for i, p in enumerate(path)])
        user = f"""Given the full reasoning chain:
{chain}

Generate {branch_count} business model + moat + feasibility combinations.
Include: pricing model, go-to-market, defensibility, build timeline/budget.
This is the FINAL reasoning step — make it concrete and actionable.

Return ONLY this JSON:
{{
  "thoughts": [
    {{"id": "PLACEHOLDER", "label": "Model: [strategy name]", "content": "2-3 sentences on pricing, GTM, moat, and feasibility"}}
  ]
}}"""

    return system, user


def get_evaluator_prompt(node: dict, ctx: dict) -> tuple[str, str]:
    """Build evaluator prompt for a partial reasoning chain."""
    depth = node["depth"]
    path = node.get("path", [])
    current = node.get("content", "")

    chain_text = ""
    for i, step in enumerate(path, 1):
        chain_text += f"Step {i} ({REASONING_LABEL.get(i, 'Unknown')}): {step}\n"
    chain_text += f"Current Step ({REASONING_LABEL.get(depth, 'Unknown')}): {current}\n"

    system = "You are a venture analyst evaluating a PARTIAL strategic reasoning chain. Return ONLY valid JSON."
    user = f"""Evaluate whether this partial reasoning chain is worth exploring deeper.

Founder Context:
- Region: {ctx['region']}
- Industry: {ctx['industry']}
- Budget: {ctx['budget']}
- Background: {ctx['background']}

Reasoning chain so far:
{chain_text}

Current depth: {depth}/{MAX_DEPTH}
This node covers: {REASONING_LABEL.get(depth, 'Unknown')}

Score dimensions (0–10):
1. Coherence: Do steps logically follow each other?
2. Evidence Strength: Is the market thesis well-supported?
3. Founder-Market Fit: Does founder background match this direction?
4. Remaining Potential: Is this direction highly promising even if incomplete?

Return ONLY this JSON:
{{
  "metrics": [
    {{"metric": "Coherence",          "weight": 0.25, "score": 7.5, "confidence": 0.8, "range": [6.5, 8.5], "evidence_quality": "high",   "rationale": "..."}},
    {{"metric": "Evidence Strength",  "weight": 0.25, "score": 7.0, "confidence": 0.7, "range": [6.0, 8.0], "evidence_quality": "medium", "rationale": "..."}},
    {{"metric": "Founder-Market Fit", "weight": 0.25, "score": 8.0, "confidence": 0.9, "range": [7.5, 8.5], "evidence_quality": "high",   "rationale": "..."}},
    {{"metric": "Remaining Potential","weight": 0.25, "score": 7.5, "confidence": 0.75,"range": [6.5, 8.5], "evidence_quality": "medium", "rationale": "..."}}
  ],
  "value": 7.5,
  "confidence": 0.78,
  "score_range": [6.5, 8.5],
  "should_explore": true,
  "risk": "Main risk or concern with this reasoning chain"
}}"""

    return system, user