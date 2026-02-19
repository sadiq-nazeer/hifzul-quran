"use client";

import { BookOpen, ChevronDown, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { FullSurahText } from "@/components/quran/FullSurahText";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { useChapters } from "@/lib/hooks/useChapters";
import { useCoachBundle } from "@/lib/hooks/useCoachBundle";
import type { CoachBundleParams } from "@/lib/hooks/useCoachBundle";

export default function RecitePage() {
  const { chapters } = useChapters();
  const [params, setParams] = useState<CoachBundleParams>({
    chapterId: undefined,
    fromVerse: 1,
    toVerse: 1,
  });

  const effectiveChapterId = params.chapterId ?? chapters[0]?.id;

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === effectiveChapterId),
    [chapters, effectiveChapterId],
  );

  // Fetch all verses for the selected chapter
  const fetchParams = useMemo(() => {
    if (!effectiveChapterId || !selectedChapter) {
      return null;
    }
    return {
      ...params,
      chapterId: effectiveChapterId,
      fromVerse: 1,
      toVerse: selectedChapter.versesCount,
      perPage: 286, // Max verses in any surah
    };
  }, [effectiveChapterId, params, selectedChapter]);

  const { verses, isLoading, isError, error } = useCoachBundle(
    fetchParams ?? { chapterId: undefined },
  );

  const [guideOpen, setGuideOpen] = useState(false);

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

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-2 pb-12 pt-6 sm:px-6 lg:px-20 xl:px-24">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <BookOpen className="h-6 w-6" />
        </div>
        <Section
          title="Quran Recite"
          subtitle="Read and recite the full surah with customizable text size and color"
        >
          <div />
        </Section>
      </div>

      <div className="space-y-6">
        <Card variant="raised" className="p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <SearchableSelect
                id="recite-surah"
                label="Surah"
                placeholder="Select a chapter"
                searchable
                searchPlaceholder="Search by name or number…"
                options={chapterOptions}
                value={effectiveChapterId}
                onChange={(chapterId) => {
                  const chapter = chapters.find((c) => c.id === chapterId);
                  if (chapter) {
                    setParams((prev) => ({
                      ...prev,
                      chapterId: chapterId ?? undefined,
                      fromVerse: 1,
                      toVerse: chapter.versesCount,
                    }));
                  }
                }}
              />
            </div>
          </div>
        </Card>

        {isLoading && (
          <Card variant="muted" className="p-8 text-center">
            <p className="text-foreground-muted">Loading surah…</p>
          </Card>
        )}

        {isError && (
          <Card variant="muted" className="border-red-500/20 bg-red-500/10 p-6">
            <p className="font-semibold text-red-400">Error loading surah</p>
            <p className="mt-2 text-sm text-red-300">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </Card>
        )}

        {!isLoading && !isError && verses.length > 0 && (
          <>
            <div className="overflow-hidden rounded-2xl border border-foreground/10 border-l-4 border-l-brand bg-surface-muted/50 shadow-sm">
              <button
                type="button"
                onClick={() => setGuideOpen((open) => !open)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-inset"
                aria-expanded={guideOpen}
                aria-controls="recite-guide-content"
                id="recite-guide-toggle"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-brand">
                  <Volume2 className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-semibold text-foreground">
                    How to use this page? ✨
                  </span>
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-foreground-muted transition-transform duration-200 ${guideOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              <div
                id="recite-guide-content"
                role="region"
                aria-labelledby="recite-guide-toggle"
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: guideOpen ? "1fr" : "0fr" }}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="border-t border-foreground/10 px-4 pb-4 pt-3">
                    <ul className="list-none space-y-2.5 text-sm text-foreground-muted">
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Click a word to hear it.</strong> Tap any
                          word in the Arabic text to play its pronunciation.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Text size</strong> — use the + and −
                          buttons above the surah to make the text larger or smaller.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Text color</strong> — pick a color
                          from the option above to change how the Arabic text looks.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Pages</strong> — use Previous and Next
                          to move through the surah in sections.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <Card variant="raised" className="px-1.5 py-2 sm:px-3 sm:py-4 md:px-6 md:py-6">
              <FullSurahText verses={verses} wordsPerPage={50} />
            </Card>
          </>
        )}

        {!isLoading && !isError && !effectiveChapterId && (
          <Card variant="muted" className="p-8 text-center">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
            <p className="text-lg font-medium text-foreground">
              Select a Surah to begin reciting
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Choose a chapter from the dropdown above
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
