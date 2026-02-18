"use client";

import { useState } from "react";

type PhaseStatus = "pending" | "current" | "complete";

type Phase = {
  id: string;
  label: string;
  description: string;
  status: PhaseStatus;
};

type Props = {
  phases: readonly Phase[];
};

const statusClasses: Record<PhaseStatus, string> = {
  pending: "border-white/10 bg-transparent text-foreground-muted",
  current:
    "border-brand bg-gradient-to-r from-brand/20 via-brand/10 to-transparent text-foreground",
  complete: "border-emerald-400/40 bg-emerald-400/20 text-foreground",
};

export const CoachSessionTimeline = ({ phases }: Props) => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <section className="rounded-3xl border border-white/5 bg-surface-muted/40 p-6">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-start justify-between gap-2 text-left"
        aria-expanded={!collapsed}
      >
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            Ritual loop
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Listen → Whisper → Recite → Reflect
          </h2>
        </div>
        <span
          className={`mt-2 shrink-0 text-foreground-muted transition-transform ${collapsed ? "" : "rotate-180"}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {!collapsed && (
        <ol className="mt-6 space-y-4">
          {phases.map((phase, index) => (
            <li
              key={phase.id}
              className={`flex items-start gap-4 rounded-2xl border px-4 py-3 transition ${statusClasses[phase.status]}`}
            >
              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.4em] text-foreground-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-sm font-semibold">{phase.label}</p>
                <p className="text-xs text-foreground-muted">{phase.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

