export interface MetricScore {
  metric: string;
  weight: number;
  score: number;
  confidence: number;
  range: [number, number];
  evidence_quality: "low" | "medium" | "high";
  rationale: string;
}

export interface ReasoningNode {
  id: string;
  label: string;
  content: string;
  description: string;
  parent_id?: string;
  depth: number;
  reasoning_type: string;
  path: string[];
  weighted_score: number;
  value: number;
  confidence: number;
  score_range: [number, number];
  metrics: MetricScore[];
  status:
    | "active" | "evaluated" | "survived" | "survived_rescued"
    | "pruned_verifier" | "pruned_beam" | "pruned_error"
    | "winner" | "execution_path";
  prune_reason?: string;
  eval_risk?: string;
  should_explore?: boolean;
  one_sentence_pitch?: string;
}

export interface ExecutionPath {
  name: string;
  focus: string;
  stack: string[];
  timeline: string;
  budget_required: string;
  first_milestone: string;
  pros: string[];
  cons: string[];
  score: number;
}

export interface ExecutionPaths {
  one_sentence_pitch: string;
  path_a: ExecutionPath;
  path_b: ExecutionPath;
  path_c: ExecutionPath;
  recommended_path: string;
  data_lineage: Array<{ source: string; url: string; used_for: string }>;
}

export interface TreeNode {
  id: string;
  label: string;
  depth: number | string;
  reasoning_type?: string;
  weighted_score: { val: number; conf: number; range: [number, number] };
  status: string;
  reason?: string;
  parent_id?: string;
}

export interface TreeState {
  metadata: { current_depth: number | string; max_depth: number; total_nodes: number };
  nodes: TreeNode[];
  edges: Array<{ from: string; to: string }>;
}

export interface AgentEvent {
  type: "start" | "phase_start" | "phase_complete" | "research_complete" | "done" | "error";
  phase?: string;
  phase_name?: string;
  depth?: number | string;
  title?: string;
  message?: string;
  tree_state?: TreeState;
  new_nodes?: ReasoningNode[];
  verified_nodes?: ReasoningNode[];
  scored_nodes?: ReasoningNode[];
  survivors?: ReasoningNode[];
  pruned_count?: number;
  winner?: ReasoningNode;
  execution_paths?: ExecutionPaths;
  reasoning_chain?: string[];
  all_branches?: ReasoningNode[];
}