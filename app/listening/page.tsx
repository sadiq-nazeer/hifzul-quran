"use client";

import { ChevronDown, Headphones, Volume2 } from "lucide-react";
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

  const fullChapterFetchParams = useMemo(() => {
    if (!effectiveChapterId || !selectedChapter) return null;
    return {
      chapterId: effectiveChapterId,
      fromVerse: 1,
      toVerse: selectedChapter.versesCount,
      perPage: Math.max(selectedChapter.versesCount, 286),
    };
  }, [effectiveChapterId, selectedChapter]);

  const { verses: fullChapterVerses } = useCoachBundle(
    fullChapterFetchParams ?? { chapterId: undefined },
  );

  const [guideOpen, setGuideOpen] = useState(false);

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
          <>
            <div className="overflow-hidden rounded-2xl border border-foreground/10 border-l-4 border-l-brand bg-surface-muted/50 shadow-sm">
              <button
                type="button"
                onClick={() => setGuideOpen((open) => !open)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-brand/5 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:ring-inset"
                aria-expanded={guideOpen}
                aria-controls="listening-guide-content"
                id="listening-guide-toggle"
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
                id="listening-guide-content"
                role="region"
                aria-labelledby="listening-guide-toggle"
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: guideOpen ? "1fr" : "0fr" }}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="border-t border-foreground/10 px-4 pb-4 pt-3">
                    <ul className="list-none space-y-2.5 text-sm text-foreground-muted">
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Pick a surah and reciter</strong> — use
                          the configuration above to choose a chapter and reciter.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Full Surah or Surah Range</strong> —
                          listen to the whole chapter or a slice of verses you set.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Full Surah View / Ayah Only</strong> —
                          switch between seeing all ayat or just the one playing.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Click a word to hear it.</strong> Tap any
                          word in the text to play its pronunciation.
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                        <span>
                          <strong className="text-foreground">Text size and highlight</strong> — adjust
                          font size and the color used for the current ayah.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <SurahAudioPanel
            sessionVerses={sessionVerses}
            fullChapterVerses={fullChapterVerses}
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
          </>
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
