"use client";
import { useResearchStore } from "@/store/research";

export default function ActivityLog() {
  const { logs, status } = useResearchStore();
  if (status === "idle") return null;

  return (
    <div className="p-4 border-t border-[var(--border)]">
      <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Activity Log</div>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className="text-xs text-[var(--text-muted)] font-mono leading-relaxed">{log}</div>
        ))}
        {status === "running" && (
          <div className="flex gap-1 pt-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
