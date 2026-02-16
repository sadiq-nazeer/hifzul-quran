"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AccentColor, ThemeMode } from "@/lib/theme";
import {
  getStoredAccent,
  getStoredTheme,
  resolveTheme,
  THEME_STORAGE_KEY,
  ACCENT_STORAGE_KEY,
} from "@/lib/theme";

type ThemeContextValue = {
  mode: ThemeMode;
  accent: AccentColor;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: AccentColor) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(resolved: "light" | "dark", accent: AccentColor) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-accent", accent);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [accent, setAccentState] = useState<AccentColor>("green");
  const [mounted, setMounted] = useState(false);
  const resolved = resolveTheme(mode);

  useEffect(() => {
    const storedMode = getStoredTheme();
    const storedAccent = getStoredAccent();
    setModeState(storedMode);
    setAccentState(storedAccent);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolved, accent);
  }, [mounted, resolved, accent]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    }
  }, []);

  const setAccent = useCallback((next: AccentColor) => {
    setAccentState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, accent, setMode, setAccent }),
    [mode, accent, setMode, setAccent]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
