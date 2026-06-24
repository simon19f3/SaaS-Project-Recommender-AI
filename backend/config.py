"""Configuration and constants for the ToT agent."""

MAX_DEPTH = 4
BEAM_K = 2
BRANCH_COUNT = 3
LLM_TIMEOUT = 45
MAX_CONCURRENT_EVALS = 1

REASONING_TYPE: dict[int, str] = {
    1: "market_thesis",
    2: "icp_pain",
    3: "solution_mechanism",
    4: "business_model_moat",
}

REASONING_LABEL: dict[int, str] = {
    1: "Market Thesis",
    2: "ICP & Pain",
    3: "Solution Mechanism",
    4: "Business Model + Moat",
}