"use client";
import { useResearchStore } from "@/store/research";
import { MetricScore, ExecutionPath } from "@/types";

function ScoreBar({ score, range, color = "#00d4ff" }: { score: number; range: number[]; color?: string }) {
  const pct = (v: number) => Math.min(100, Math.max(0, v * 10));
  return (
    <div className="relative h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="absolute h-full rounded-full opacity-30" style={{ left: `${pct(range[0])}%`, width: `${pct(range[1]) - pct(range[0])}%`, background: color }} />
      <div className="absolute h-full w-1.5 rounded-full" style={{ left: `${pct(score)}%`, background: color }} />
    </div>
  );
}

function EvidenceBadge({ quality }: { quality: string }) {
  const map: Record<string, string> = { high: "#22c55e", medium: "#f59e0b", low: "#ef4444" };
  return (
    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded" style={{ background: `${map[quality]}15`, color: map[quality], border: `1px solid ${map[quality]}40` }}>
      {quality}
    </span>
  );
}

function MetricCard({ m }: { m: MetricScore }) {
  const pct = Math.round(m.confidence * 100);
  return (
    <div className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border-bright)] transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{m.metric}</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-bold text-[var(--text-primary)]">{m.score.toFixed(1)}</span>
            <span className="text-xs text-[var(--text-muted)]">/ 10</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--text-muted)] mb-1">Confidence</div>
          <div className="text-sm font-semibold text-[var(--accent-cyan)]">{pct}%</div>
        </div>
      </div>
      <ScoreBar score={m.score} range={m.range} />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[var(--text-muted)]">[{m.range[0].toFixed(1)}–{m.range[1].toFixed(1)}]</span>
        <EvidenceBadge quality={m.evidence_quality} />
      </div>
      {m.rationale && <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">{m.rationale}</p>}
    </div>
  );
}

