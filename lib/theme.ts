export type ThemeMode = "light" | "dark";
export type AccentColor =
  | "green"
  | "blue"
  | "purple"
  | "amber"
  | "rose"
  | "teal"
  | "orange"
  | "indigo";

export const ACCENT_OPTIONS: { id: AccentColor; label: string }[] = [
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "purple", label: "Purple" },
  { id: "amber", label: "Amber" },
  { id: "rose", label: "Rose" },
  { id: "teal", label: "Teal" },
  { id: "orange", label: "Orange" },
  { id: "indigo", label: "Indigo" },
];

export const THEME_STORAGE_KEY = "hifzdeen-theme";
export const ACCENT_STORAGE_KEY = "hifzdeen-accent";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const v = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (v === "light" || v === "dark") return v;
  return "light";
}

export function getStoredAccent(): AccentColor {
  if (typeof window === "undefined") return "green";
  const v = window.localStorage.getItem(ACCENT_STORAGE_KEY);
  if (
    v === "green" ||
    v === "blue" ||
    v === "purple" ||
    v === "amber" ||
    v === "rose" ||
    v === "teal" ||
    v === "orange" ||
    v === "indigo"
  )
    return v;
  return "green";
}

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  return mode;
}
