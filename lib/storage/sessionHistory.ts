export type SessionHistoryEntry = {
  id: string;
  timestamp: number;
  chapterId: number;
  verseRange: string;
  averageScore: number;
  notesFocus: string;
};

const STORAGE_KEY = "coach-session-history";

const isBrowser = () => typeof window !== "undefined";

export const readSessionHistory = (): SessionHistoryEntry[] => {
  if (!isBrowser()) {
    return [];
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as SessionHistoryEntry[];
    return parsed ?? [];
  } catch {
    return [];
  }
};

export const writeSessionHistory = (entries: SessionHistoryEntry[]) => {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 12)));
};

export const appendSessionHistory = (entry: SessionHistoryEntry) => {
  const existing = readSessionHistory();
  writeSessionHistory([entry, ...existing]);
};

