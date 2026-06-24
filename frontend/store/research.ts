import { create } from "zustand";
import { AgentEvent, ReasoningNode, ExecutionPaths, TreeState } from "@/types";

interface ResearchStore {
  status: "idle" | "running" | "complete" | "error";
  currentDepth: number;
  maxDepth: number;
  currentPhase: string;
  phaseMessage: string;
  events: AgentEvent[];
  allBranches: ReasoningNode[];
  winner: ReasoningNode | null;
  reasoningChain: string[];
  executionPaths: ExecutionPaths | null;
  treeState: TreeState | null;
  logs: string[];
  errorMessage: string;

  addEvent: (e: AgentEvent) => void;
  reset: () => void;
}

const initial = {
  status: "idle" as const,
  currentDepth: 0,
  maxDepth: 4,
  currentPhase: "",
  phaseMessage: "",
  events: [],
  allBranches: [],
  winner: null,
  reasoningChain: [],
  executionPaths: null,
  treeState: null,
  logs: [],
  errorMessage: "",
};

function normalizePhase(phase: any): string {
  return typeof phase === "string" ? phase : String(phase);
}

export const useResearchStore = create<ResearchStore>((set) => ({
  ...initial,

  addEvent: (event) =>
    set((state) => {
      const time = new Date().toLocaleTimeString([], { hour12: true, hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const logs = [...state.logs, `[${time}] ${event.message || event.type}`];

      switch (event.type) {
        case "start":
          return { ...state, logs, status: "running", currentPhase: "generate", currentDepth: 0 };

        case "phase_start": {
          const phase = normalizePhase(event.phase_name);
          const depth = typeof event.depth === "number" ? event.depth : state.currentDepth;
          return {
            ...state,
            logs,
            currentPhase: phase,
            currentDepth: depth,
            phaseMessage: event.message || "",
          };
        }

        case "phase_complete": {
          const updates: Partial<ResearchStore> = { logs };
          if (event.tree_state) {
            updates.treeState = event.tree_state;
            if (typeof event.tree_state.metadata?.max_depth === "number") {
              updates.maxDepth = event.tree_state.metadata.max_depth;
            }
          }
          if (typeof event.depth === "number") updates.currentDepth = event.depth;
          const phase = normalizePhase(event.phase || event.phase_name);
          if (phase) updates.currentPhase = phase;

          if (event.winner) updates.winner = event.winner;
          if (event.reasoning_chain) updates.reasoningChain = event.reasoning_chain;

          const incoming: any[] = [];
          if (event.new_nodes) incoming.push(...event.new_nodes);
          if (event.verified_nodes) incoming.push(...event.verified_nodes);
          if (event.scored_nodes) incoming.push(...event.scored_nodes);
          if (event.survivors) incoming.push(...event.survivors);
          if (event.all_branches) incoming.push(...event.all_branches);

          if (incoming.length > 0) {
            const existing = new Map(state.allBranches.map((b) => [b.id, b]));
            for (const inc of incoming) {
              if (inc && inc.id) {
                existing.set(inc.id, { ...(existing.get(inc.id) || {}), ...inc } as ReasoningNode);
              }
            }
            updates.allBranches = Array.from(existing.values());
          }

          return { ...state, ...updates };
        }

        case "research_complete":
          return {
            ...state,
            logs,
            status: "complete",
            currentPhase: "synthesize",
            winner: event.winner || state.winner,
            reasoningChain: event.reasoning_chain || state.reasoningChain,
            executionPaths: event.execution_paths || state.executionPaths,
            treeState: event.tree_state || state.treeState,
            allBranches: event.all_branches || state.allBranches,
          };

        case "error":
          return {
            ...state,
            logs,
            status: "error",
            errorMessage: event.message || "Unknown error",
            phaseMessage: event.message || "",
          };

        default:
          return { ...state, logs };
      }
    }),

  reset: () => set(initial),
}));