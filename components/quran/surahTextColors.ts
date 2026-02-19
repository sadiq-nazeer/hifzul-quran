/**
 * Shared color options for surah text and highlight (current ayah text color).
 * Theme-aware: readable in both light and dark mode.
 * Highlight = text color of the current/playing ayah only (no background, no underline color).
 */

export type SurahTextColorId =
  | "brand"
  | "accent"
  | "teal"
  | "amber"
  | "rose"
  | "foreground";

export type SurahTextColorOption = {
  id: SurahTextColorId;
  label: string;
  /** Theme-aware Tailwind text class (light + dark) */
  textClass: string;
  /** For swatch preview in pickers */
  swatchClass: string;
};

export const SURAH_TEXT_COLOR_OPTIONS: SurahTextColorOption[] = [
  { id: "brand", label: "Theme", textClass: "text-brand", swatchClass: "bg-brand" },
  { id: "accent", label: "Accent", textClass: "text-brand-accent", swatchClass: "bg-brand-accent" },
  { id: "teal", label: "Teal", textClass: "text-teal-600 dark:text-teal-400", swatchClass: "bg-teal-500" },
  { id: "amber", label: "Amber", textClass: "text-amber-600 dark:text-amber-400", swatchClass: "bg-amber-500" },
  { id: "rose", label: "Rose", textClass: "text-rose-600 dark:text-rose-400", swatchClass: "bg-rose-500" },
  { id: "foreground", label: "Default", textClass: "text-foreground", swatchClass: "bg-foreground" },
];

export function getSurahTextColorOption(id: SurahTextColorId): SurahTextColorOption {
  const opt = SURAH_TEXT_COLOR_OPTIONS.find((o) => o.id === id);
  return opt ?? SURAH_TEXT_COLOR_OPTIONS[SURAH_TEXT_COLOR_OPTIONS.length - 1]!;
}
