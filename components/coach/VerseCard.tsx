import { Check, Ear, Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CoachSessionVerse } from "@/lib/types/quran";
import { AudioPlayer } from "./AudioPlayer";

type VerseProgress = {
  listened: boolean;
  whispered: boolean;
  reciteScore?: number;
  notes?: string;
};

type Props = {
  verse: CoachSessionVerse;
  progress: VerseProgress;
  onProgressChange: (update: Partial<VerseProgress>) => void;
  /** Optional surah/chapter name (e.g. from parent) for display in the header. */
  chapterName?: string;
};

const formatVerseLabel = (verseKey: string) => verseKey.replace(":", " · ");

/** Split Uthmani Arabic verse into words (space-separated). */
function splitVerseIntoWords(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Lead (seconds): highlight advances slightly ahead for perceived sync with recitation audio. */
const SEGMENT_LEAD_SEC = 0.2;

/** Get the word index that should be highlighted for the given playback time. */
function getActiveWordIndex(
  currentTime: number,
  duration: number,
  segments: Array<[number, number]> | undefined,
  wordCount: number,
): number {
  if (wordCount <= 0) return -1;
  if (duration <= 0) return -1;

  if (segments && segments.length > 0) {
    const t = currentTime + SEGMENT_LEAD_SEC;
    for (let i = 0; i < segments.length; i++) {
      const [start, end] = segments[i];
      if (t >= start && t < end) return Math.min(i, wordCount - 1);
      if (t < start) return Math.max(0, i - 1);
    }
    return Math.min(segments.length - 1, wordCount - 1);
  }
  return -1;
}

const CONFIDENCE_STAGES: {
  value: number;
  label: string;
  min: number;
  max: number;
}[] = [
  { value: 10, label: "Need more practice", min: 0, max: 25 },
  { value: 35, label: "Getting there", min: 26, max: 50 },
  { value: 60, label: "Solid", min: 51, max: 75 },
  { value: 85, label: "Very confident", min: 76, max: 99 },
  { value: 100, label: "Nailed it", min: 100, max: 100 },
];

function isStageSelected(
  score: number,
  stage: (typeof CONFIDENCE_STAGES)[number],
): boolean {
  return score >= stage.min && score <= stage.max;
}

export const VerseCard = ({
  verse,
  progress,
  onProgressChange,
  chapterName,
}: Props) => {
  const [showArabic, setShowArabic] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [showWhisperNotes, setShowWhisperNotes] = useState(false);
  const [loopAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingWordKey, setPlayingWordKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrl = verse.audio?.audio.url;
  const segments = verse.audio?.audio.segments;
  const apiDuration = verse.audio?.audio.durationSeconds ?? 0;

  const apiWords =
    verse.verse.words?.filter(
      (word) =>
        word.charTypeName !== "end" && word.textUthmani.trim().length > 0,
    ) ?? [];
  const verseWords =
    apiWords.length > 0
      ? apiWords.map((word) => word.textUthmani)
      : splitVerseIntoWords(verse.verse.textUthmani);

  const effectiveDuration = !audioUrl ? 0 : apiDuration > 0 ? apiDuration : 0;

  const activeWordIndex = getActiveWordIndex(
    currentTime,
    effectiveDuration,
    segments,
    verseWords.length,
  );

  useEffect(() => {
    return () => {
      const wordAudio = wordAudioRef.current;
      if (wordAudio) {
        wordAudio.pause();
      }
      wordAudioRef.current = null;
    };
  }, []);

  // High-frequency sync while playing so highlight stays in sync with audio (~60fps)
  useEffect(() => {
    if (!isPlaying || !audioUrl) return;
    let rafId: number;
    const tick = () => {
      // Time updates are handled by AudioPlayer component
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, audioUrl]);

  const playWordAudio = (wordAudioUrl?: string, wordKey?: string) => {
    if (!wordAudioUrl || !wordKey) return;

    // Pause main audio when playing word audio
    setIsPlaying(false);

    const previousWordAudio = wordAudioRef.current;
    if (previousWordAudio) {
      previousWordAudio.pause();
      previousWordAudio.currentTime = 0;
    }

    const player = new Audio(wordAudioUrl);
    wordAudioRef.current = player;
    setPlayingWordKey(wordKey);

    player.onended = () => setPlayingWordKey(null);
    player.onerror = () => setPlayingWordKey(null);
    player.play().catch(() => setPlayingWordKey(null));
  };

  return (
    <article className="min-w-0 overflow-hidden space-y-4 rounded-3xl border border-white/5 bg-surface-raised/50 p-4 md:p-6">

      {audioUrl ? (
        <AudioPlayer
          audioUrl={audioUrl}
          durationSeconds={apiDuration}
          loop={loopAudio}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={setCurrentTime}
          showStopButton={false}
          enableDragging={true}
        />
      ) : (
        <p className="text-sm text-foreground-muted">
          Audio not available for this selection.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2 focus:ring-offset-surface-muted ${
            progress.listened
              ? "border-brand/40 bg-brand/25 text-brand shadow-brand/10"
              : "border-white/10 bg-white/5 text-foreground-muted hover:border-brand/30 hover:bg-brand/10 hover:text-brand"
          }`}
          onClick={() => onProgressChange({ listened: !progress.listened })}
        >
          {progress.listened ? (
            <>
              <Check
                className="h-4 w-4 shrink-0"
                strokeWidth={2.5}
                aria-hidden
              />
              Listened
            </>
          ) : (
            <>
              <Ear className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Listened
            </>
          )}
        </button>
        <button
          type="button"
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent/40 focus:ring-offset-2 focus:ring-offset-surface-muted ${
            progress.whispered
              ? "border-brand-accent/40 bg-brand-accent/25 text-brand-accent shadow-brand-accent/10"
              : "border-white/10 bg-white/5 text-foreground-muted hover:border-brand-accent/30 hover:bg-brand-accent/10 hover:text-brand-accent"
          }`}
          onClick={() => onProgressChange({ whispered: !progress.whispered })}
        >
          {progress.whispered ? (
            <>
              <Check
                className="h-4 w-4 shrink-0"
                strokeWidth={2.5}
                aria-hidden
              />
              Whispered
            </>
          ) : (
            <>
              <Mic className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Whispered
            </>
          )}
        </button>
      </div>
      <section
        className="overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-950/20 via-surface-muted/30 to-surface-muted/20 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.06)]"
        aria-labelledby="arabic-verse-heading"
      >
        <button
          type="button"
          id="arabic-verse-heading"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-white/5 md:px-4 md:py-3"
          onClick={() => setShowArabic((prev) => !prev)}
          aria-expanded={showArabic}
        >
          <span className="text-sm font-medium uppercase tracking-[0.35em] text-amber-200/90">
            Arabic verse
          </span>
          <span className="text-brand text-sm font-medium" aria-hidden>
            {showArabic ? "Hide" : "Show"}
          </span>
        </button>
        {showArabic && (
          <div className="min-w-0 border-t border-amber-500/10 px-3 py-4 sm:px-6 sm:py-6">
            <p
              className="break-words text-right text-2xl leading-loose text-foreground sm:text-3xl"
              dir="rtl"
              lang="ar"
            >
              {verseWords.length > 0
                ? verseWords.map((word, i) => (
                    <span key={i}>
                      {apiWords[i]?.audioUrl ? (
                        <button
                          type="button"
                          className={`m-0 inline border-0 bg-transparent p-0 font-inherit leading-inherit transition-colors ${
                            i === activeWordIndex && audioUrl
                              ? "text-brand"
                              : ""
                          } ${playingWordKey === String(apiWords[i].id) ? "text-brand" : ""} hover:text-brand`}
                          onClick={() =>
                            playWordAudio(
                              apiWords[i].audioUrl,
                              String(apiWords[i].id),
                            )
                          }
                          title="Play word audio"
                          aria-label={`Play word audio: ${word}`}
                        >
                          {word}
                        </button>
                      ) : (
                        <span
                          className={
                            i === activeWordIndex && audioUrl
                              ? "text-brand"
                              : ""
                          }
                        >
                          {word}
                        </span>
                      )}
                      {i < verseWords.length - 1 ? "\u00A0" : null}
                    </span>
                  ))
                : verse.verse.textUthmani}
            </p>
          </div>
        )}
      </section>

      {verse.translation && (
        <section
          className="rounded-2xl border border-white/5 bg-surface-muted/40 overflow-hidden"
          aria-labelledby="translation-heading"
        >
          <button
            type="button"
            id="translation-heading"
            className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-white/5 transition md:px-4 md:py-3"
            onClick={() => setShowTranslation((prev) => !prev)}
            aria-expanded={showTranslation}
          >
            <span className="uppercase tracking-[0.4em] text-foreground-muted">
              Translation
            </span>
            <span className="text-brand" aria-hidden>
              {showTranslation ? "Hide" : "Show"}
            </span>
          </button>
          {showTranslation && (
            <div className="min-w-0 border-t border-white/5 p-3 md:p-4">
              <p className="break-words text-sm leading-relaxed text-foreground-muted md:text-xl">
                {verse.translation.text}
              </p>
            </div>
          )}
        </section>
      )}

      <section
        className="rounded-2xl border border-white/5 bg-surface-muted/40 overflow-hidden"
        role="group"
        aria-labelledby="confidence-heading"
        aria-label="Recite self-check"
      >
        <button
          type="button"
          id="confidence-heading"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-white/5 transition md:px-4 md:py-3"
          onClick={() => setShowConfidence((prev) => !prev)}
          aria-expanded={showConfidence}
        >
          <span className="uppercase tracking-[0.4em] text-foreground-muted">
            Confidence Score
          </span>
          <span className="text-brand" aria-hidden>
            {showConfidence ? "Hide" : "Show"}
          </span>
        </button>
        {showConfidence && (
          <div className="flex flex-col gap-3 border-t border-white/5 p-3 md:p-4">
            <div className="flex flex-wrap gap-2">
              {CONFIDENCE_STAGES.map((stage) => {
                const selected = isStageSelected(
                  progress.reciteScore ?? 0,
                  stage,
                );
                return (
                  <button
                    key={stage.value}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "border-brand/50 bg-brand/20 text-brand"
                        : "border-white/10 bg-white/10 text-foreground hover:border-brand/30 hover:bg-brand/10"
                    }`}
                    onClick={() =>
                      onProgressChange({ reciteScore: stage.value })
                    }
                    aria-pressed={selected}
                    aria-label={`Set confidence: ${stage.label}`}
                  >
                    {stage.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress.reciteScore ?? 0}
                  onChange={(event) =>
                    onProgressChange({
                      reciteScore: Number(event.target.value),
                    })
                  }
                  style={
                    {
                      "--value": progress.reciteScore ?? 0,
                    } as React.CSSProperties
                  }
                  className="recite-slider h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full focus:outline-none focus:ring-2 focus:ring-brand/50 focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="Recite confidence 0 to 100"
                />
                <span
                  className="inline-flex h-8 min-w-[3rem] shrink-0 items-center justify-center rounded-full bg-brand/20 px-3 text-sm font-semibold tabular-nums text-brand"
                  aria-hidden
                >
                  {progress.reciteScore ?? 0}%
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      <section
        className="rounded-2xl border border-white/5 bg-surface-muted/40 overflow-hidden"
        aria-labelledby="whisper-notes-heading"
      >
        <button
          type="button"
          id="whisper-notes-heading"
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-white/5 transition md:px-4 md:py-3"
          onClick={() => setShowWhisperNotes((prev) => !prev)}
          aria-expanded={showWhisperNotes}
        >
          <span className="uppercase tracking-[0.4em] text-foreground-muted">
            Notes 
          </span>
          <span className="text-brand" aria-hidden>
            {showWhisperNotes ? "Hide" : "Show"}
          </span>
        </button>
        {showWhisperNotes && (
          <div className="border-t border-white/5 p-3 md:p-4">
            <label htmlFor="verse-notes" className="sr-only">
              Whisper notes
            </label>
            <textarea
              id="verse-notes"
              className="min-h-[80px] w-full rounded-2xl border border-white/10 bg-surface-muted/80 p-3 text-sm text-foreground outline-none focus:border-brand"
              placeholder="Track hesitations, tricky pronunciations, breath cues…"
              value={progress.notes ?? ""}
              onChange={(event) =>
                onProgressChange({ notes: event.target.value })
              }
            />
          </div>
        )}
      </section>
    </article>
  );
};
