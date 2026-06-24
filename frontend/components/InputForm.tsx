"use client";
import { useState } from "react";
import { useResearchStore } from "@/store/research";
import { AgentEvent } from "@/types";

const REGIONS = ["North America", "Europe", "Southeast Asia", "Africa", "Latin America", "Middle East", "South Asia", "Global"];
const INDUSTRIES = ["B2B SaaS", "FinTech", "HealthTech", "EdTech", "Construction & Real Estate", "Logistics & Supply Chain", "HR & Talent", "Legal Tech", "AgriTech", "Climate Tech", "E-commerce", "DevTools"];
const BUDGETS = ["$5k - $20k", "$20k - $50k", "$50k - $150k", "$150k - $500k", "$500k+"];

export default function InputForm() {
  const { status, addEvent, reset } = useResearchStore();
  const [form, setForm] = useState({ region: "", industry: "", budget: "", background: "", api_key: "" });

  const isRunning = status === "running";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.api_key || !form.region || !form.industry || !form.budget || !form.background) return;
    reset();

    try {
      const res = await fetch("http://localhost:8000/research/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const evt: AgentEvent = JSON.parse(line.slice(6));
              addEvent(evt);
            } catch {}
          }
        }
      }
    } catch (err: any) {
      addEvent({ type: "error", message: err.message });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-[var(--border)]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-sm font-bold">T</div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">ToT Research Agent</h1>
        </div>
        <p className="text-xs text-[var(--text-muted)] ml-11">LangGraph · Beam Search k=3</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* API Key */}
                <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">
            Gemini API Key
          </label>
          <input
            type="password"
            value={form.api_key}
            onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
            placeholder="AIza..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            required
          />
        </div>

        {/* Region */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Target Region</label>
          <select
            value={form.region}
            onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            required
          >
            <option value="">Select region...</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Industry */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Industry Focus</label>
          <select
            value={form.industry}
            onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
            required
          >
            <option value="">Select industry...</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Development Budget</label>
          <div className="grid grid-cols-1 gap-1.5">
            {BUDGETS.map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setForm(p => ({ ...p, budget: b }))}
                className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all border ${
                  form.budget === b
                    ? "border-[var(--accent-cyan)] bg-cyan-500/10 text-[var(--accent-cyan)]"
                    : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)]"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Background */}
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">Founder Background</label>
          <textarea
            value={form.background}
            onChange={e => setForm(p => ({ ...p, background: e.target.value }))}
            placeholder="e.g. 5 years backend engineering, no sales experience, ex-Stripe engineer, interested in fintech..."
            rows={4}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors resize-none"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isRunning}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
            isRunning
              ? "bg-[var(--bg-card)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border)]"
              : "bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:opacity-90 active:scale-[0.98] shadow-lg"
          }`}
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 rounded-full border-2 border-[var(--text-muted)] border-t-transparent animate-spin" />
              Researching...
            </span>
          ) : (
            "▶ Run ToT Analysis"
          )}
        </button>
      </form>
    </div>
  );
}
