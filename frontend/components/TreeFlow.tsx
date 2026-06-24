"use client";
import { useEffect, useMemo } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, BackgroundVariant,
  Node, Edge, MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useResearchStore } from "@/store/research";
import { TreeState, TreeNode } from "@/types";

const S: Record<string, { bg: string; border: string; text: string; glow?: string }> = {
  active:           { bg: "#1a1a28", border: "#3d3d5c", text: "#8888a8" },
  evaluated:        { bg: "#0d1a28", border: "#1e40af", text: "#60a5fa" },
  survived:         { bg: "#0a2018", border: "#16a34a", text: "#4ade80" },
  survived_rescued: { bg: "#0d2010", border: "#15803d", text: "#4ade80" },
  pruned_verifier:  { bg: "#1a0a0a", border: "#991b1b", text: "#f87171" },
  pruned_beam:      { bg: "#180a0a", border: "#3d1a1a", text: "#444" },
  pruned_error:     { bg: "#1a0a0a", border: "#7f1d1d", text: "#666" },
  winner:           { bg: "#150a2a", border: "#8b5cf6", text: "#c4b5fd", glow: "0 0 30px rgba(139,92,246,0.5)" },
  execution_path:   { bg: "#0a1a2a", border: "#06b6d4", text: "#22d3ee" },
};

const LABELS: Record<string, string> = {
  active: "CANDIDATE", evaluated: "SCORED", survived: "SURVIVED ✓",
  survived_rescued: "RESCUED ✓", pruned_verifier: "KILLED ✗",
  pruned_beam: "PRUNED (beam)", pruned_error: "ERROR",
  winner: "★ WINNER", execution_path: "EXEC PATH",
};

const DEPTH_LABELS: Record<number | string, string> = {
  1: "Market Thesis",
  2: "ICP & Pain",
  3: "Solution",
  4: "Business Model + Moat",
  exec: "Execution Paths",
};

