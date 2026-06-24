"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import InputForm from "@/components/InputForm";
import PhaseProgress from "@/components/PhaseProgress";
import VentureDossier from "@/components/VentureDossier";
import ActivityLog from "@/components/ActivityLog";
import { useResearchStore } from "@/store/research";

const TreeFlow = dynamic(() => import("@/components/TreeFlow"), { ssr: false });

export default function Home() {
  const [activeTab, setActiveTab] = useState<"tree" | "dossier">("tree");
  const { status, currentDepth, maxDepth } = useResearchStore();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-primary)" }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-[var(--border)] flex flex-col" style={{ background: "var(--bg-secondary)" }}>
        <InputForm />
        <ActivityLog />
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="border-b border-[var(--border)] px-5 py-3 flex items-center gap-3 flex-wrap" style={{ background: "var(--bg-secondary)" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">∞</span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              SaaS Logic-Tree Agent
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              True ToT · LangGraph · Depth {maxDepth} · Beam k=2
            </span>
          </div>

          {/* Depth badge */}
          {status !== "idle" && (
            <div className="flex items-center gap-1.5 ml-2 px-2.5 py-1 rounded-full border text-xs font-semibold"
              style={{
                borderColor: status === "complete" ? "var(--accent-cyan)" : "var(--accent-purple)",
                color: status === "complete" ? "var(--accent-cyan)" : "#c4b5fd",
                background: status === "complete" ? "rgba(0,212,255,0.08)" : "rgba(139,92,246,0.1)",
              }}>
              {status === "complete" ? "✓ Done" : `Depth ${currentDepth}/${maxDepth}`}
            </div>
          )}

          {/* Tab switcher */}
          <div className="ml-auto flex gap-1 rounded-lg border border-[var(--border)] p-0.5" style={{ background: "var(--bg-primary)" }}>
            {(["tree", "dossier"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
                style={{
                  background: activeTab === tab ? "var(--bg-card)" : "transparent",
                  color: activeTab === tab ? "var(--text-primary)" : "var(--text-muted)",
                  border: activeTab === tab ? "1px solid var(--border-bright)" : "1px solid transparent",
                }}
              >
                {tab === "tree" ? "∞ Tree View" : "📄 Dossier"}
              </button>
            ))}
          </div>
        </div>

        {/* Phase progress */}
        <PhaseProgress />

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "tree" ? (
            <TreeFlow />
          ) : (
            <div className="h-full overflow-y-auto">
              <VentureDossier />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}