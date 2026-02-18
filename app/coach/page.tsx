"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CoachConfigurator } from "@/components/coach/CoachConfigurator";
import { CoachSessionTimeline } from "@/components/coach/CoachSessionTimeline";
import { SessionHistory } from "@/components/coach/SessionHistory";
import { SurahAudioPanel } from "@/components/coach/SurahAudioPanel";
import { VerseCard } from "@/components/coach/VerseCard";
import { useChapters } from "@/lib/hooks/useChapters";
import { useCoachBundle, type CoachBundleParams } from "@/lib/hooks/useCoachBundle";
import { useReciters } from "@/lib/hooks/useReciters";

type VerseProgress = {
  listened: boolean;
  whispered: boolean;
  reciteScore?: number;
  notes?: string;
};

export default function CoachPage() {
  const { chapters } = useChapters();
  const { reciters } = useReciters();

  const [params, setParams] = useState<CoachBundleParams>({
    chapterId: undefined,
    fromVerse: 1,
    toVerse: 5,
    translationId: 20,
    tafsirId: 169,
  });
  const [progress, setProgress] = useState<Record<string, VerseProgress>>({});
  const [historyTrigger, setHistoryTrigger] = useState("");
  /** Ayah section expanded state (verseKey -> expanded). Default collapsed. */
  const [expandedAyahs, setExpandedAyahs] = useState<Record<string, boolean>>({});
  /** Whether the ayah cards section is visible. Toggle hides it fully (no container). */
  const [showAyahCards, setShowAyahCards] = useState(true);

  useEffect(() => {
    if (params.chapterId || !chapters.length) {
      return;
    }
    const first = chapters[0];
    setParams((prev: CoachBundleParams) => ({
      ...prev,
      chapterId: first.id,
      fromVerse: 1,
      toVerse: first.versesCount,
    }));
  }, [chapters, params.chapterId]);

  const { verses, isLoading, isIdle, isError, error } = useCoachBundle(params);

  const selectedChapter = useMemo(
    () => chapters.find((chapter) => chapter.id === params.chapterId),
    [chapters, params.chapterId],
  );

  const selectedReciter = useMemo(
    () => reciters.find((reciter) => reciter.id === params.reciterId),
    [reciters, params.reciterId],
  );

  // Create a stable reference for verse keys to avoid infinite loops
  const verseKeys = useMemo(
    () => verses.map((verse) => verse.verse.verseKey).join(","),
    [verses],
  );

  // Track previous verse keys to prevent unnecessary updates
  const prevVerseKeysRef = useRef<string>("");

  useEffect(() => {
    // Only update if verse keys actually changed
    if (verseKeys === prevVerseKeysRef.current) {
      return;
    }
    prevVerseKeysRef.current = verseKeys;

    if (!verses.length) {
      setProgress({});
      setExpandedAyahs({});
      return;
    }
    setExpandedAyahs({});
    setProgress((prev: Record<string, VerseProgress>) => {
      const updated: Record<string, VerseProgress> = {};
      verses.forEach((verse) => {
        updated[verse.verse.verseKey] = prev[verse.verse.verseKey] ?? {
          listened: false,
          whispered: false,
        };
      });
      return updated;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseKeys]);

  const allListened = useMemo(
    () => verses.every((verse) => progress[verse.verse.verseKey]?.listened),
    [verses, progress],
  );
  const allWhispered = useMemo(
    () => verses.every((verse) => progress[verse.verse.verseKey]?.whispered),
    [verses, progress],
  );
  const allRecited = useMemo(
    () =>
      verses.every(
        (verse) => (progress[verse.verse.verseKey]?.reciteScore ?? 0) > 0,
      ),
    [verses, progress],
  );

  const phases = [
    {
      id: "listen",
      label: "Listen",
      description: "Loop each ayah and tune to the reciter’s pacing.",
      status: allListened ? "complete" : "current",
    },
    {
      id: "whisper",
      label: "Whisper",
      description: "Mouth along softly to cement articulation.",
      status: allListened ? (allWhispered ? "complete" : "current") : "pending",
    },
    {
      id: "recite",
      label: "Recite",
      description: "Self-grade confidence and spotline tricky spots.",
      status:
        allWhispered && allListened
          ? allRecited
            ? "complete"
            : "current"
          : "pending",
    },
    {
      id: "reflect",
      label: "Reflect",
      description: "Absorb translation/tafsir sparks after mastery.",
      status: allRecited ? "complete" : "pending",
    },
  ] as const;

  const handleProgressChange = (verseKey: string, update: Partial<VerseProgress>) => {
    setProgress((prev: Record<string, VerseProgress>) => ({
      ...prev,
      [verseKey]: {
        ...prev[verseKey],
        ...update,
      },
    }));
  };

  const sessionComplete = allRecited && verses.length > 0;
  const averageScore = sessionComplete
    ? Math.round(
        verses.reduce(
          (sum, verse) => sum + (progress[verse.verse.verseKey]?.reciteScore ?? 0),
          0,
        ) / verses.length,
      )
    : 0;

  useEffect(() => {
    if (!sessionComplete) {
      return;
    }
    const focusNotes = verses
      .map((verse) => progress[verse.verse.verseKey]?.notes)
      .filter(Boolean)
      .join(" | ");
    setHistoryTrigger(
      JSON.stringify({
        chapterId: params.chapterId,
        range: `${params.fromVerse}-${params.toVerse}`,
        score: averageScore,
        focus: focusNotes,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionComplete, averageScore]);

  const pendingHistoryEntry = sessionComplete && params.chapterId
    ? {
        chapterId: params.chapterId,
        verseRange: `${params.fromVerse}-${params.toVerse}`,
        averageScore,
        notesFocus: verses
          .map((verse) => progress[verse.verse.verseKey]?.notes)
          .filter(Boolean)
          .join(" | "),
      }
    : undefined;

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12 lg:px-20 xl:px-24">
      <div className="min-w-0 flex-1 space-y-6">
        <CoachConfigurator
          chapters={chapters}
          reciters={reciters}
          value={params}
          onChange={setParams}
          isLoadingVerses={isLoading}
        />
        <CoachSessionTimeline phases={phases} />
        <SurahAudioPanel
          sessionVerses={verses}
          chapterId={params.chapterId}
          chapterName={selectedChapter?.nameSimple}
          reciterId={params.reciterId}
          reciterName={selectedReciter?.name}
        />
        <button
          type="button"
          onClick={() => setShowAyahCards((v) => !v)}
          className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
          aria-pressed={showAyahCards}
        >
          {showAyahCards ? "Hide Ayah cards" : "Show Ayah cards"}
          <span className="shrink-0 text-foreground-muted" aria-hidden>
            {showAyahCards ? (
              <ChevronUp className="h-5 w-5" strokeWidth={2} />
            ) : (
              <ChevronDown className="h-5 w-5" strokeWidth={2} />
            )}
          </span>
        </button>
        {showAyahCards && (
        <div className="space-y-6">
          {isIdle && !params.chapterId && (
            <p className="rounded-3xl border border-dashed border-white/10 p-6 text-sm text-foreground-muted">
              Pick a surah to begin the coaching sequence.
            </p>
          )}

          {isLoading && (
            <p className="rounded-3xl border border-white/5 p-6 text-sm text-foreground-muted">
              Preparing verses and audio loops…
            </p>
          )}

          {isError && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-400">
              <p className="font-semibold">Error loading verses</p>
              <p className="mt-2 text-xs opacity-90">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
              {error instanceof Error && error.message.includes("details") && (
                <p className="mt-1 text-xs opacity-75">
                  Check the server console for more details.
                </p>
              )}
            </div>
          )}

          {!isLoading && !isError && !verses.length && params.chapterId && (
            <p className="rounded-3xl border border-white/5 p-6 text-sm text-foreground-muted">
              No verses returned for this slice. Try adjusting the range.
            </p>
          )}

          {verses.map((verse) => {
            const verseKey = verse.verse.verseKey;
            const isExpanded = expandedAyahs[verseKey] ?? false;
            const sectionId = `ayah-section-${verseKey.replace(":", "-")}`;
            return (
              <section
                key={verseKey}
                className="rounded-3xl border border-white/5 bg-surface-raised/30 overflow-hidden"
                aria-labelledby={sectionId}
              >
                <button
                  type="button"
                  id={sectionId}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-white/5 md:px-5 md:py-4"
                  onClick={() =>
                    setExpandedAyahs((prev) => ({ ...prev, [verseKey]: !prev[verseKey] }))
                  }
                  aria-expanded={isExpanded}
                >
                  <span className="text-sm font-semibold text-foreground">
                    {selectedChapter?.nameSimple
                      ? `${selectedChapter.nameSimple} · Ayah ${verse.orderInChapter}`
                      : `Ayah ${verse.orderInChapter}`}
                  </span>
                  <span className="shrink-0 text-foreground-muted" aria-hidden>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5" strokeWidth={2} />
                    ) : (
                      <ChevronDown className="h-5 w-5" strokeWidth={2} />
                    )}
                  </span>
                </button>
                {isExpanded && (
                  <VerseCard
                    verse={verse}
                    progress={progress[verseKey] ?? { listened: false, whispered: false }}
                    onProgressChange={(update) => handleProgressChange(verseKey, update)}
                    chapterName={selectedChapter?.nameSimple}
                  />
                )}
              </section>
            );
          })}
        </div>
        )}
      </div>

      <div className="w-full space-y-6">
        <section className="rounded-3xl border border-white/5 bg-surface-raised/70 p-6 text-sm text-foreground">
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            Session pulse
          </p>
          <h2 className="mt-2 text-4xl font-semibold">
            {sessionComplete ? `${averageScore}%` : "—"}
          </h2>
          <p className="text-foreground-muted">
            Average confidence across {verses.length} ayat
          </p>
          <ul className="mt-4 space-y-2 text-xs text-foreground-muted">
            <li>Listen ✓ {allListened ? "complete" : "in progress"}</li>
            <li>Whisper ✓ {allWhispered ? "complete" : "in progress"}</li>
            <li>Recite ✓ {allRecited ? "complete" : "in progress"}</li>
          </ul>
        </section>

        <SessionHistory
          pendingEntry={pendingHistoryEntry}
          triggerSaveKey={historyTrigger}
        />
      </div>
    </main>
  );
}