function buildFlow(treeState: TreeState | null): { nodes: Node[]; edges: Edge[] } {
  if (!treeState?.nodes?.length) return { nodes: [], edges: [] };

  const tnodes = treeState.nodes;
  const tedges = treeState.edges || [];

  const byDepth: Record<string, TreeNode[]> = {};
  for (const n of tnodes) {
    const d = n.depth ?? 1;
    const key = String(d);
    if (!byDepth[key]) byDepth[key] = [];
    byDepth[key].push(n);
  }

  const DEPTH_KEYS = Object.keys(byDepth).sort((a, b) => {
    if (a === "exec") return 1;
    if (b === "exec") return -1;
    return Number(a) - Number(b);
  });

  const NODE_W = 220;
  const ROW_GAP = 240;
  const START_Y = 100;

  const posMap: Record<string, { x: number; y: number }> = {};
  const flowNodes: Node[] = [];
  const flowEdges: Edge[] = [];

  // Root
  flowNodes.push({
    id: "root",
    position: { x: 0, y: 0 },
    data: { label: "🌳 Founder Context" },
    style: {
      background: "#1a1a28", border: "1px solid #3d3d5c",
      borderRadius: 10, color: "#e8e8f0", fontSize: 12,
      fontWeight: 700, padding: "8px 20px", textAlign: "center",
    },
  });
  posMap["root"] = { x: 0, y: 0 };

  DEPTH_KEYS.forEach((dk, rowIdx) => {
    const rowNodes = byDepth[dk];
    const rowY = START_Y + rowIdx * ROW_GAP;
    const totalW = rowNodes.length * NODE_W;
    const startX = -totalW / 2 + NODE_W / 2;

    // Depth label
    flowNodes.push({
      id: `__depth_${dk}`,
      position: { x: -totalW / 2 - 120, y: rowY + 35 },
      data: { label: DEPTH_LABELS[dk] || `Depth ${dk}` },
      style: {
        background: "transparent", border: "none",
        color: dk === "exec" ? "#06b6d4" : "#555570",
        fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
        padding: 0, pointerEvents: "none",
      },
    });

    rowNodes.forEach((n, i) => {
      const x = startX + i * NODE_W;
      const y = rowY;
      posMap[n.id] = { x, y };

      const c = S[n.status] || S.active;
      const isWinner = n.status === "winner";
      const isPruned = n.status?.startsWith("pruned") || false;

      const w = n.weighted_score;
      const score = typeof w === "object" ? w.val : Number(w) || 0;
      const range = typeof w === "object" ? w.range : [score - 1, score + 1];
      const conf = typeof w === "object" ? w.conf : 0.5;

      flowNodes.push({
        id: n.id,
        position: { x, y },
        data: {
          label: (
            <div style={{ textAlign: "left", minWidth: 180, opacity: isPruned ? 0.45 : 1 }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: c.text, letterSpacing: "0.1em", marginBottom: 3, display: "flex", justifyContent: "space-between" }}>
                <span>{LABELS[n.status] || n.status?.toUpperCase() || "NODE"}</span>
                <span style={{ color: "#444460" }}>{n.reasoning_type?.replace("_", " ")}</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#e8e8f0", marginBottom: 4, lineHeight: 1.3 }}>
                {n.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isWinner ? "#c4b5fd" : c.text }}>
                {score.toFixed(1)}
                <span style={{ fontSize: 9, color: "#555570", marginLeft: 2 }}>/ 10</span>
                <span style={{ fontSize: 9, color: "#555570", marginLeft: 6 }}>
                  [{range[0]?.toFixed?.(1) ?? "?" }–{range[1]?.toFixed?.(1) ?? "?"}]
                </span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 5, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: `${Math.min(100, Math.max(0, (range[0] || 0) * 10))}%`, width: `${Math.min(100, Math.max(0, ((range[1] || 0) - (range[0] || 0)) * 10))}%`, height: "100%", background: c.border + "50", borderRadius: 2 }} />
                <div style={{ position: "absolute", left: `${Math.min(100, Math.max(0, score * 10))}%`, width: 3, height: "100%", background: c.border, borderRadius: 1 }} />
              </div>
              <div style={{ fontSize: 8, color: "#444460", marginTop: 3, display: "flex", justifyContent: "space-between" }}>
                <span>conf {Math.round(conf * 100)}%</span>
                <span>depth {n.depth}</span>
              </div>
            </div>
          ),
        },
        style: {
          background: c.bg,
          border: `${isWinner ? 2.5 : 1.5}px solid ${c.border}`,
          borderRadius: 12,
          padding: "10px 12px",
          boxShadow: c.glow || "none",
          minWidth: NODE_W - 10,
        },
      });
    });
  });

  // Edges
  const edgeSet = new Set<string>();
  for (const e of tedges) {
    if (!e?.from || !e?.to) continue;
    if (!posMap[e.from] || !posMap[e.to]) continue;
    const key = `${e.from}->${e.to}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    const toNode = tnodes.find((n) => n.id === e.to);
    const toExec = e.to.startsWith("path_");
    const toSurvivor = toNode?.status?.startsWith("survived") || toNode?.status === "winner";
    const toPruned = toNode?.status?.startsWith("pruned");

    flowEdges.push({
      id: key,
      source: e.from,
      target: e.to,
      animated: toSurvivor || toExec || false,
      style: {
        stroke: toPruned ? "#2a1a1a" : toExec ? "#06b6d4" : toSurvivor ? "#16a34a" : "#2a2a40",
        strokeWidth: toSurvivor ? 2.5 : 1.5,
        strokeDasharray: toPruned ? "3 4" : "none",
      },
      markerEnd: toPruned ? undefined : {
        type: MarkerType.ArrowClosed,
        color: toExec ? "#06b6d4" : toSurvivor ? "#16a34a" : "#3d3d5c",
        width: 12, height: 12,
      },
    });
  }

  return { nodes: flowNodes, edges: flowEdges };
}

function Legend() {
  const items = [
    { color: "#3d3d5c", label: "Candidate" },
    { color: "#1e40af", label: "Evaluated" },
    { color: "#16a34a", label: "Survived" },
    { color: "#991b1b", label: "Killed (Verifier)" },
    { color: "#3d1a1a", label: "Pruned (Beam)" },
    { color: "#8b5cf6", label: "Winner" },
    { color: "#06b6d4", label: "Exec Path" },
  ];
  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-[var(--border)] p-3 flex flex-col gap-1.5"
      style={{ background: "rgba(10,10,15,0.9)", backdropFilter: "blur(8px)" }}>
      <div className="text-xs font-semibold text-[var(--text-muted)] mb-0.5 uppercase tracking-wider">Legend</div>
      {items.map(it => (
        <div key={it.label} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: it.color + "30", border: `1.5px solid ${it.color}` }} />
          {it.label}
        </div>
      ))}
    </div>
  );
}

export default function TreeFlow() {
  const { treeState, status } = useResearchStore();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const flow = useMemo(() => buildFlow(treeState), [treeState]);

  useEffect(() => {
    if (flow.nodes.length) {
      setNodes(flow.nodes);
      setEdges(flow.edges);
    }
  }, [flow, setNodes, setEdges]);

  if (status === "idle") {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-[var(--border)] flex items-center justify-center mb-6 text-4xl">
          ∞
        </div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">True Tree of Thought</h2>
        <p className="text-sm text-[var(--text-muted)] max-w-sm leading-relaxed">
          BFS + Beam Search over <strong className="text-[var(--text-secondary)]">partial reasoning chains</strong>. Each depth adds one strategic step: Market Thesis → ICP & Pain → Solution → Business Model.
        </p>
        <div className="mt-8 flex flex-col gap-2 text-sm text-[var(--text-muted)]">
          <div className="flex items-center gap-2 justify-center">
            <span className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs">🌱 Generate</span>
            <span>→</span>
            <span className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs">✓ Verify</span>
            <span>→</span>
            <span className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs">📊 Evaluate</span>
            <span>→</span>
            <span className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs">✂️ Beam</span>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Repeats for 4 depths, then synthesizes winner</div>
        </div>
      </div>
    );
  }

  if (!treeState?.nodes?.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-purple)] border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-[var(--text-muted)]">Building reasoning tree...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative" style={{ background: "var(--bg-primary)" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.15}
        maxZoom={1.5}
        attributionPosition="bottom-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1f1f30" />
        <Controls className="[&>button]:bg-[var(--bg-card)] [&>button]:border-[var(--border)] [&>button]:text-[var(--text-secondary)]" />
        <MiniMap
          style={{ background: "#12121a", border: "1px solid #2a2a3d" }}
          nodeColor={(n) => {
            const border = n.style?.border as string;
            const match = border?.match(/#([0-9a-f]{6})/i);
            return match ? `#${match[1]}` : "#3d3d5c";
          }}
        />
      </ReactFlow>
      <Legend />
    </div>
  );
}