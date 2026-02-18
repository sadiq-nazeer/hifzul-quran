"use client";

import { BookOpen } from "lucide-react";
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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-12 pt-6 lg:px-20 xl:px-24">
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
          <Card variant="raised" className="p-6">
            <FullSurahText verses={verses} />
          </Card>
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
