import { type ChangeEvent, useMemo } from "react";
import type { CoachBundleParams } from "@/lib/hooks/useCoachBundle";
import type { ChapterSummary, ReciterProfile } from "@/lib/types/quran";

const translationOptions = [
  { id: 20, label: "Sahih International (EN)" },
  { id: 131, label: "Dr. Mustafa Khattab (EN)" },
];

const tafsirOptions = [
  { id: 169, label: "Tafsir Ibn Kathir (EN excerpt)" },
  { id: 168, label: "Al-Jalalayn (EN excerpt)" },
];

type Props = {
  chapters: ChapterSummary[];
  reciters: ReciterProfile[];
  value: CoachBundleParams;
  onChange: (value: CoachBundleParams) => void;
  isLoadingVerses: boolean;
};

const numberField = (
  value: number | undefined,
  fallback: number,
): number => {
  if (!value || Number.isNaN(value)) {
    return fallback;
  }
  return value;
};

export const CoachConfigurator = ({
  chapters,
  reciters,
  value,
  onChange,
  isLoadingVerses,
}: Props) => {
  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === value.chapterId),
    [chapters, value.chapterId],
  );

  const maxVerse = selectedChapter?.versesCount ?? 7;

  const handleNumberChange = (
    key: keyof CoachBundleParams,
    fallback: number,
  ) => (event: ChangeEvent<HTMLInputElement>) => {
    const parsed = Number(event.target.value);
    onChange({
      ...value,
      [key]: Number.isFinite(parsed) ? parsed : fallback,
    });
  };

  const handleSelectChange = (
    key: keyof CoachBundleParams,
  ) => (event: ChangeEvent<HTMLSelectElement>) => {
    const parsed = Number(event.target.value);
    onChange({
      ...value,
      [key]: Number.isFinite(parsed) ? parsed : undefined,
    });
  };

  const handleChapterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const parsed = Number(event.target.value);
    const fallbackEnd = Math.min(5, chapters.find((c) => c.id === parsed)?.versesCount ?? 5);
    onChange({
      ...value,
      chapterId: Number.isFinite(parsed) ? parsed : undefined,
      fromVerse: 1,
      toVerse: fallbackEnd,
    });
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-surface-raised/60 p-6 shadow-xl shadow-brand/5">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            Session Setup
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            Configure your memorization pass
          </h2>
        </div>
        <span className="text-xs text-foreground-muted">
          {isLoadingVerses ? "Refreshing bundle…" : "Ready"}
        </span>
      </header>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-foreground-muted">
          Surah
          <select
            className="rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none focus:border-brand"
            value={value.chapterId ?? ""}
            onChange={handleChapterChange}
          >
            <option value="">Select a chapter</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.id}. {chapter.nameSimple} ({chapter.versesCount} ayat)
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-foreground-muted">
          Reciter
          <select
            className="rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none focus:border-brand"
            value={value.reciterId ?? ""}
            onChange={handleSelectChange("reciterId")}
          >
            <option value="">Default (Mishari Rashid Al-Afasy)</option>
            {reciters.map((reciter) => (
              <option key={reciter.id} value={reciter.id}>
                {reciter.name} ({reciter.style})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-foreground-muted">
          From verse
          <input
            type="number"
            min={1}
            max={maxVerse}
            className="rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none focus:border-brand"
            value={numberField(value.fromVerse, 1)}
            onChange={handleNumberChange("fromVerse", 1)}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-foreground-muted">
          To verse
          <input
            type="number"
            min={value.fromVerse ?? 1}
            max={maxVerse}
            className="rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none focus:border-brand"
            value={numberField(value.toVerse, Math.min(5, maxVerse))}
            onChange={handleNumberChange("toVerse", Math.min(5, maxVerse))}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-foreground-muted">
          Translation
          <select
            className="rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none focus:border-brand"
            value={value.translationId ?? ""}
            onChange={handleSelectChange("translationId")}
          >
            <option value="">None</option>
            {translationOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-foreground-muted">
          Tafsir (reflection sparks)
          <select
            className="rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none focus:border-brand"
            value={value.tafsirId ?? ""}
            onChange={handleSelectChange("tafsirId")}
          >
            <option value="">None</option>
            {tafsirOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
};