function PathCard({ path, id, recommended }: { path: ExecutionPath; id: string; recommended: boolean }) {
  const pathColors: Record<string, { accent: string; bg: string }> = {
    path_a: { accent: "#22c55e", bg: "rgba(34,197,94,0.08)" },
    path_b: { accent: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
    path_c: { accent: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  };
  const { accent, bg } = pathColors[id] || pathColors.path_a;

  return (
    <div className="rounded-xl border-2 p-5 relative" style={{ borderColor: recommended ? accent : "var(--border)", background: recommended ? bg : "transparent" }}>
      {recommended && (
        <div className="absolute -top-3 left-4 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: accent, color: "#000" }}>
          ★ RECOMMENDED
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: accent }}>{id.replace("_", " ").toUpperCase()}</div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">{path.name}</h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{path.focus}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: accent }}>{path.score.toFixed(1)}</div>
          <div className="text-xs text-[var(--text-muted)]">score</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
          <div className="text-[var(--text-muted)] mb-0.5">Timeline</div>
          <div className="font-medium text-[var(--text-primary)]">{path.timeline}</div>
        </div>
        <div className="rounded-lg bg-[var(--bg-secondary)] p-3">
          <div className="text-[var(--text-muted)] mb-0.5">Budget</div>
          <div className="font-medium text-[var(--text-primary)]">{path.budget_required}</div>
        </div>
      </div>

      <div className="text-xs rounded-lg p-3 mb-3" style={{ background: `${accent}10`, border: `1px solid ${accent}30` }}>
        <span className="font-semibold" style={{ color: accent }}>First Milestone: </span>
        <span className="text-[var(--text-secondary)]">{path.first_milestone}</span>
      </div>

      <div className="text-xs mb-2">
        <div className="font-medium text-[var(--text-secondary)] mb-1">Stack</div>
        <div className="flex flex-wrap gap-1">
          {path.stack.map(s => (
            <span key={s} className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)]">{s}</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mt-3">
        <div>
          <div className="text-green-500 font-medium mb-1">Pros</div>
          {path.pros.map((p, i) => <div key={i} className="text-[var(--text-muted)] flex gap-1"><span className="text-green-500">+</span>{p}</div>)}
        </div>
        <div>
          <div className="text-red-400 font-medium mb-1">Cons</div>
          {path.cons.map((c, i) => <div key={i} className="text-[var(--text-muted)] flex gap-1"><span className="text-red-400">−</span>{c}</div>)}
        </div>
      </div>
    </div>
  );
}

export default function VentureDossier() {
  const { winner, executionPaths, allBranches, reasoningChain, status } = useResearchStore();

  if (status === "idle") return null;

  if (!winner) {
    return (
      <div className="p-6 flex items-center gap-3">
        <div className="w-4 h-4 rounded-full border-2 border-[var(--accent-purple)] border-t-transparent animate-spin" />
        <span className="text-sm text-[var(--text-muted)]">Exploring reasoning tree...</span>
      </div>
    );
  }

  const byDepth: Record<number, typeof allBranches> = {};
  for (const b of allBranches) {
    const d = typeof b.depth === "number" ? b.depth : 0;
    if (!byDepth[d]) byDepth[d] = [];
    byDepth[d].push(b);
  }

  const depthNames = ["Root", "Market Thesis", "ICP & Pain", "Solution Mechanism", "Business Model + Moat"];

  return (
    <div className="space-y-6 p-5">
      {/* Winning Reasoning Chain */}
      <div className="rounded-2xl border-2 border-purple-500 p-5 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #150a2a, #0a0f2a)" }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #8b5cf6 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">★ Winning Reasoning Chain</div>
          <h2 className="text-2xl font-bold text-white mb-2">{winner.label}</h2>
          {winner.one_sentence_pitch && (
            <p className="text-sm text-purple-200 italic">"{winner.one_sentence_pitch}"</p>
          )}

          {reasoningChain.length > 0 && (
            <div className="mt-4 space-y-3">
              {reasoningChain.map((step, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xs font-bold text-purple-300">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-0.5">{depthNames[i + 1]}</div>
                    <p className="text-slate-300 leading-relaxed">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-4xl font-bold text-purple-300">{winner.value?.toFixed(1) || winner.weighted_score?.toFixed(1)}</span>
            <span className="text-sm text-purple-500">/ 10 reasoning value</span>
            <span className="text-xs text-purple-500">[{winner.score_range?.[0]?.toFixed(1)}–{winner.score_range?.[1]?.toFixed(1)}]</span>
          </div>
        </div>
      </div>

      {/* Winner Metrics */}
      {winner.metrics && winner.metrics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Partial-Path Evaluation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {winner.metrics.map((m: any) => <MetricCard key={m.metric} m={m} />)}
          </div>
        </div>
      )}

      {/* Execution Paths */}
      {executionPaths && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Execution Paths</h3>
          <div className="grid grid-cols-1 gap-4">
            {(["path_a", "path_b", "path_c"] as const).map(pid => {
              const p = executionPaths[pid];
              if (!p) return null;
              return <PathCard key={pid} path={p} id={pid} recommended={executionPaths.recommended_path === pid} />;
            })}
          </div>
        </div>
      )}

      {/* Tree Autopsy: What died and why */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Reasoning Tree Autopsy</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(d => {
            const nodes = byDepth[d] || [];
            const killed = nodes.filter(n => n.status?.startsWith("pruned"));
            if (killed.length === 0) return null;
            return (
              <div key={d} className="rounded-xl border border-[var(--border)] p-4">
                <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  Depth {d}: {depthNames[d]} — {killed.length} pruned
                </div>
                <div className="space-y-2">
                  {killed.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-start gap-2 text-xs">
                      <span className="text-red-400 font-bold flex-shrink-0">✗</span>
                      <div>
                        <span className="text-[var(--text-secondary)] font-medium">{b.label}</span>
                        <span className="text-[var(--text-muted)] ml-2">({b.status})</span>
                        {b.prune_reason && <p className="text-[var(--text-muted)] mt-0.5">{b.prune_reason}</p>}
                      </div>
                    </div>
                  ))}
                  {killed.length > 5 && <div className="text-xs text-[var(--text-muted)]">+ {killed.length - 5} more...</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Data Lineage */}
      {executionPaths?.data_lineage && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Data Lineage</h3>
          <div className="space-y-2">
            {executionPaths.data_lineage.map((d, i) => (
              <div key={i} className="rounded-lg border border-[var(--border)] p-3 flex items-center gap-3 text-xs">
                <span className="font-semibold text-[var(--accent-cyan)] flex-shrink-0">{d.source}</span>
                <span className="text-[var(--text-muted)]">{d.used_for}</span>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-[var(--text-muted)] hover:text-[var(--accent-cyan)] transition-colors flex-shrink-0">
                  ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}