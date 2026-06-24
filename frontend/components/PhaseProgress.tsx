"use client";
import { useResearchStore } from "@/store/research";

const PHASES = [
  { key: "generate",    label: "Generate", icon: "🌱" },
  { key: "verify",      label: "Verify",   icon: "✓" },
  { key: "evaluate",    label: "Evaluate", icon: "📊" },
  { key: "beam_select", label: "Beam",     icon: "✂️" },
  { key: "synthesize",  label: "Final",    icon: "🏆" },
];

const DEPTH_NAMES: Record<number, string> = {
  1: "Market Thesis",
  2: "ICP & Pain",
  3: "Solution",
  4: "Business Model",
};

export default function PhaseProgress() {
  const { currentPhase, currentDepth, maxDepth, status, phaseMessage } = useResearchStore();
  if (status === "idle") return null;

  const isComplete = status === "complete";

  return (
    <div className="px-5 py-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      {/* Depth indicator */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
          BFS Beam Search — Depth {currentDepth} / {maxDepth}
        </span>
        <div className="flex gap-1">
          {Array.from({ length: maxDepth }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-8 rounded-full transition-all"
              style={{
                background: i < currentDepth - 1
                  ? "var(--accent-cyan)"
                  : i === currentDepth - 1 && !isComplete
                  ? "var(--accent-purple)"
                  : "var(--border)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Phase steps */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {PHASES.map((p, idx) => {
          const currentIdx = PHASES.findIndex(x => x.key === currentPhase);
          const isDone = isComplete || (currentIdx !== -1 && currentIdx > idx);
          const isActive = currentIdx !== -1 && currentIdx === idx && !isComplete;

          return (
            <div key={p.key} className="flex items-center gap-1 flex-shrink-0">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
                style={{
                  background: isDone
                    ? "rgba(0,212,255,0.08)"
                    : isActive
                    ? "rgba(139,92,246,0.15)"
                    : "transparent",
                  borderColor: isDone
                    ? "var(--accent-cyan)"
                    : isActive
                    ? "var(--accent-purple)"
                    : "var(--border)",
                  color: isDone
                    ? "var(--accent-cyan)"
                    : isActive
                    ? "#c4b5fd"
                    : "var(--text-muted)",
                }}
              >
                <span>{p.icon}</span>
                <span className="hidden sm:inline">{p.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse" />
                )}
              </div>
              {idx < PHASES.length - 1 && (
                <span className="text-[var(--text-muted)] text-xs">→</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current depth label */}
      {currentDepth > 0 && currentDepth <= maxDepth && !isComplete && (
        <div className="mt-2 text-xs text-[var(--accent-purple)] font-medium">
          Current reasoning layer: {DEPTH_NAMES[currentDepth] || `Depth ${currentDepth}`}
        </div>
      )}

      {/* Message */}
      {phaseMessage && !isComplete && (
        <p className="mt-2 text-xs text-[var(--accent-purple)] flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-pulse flex-shrink-0" />
          {phaseMessage}
        </p>
      )}
      {isComplete && (
        <p className="mt-2 text-xs text-[var(--accent-green)] flex items-center gap-1.5">
          <span>✓</span> All depths explored — Venture Dossier ready
        </p>
      )}
    </div>
  );
}