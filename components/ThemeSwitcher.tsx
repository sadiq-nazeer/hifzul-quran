"use client";

import { SunMoon } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { ACCENT_OPTIONS } from "@/lib/theme";
import type { AccentColor, ThemeMode } from "@/lib/theme";

const MODE_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

const ACCENT_SWATCHES: Record<AccentColor, string> = {
  green: "#22c55e",
  blue: "#38bdf8",
  purple: "#a78bfa",
  amber: "#fbbf24",
  rose: "#fb7185",
  teal: "#2dd4bf",
  orange: "#fb923c",
  indigo: "#818cf8",
};

export function ThemeSwitcher() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" role="group" aria-label="Theme and color">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open theme options"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/10 bg-surface-muted/80 text-foreground shadow-sm transition hover:bg-surface-highlight/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <SunMoon className="h-5 w-5" aria-hidden />
        <span className="sr-only">Theme</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-foreground/10 bg-surface-raised py-3 shadow-xl backdrop-blur"
          role="dialog"
          aria-label="Theme options"
        >
          <div className="px-3 pb-3">
            <div
              className="inline-flex w-full rounded-full border border-foreground/10 bg-surface-muted/80 p-0.5"
              role="tablist"
              aria-label="Theme mode"
            >
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === opt.id}
                  onClick={() => setMode(opt.id)}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-all duration-200 ${
                    mode === opt.id
                      ? "bg-brand text-black shadow-sm"
                      : "text-foreground-muted hover:bg-foreground/5 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-foreground/10 px-3 pt-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Accent color">
              {ACCENT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAccent(opt.id)}
                  aria-pressed={accent === opt.id}
                  title={opt.label}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised ${
                    accent === opt.id
                      ? "border-foreground shadow-md ring-2 ring-brand/50 ring-offset-2 ring-offset-surface-raised"
                      : "border-foreground/15 hover:border-foreground/30"
                  }`}
                  style={{ backgroundColor: ACCENT_SWATCHES[opt.id] }}
                >
                  {accent === opt.id ? (
                    <span
                      className="text-sm font-bold text-white drop-shadow-md"
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
