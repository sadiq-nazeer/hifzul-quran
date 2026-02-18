"use client";

import { Headphones } from "lucide-react";
import { useMemo, useState } from "react";
import { CoachConfigurator } from "@/components/coach/CoachConfigurator";
import { SurahAudioPanel } from "@/components/coach/SurahAudioPanel";
import { Section } from "@/components/ui/Section";
import { useChapters } from "@/lib/hooks/useChapters";
import { useCoachBundle, type CoachBundleParams } from "@/lib/hooks/useCoachBundle";
import { useReciters } from "@/lib/hooks/useReciters";

export default function ListeningPage() {
  const { chapters } = useChapters();
  const { reciters } = useReciters();

  const [params, setParams] = useState<CoachBundleParams>({
    chapterId: undefined,
    fromVerse: 1,
    toVerse: 5,
    reciterId: undefined,
  });

  const effectiveChapterId = params.chapterId ?? chapters[0]?.id;

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === effectiveChapterId),
    [chapters, effectiveChapterId],
  );

  const selectedReciter = useMemo(
    () => reciters.find((reciter) => reciter.id === params.reciterId),
    [reciters, params.reciterId],
  );

  const { verses: sessionVerses, isLoading: isLoadingVerses } = useCoachBundle({
    ...params,
    chapterId: effectiveChapterId,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 pb-12 pt-6 lg:px-20 xl:px-24">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Headphones className="h-6 w-6" />
        </div>
        <Section
          title="Quran Listening"
          subtitle="Listen to beautiful recitations from renowned reciters"
        >
          <div />
        </Section>
      </div>

      <div className="space-y-6">
        <CoachConfigurator
          chapters={chapters}
          reciters={reciters}
          value={{ ...params, chapterId: effectiveChapterId }}
          onChange={setParams}
          isLoadingVerses={isLoadingVerses}
          showHeader={false}
          showContent={false}
        />

        {effectiveChapterId && (
          <SurahAudioPanel
            sessionVerses={sessionVerses}
            chapterId={effectiveChapterId}
            chapterName={selectedChapter?.nameSimple}
            reciterId={params.reciterId}
            reciterName={selectedReciter?.name}
            fromVerse={params.fromVerse}
            toVerse={params.toVerse}
            versesCount={selectedChapter?.versesCount}
            onRangeChange={(fromVerse, toVerse) =>
              setParams((prev) => ({ ...prev, fromVerse, toVerse }))
            }
          />
        )}

        {!effectiveChapterId && (
          <div className="rounded-3xl border border-dashed border-white/10 bg-surface-muted/30 p-8 text-center">
            <Headphones className="mx-auto mb-4 h-12 w-12 text-foreground-muted" />
            <p className="text-lg font-medium text-foreground">
              Select a Surah to begin listening
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Choose a chapter and reciter from the configuration panel above
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
