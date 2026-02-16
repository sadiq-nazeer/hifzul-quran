import { useEffect, useState } from "react";
import { appendSessionHistory, readSessionHistory } from "@/lib/storage/sessionHistory";
import type { SessionHistoryEntry } from "@/lib/storage/sessionHistory";

type Props = {
  pendingEntry?: Omit<SessionHistoryEntry, "id" | "timestamp">;
  triggerSaveKey: string;
};

export const SessionHistory = ({ pendingEntry, triggerSaveKey }: Props) => {
  const [history, setHistory] = useState<SessionHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(readSessionHistory());
  }, []);

  useEffect(() => {
    if (!pendingEntry) {
      return;
    }
    const entry: SessionHistoryEntry = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      timestamp: Date.now(),
      ...pendingEntry,
    };
    appendSessionHistory(entry);
    setHistory(readSessionHistory());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSaveKey]);

  if (!history.length) {
    return (
      <section className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-foreground-muted">
        Session history will appear after you complete a run-through.
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-3xl border border-white/5 bg-surface-muted/40 p-6">
      <header>
        <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
          Session history (local)
        </p>
        <h2 className="text-xl font-semibold text-foreground">Recent streak</h2>
      </header>
      <ul className="space-y-3">
        {history.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border border-white/5 bg-surface-raised/40 px-4 py-3 text-sm"
          >
            <p className="text-foreground">
              Surah {item.chapterId} · Ayat {item.verseRange}
            </p>
            <p className="text-xs text-foreground-muted">
              {new Date(item.timestamp).toLocaleString()} • Avg confidence{" "}
              {item.averageScore}%
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              Focus: {item.notesFocus || "—"}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

