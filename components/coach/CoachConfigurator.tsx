import { SlidersHorizontal } from "lucide-react";
import { type ChangeEvent, useMemo } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
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

  const chapterOptions = useMemo(
    () =>
      chapters.map((chapter) => ({
        value: chapter.id,
        label: `${chapter.id}. ${chapter.nameSimple}`,
        subtitle: `${chapter.versesCount} ayat`,
        searchText: chapter.nameArabic,
      })),
    [chapters],
  );

  const reciterOptions = useMemo(
    () =>
      reciters.map((reciter) => ({
        value: reciter.id,
        label: reciter.name,
        subtitle: reciter.style,
      })),
    [reciters],
  );

  const inputClasses =
    "rounded-2xl border border-white/10 bg-surface-muted/80 px-4 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <section className="overflow-hidden rounded-3xl border border-white/5 bg-surface-raised/60 shadow-xl shadow-brand/5">
      {/* Header with accent bar */}
      <div className="border-b border-white/5 bg-surface-muted/30 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
              <SlidersHorizontal className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.35em] text-foreground-muted">
                Session Setup
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
                Configure your memorization pass
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Choose surah, range, reciter, and content options
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium tabular-nums ${
              isLoadingVerses
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-brand/15 text-brand"
            }`}
          >
            {isLoadingVerses ? "Refreshing…" : "Ready"}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Surah & range */}
        <div id="session-range" className="mb-6 scroll-mt-24">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Surah & range
          </h3>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <SearchableSelect
              id="session-surah"
              label="Surah"
              placeholder="Select a chapter"
              searchable
              searchPlaceholder="Search by name or number…"
              options={chapterOptions}
              value={value.chapterId}
              onChange={(chapterId) => {
                const chapter = chapters.find((c) => c.id === chapterId);
                const versesCount = chapter?.versesCount ?? 1;
                onChange({
                  ...value,
                  chapterId: chapterId ?? undefined,
                  fromVerse: 1,
                  toVerse: versesCount,
                });
              }}
            />
            <div className="flex gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground-muted">
                  From
                </span>
                <input
                  type="number"
                  min={1}
                  max={maxVerse}
                  className={`${inputClasses} w-20 min-w-0 sm:w-24`}
                  value={numberField(value.fromVerse, 1)}
                  onChange={handleNumberChange("fromVerse", 1)}
                  aria-label="From verse"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-foreground-muted">
                  To
                </span>
                <input
                  type="number"
                  min={value.fromVerse ?? 1}
                  max={maxVerse}
                  className={`${inputClasses} w-20 min-w-0 sm:w-24`}
                  value={numberField(value.toVerse, maxVerse)}
                  onChange={handleNumberChange("toVerse", maxVerse)}
                  aria-label="To verse"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Audio */}
        <div className="mb-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Audio
          </h3>
          <SearchableSelect
            id="session-reciter"
            label="Reciter"
            placeholder="Default (Mishari Rashid Al-Afasy)"
            options={reciterOptions}
            value={value.reciterId}
            onChange={(reciterId) =>
              onChange({ ...value, reciterId: reciterId ?? undefined })
            }
          />
        </div>

        {/* Content */}
        <div>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
            Content
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <SearchableSelect
              id="session-translation"
              label="Translation"
              placeholder="None"
              options={translationOptions.map((o) => ({
                value: o.id,
                label: o.label,
              }))}
              value={value.translationId}
              onChange={(translationId) =>
                onChange({
                  ...value,
                  translationId: translationId ?? undefined,
                })
              }
            />
            <SearchableSelect
              id="session-tafsir"
              label="Tafsir (reflection sparks)"
              placeholder="None"
              options={tafsirOptions.map((o) => ({
                value: o.id,
                label: o.label,
              }))}
              value={value.tafsirId}
              onChange={(tafsirId) =>
                onChange({ ...value, tafsirId: tafsirId ?? undefined })
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
};

