import { Check, Ear, Mic } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CoachSessionVerse } from "@/lib/types/quran";

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

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
  wordCount: number
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

const CONFIDENCE_STAGES: { value: number; label: string; min: number; max: number }[] = [
  { value: 10, label: "Need more practice", min: 0, max: 25 },
  { value: 35, label: "Getting there", min: 26, max: 50 },
  { value: 60, label: "Solid", min: 51, max: 75 },
  { value: 85, label: "Very confident", min: 76, max: 99 },
  { value: 100, label: "Nailed it", min: 100, max: 100 },
];

function isStageSelected(score: number, stage: (typeof CONFIDENCE_STAGES)[number]): boolean {
  return score >= stage.min && score <= stage.max;
}

export const VerseCard = ({ verse, progress, onProgressChange }: Props) => {
  const [showArabic, setShowArabic] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showConfidence, setShowConfidence] = useState(false);
  const [showWhisperNotes, setShowWhisperNotes] = useState(false);
  const [loopAudio, setLoopAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingWordKey, setPlayingWordKey] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationFromAudio, setDurationFromAudio] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const dragJustEndedRef = useRef(false);
  const audioUrl = verse.audio?.audio.url;
  const segments = verse.audio?.audio.segments;
  const apiDuration = verse.audio?.audio.durationSeconds ?? 0;
  const effectiveDuration = !audioUrl
    ? 0
    : apiDuration > 0
      ? apiDuration
      : durationFromAudio;

  const apiWords =
    verse.verse.words?.filter(
      (word) => word.charTypeName !== "end" && word.textUthmani.trim().length > 0
    ) ?? [];
  const verseWords =
    apiWords.length > 0
      ? apiWords.map((word) => word.textUthmani)
      : splitVerseIntoWords(verse.verse.textUthmani);
  const activeWordIndex = getActiveWordIndex(
    currentTime,
    effectiveDuration,
    segments,
    verseWords.length
  );
  const progressRatio =
    effectiveDuration > 0
      ? Math.max(0, Math.min(1, currentTime / effectiveDuration))
      : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    const syncTime = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      syncTime();
      if (Number.isFinite(audio.duration) && audio.duration > 0 && !Number.isNaN(audio.duration)) {
        setDurationFromAudio(audio.duration);
      }
    };
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [audioUrl]);

  // High-frequency sync while playing so highlight and progress stay in sync with audio (~60fps)
  useEffect(() => {
    if (!isPlaying || !audioRef.current || !audioUrl) return;
    let rafId: number;
    const tick = () => {
      const audio = audioRef.current;
      if (audio) setCurrentTime(audio.currentTime);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, audioUrl]);

  useEffect(() => {
    return () => {
      const wordAudio = wordAudioRef.current;
      if (wordAudio) {
        wordAudio.pause();
      }
      wordAudioRef.current = null;
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const bar = progressBarRef.current;
      const audio = audioRef.current;
      if (!bar || !audio || !audioUrl || effectiveDuration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.max(0, Math.min(1, x / rect.width));
      const seekTo = pct * effectiveDuration;
      audio.currentTime = seekTo;
      setCurrentTime(seekTo);
    },
    [audioUrl, effectiveDuration]
  );

  const seekFromClientXRef = useRef(seekFromClientX);
  useEffect(() => {
    seekFromClientXRef.current = seekFromClientX;
  }, [seekFromClientX]);

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragJustEndedRef.current) {
      dragJustEndedRef.current = false;
      return;
    }
    const audio = audioRef.current;
    if (!audio || !audioUrl || effectiveDuration <= 0) return;
    seekFromClientX(event.clientX);
  };

  const startDrag = (event: React.MouseEvent) => {
    event.preventDefault();
    if (!audioUrl || effectiveDuration <= 0) return;
    setIsDragging(true);
  };

  const playWordAudio = useCallback((wordAudioUrl?: string, wordKey?: string) => {
    if (!wordAudioUrl || !wordKey) return;

    const verseAudio = audioRef.current;
    if (verseAudio && !verseAudio.paused) {
      verseAudio.pause();
    }

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
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => seekFromClientXRef.current(e.clientX);
    const onUp = () => {
      setIsDragging(false);
      dragJustEndedRef.current = true;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  return (
    <article className="min-w-0 overflow-hidden space-y-4 rounded-3xl border border-white/5 bg-surface-raised/50 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            {formatVerseLabel(verse.verse.verseKey)}
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            Ayah {verse.orderInChapter}
          </h3>
        </div>
      </header>

      <div className="audio-theme-wrapper space-y-2 rounded-2xl border border-brand/25 bg-gradient-to-br from-surface-muted/90 via-surface-muted/70 to-brand/5 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
          Listen loop
        </p>
        {audioUrl ? (
          <>
            <audio
              ref={audioRef}
              loop={loopAudio}
              src={audioUrl}
              className="hidden"
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
            />
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
              <button
                type="button"
                className="play-btn-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-black shadow-lg shadow-brand/25 transition hover:brightness-110"
                onClick={togglePlayPause}
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <span className="text-sm font-bold">‖</span>
                ) : (
                  <span className="ml-0.5 text-sm font-bold">▶</span>
                )}
              </button>
              <button
                type="button"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition ${
                  loopAudio
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-white/20 bg-white/5 text-foreground-muted hover:border-white/30 hover:bg-white/10 hover:text-foreground"
                }`}
                onClick={() => setLoopAudio((prev) => !prev)}
                aria-label={loopAudio ? "Loop on" : "Loop off"}
                title={loopAudio ? "Loop on" : "Loop off"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M17 1l4 4-4 4" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <path d="M7 23l-4-4 4-4" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
              <div className="audio-time-display flex shrink-0 items-center gap-1.5 font-mono text-sm tabular-nums">
                <span className="text-foreground">{formatTime(currentTime)}</span>
                <span className="text-foreground-muted">/</span>
                <span className="text-brand">{formatTime(effectiveDuration)}</span>
              </div>
              <div
                ref={progressBarRef}
                className="relative flex min-w-0 flex-1 cursor-pointer items-center py-1"
                role="progressbar"
                aria-valuenow={currentTime}
                aria-valuemin={0}
                aria-valuemax={effectiveDuration}
                onClick={handleProgressClick}
                onMouseDown={startDrag}
              >
                <div className="relative h-1.5 w-full rounded-full bg-white/10 transition hover:bg-white/15">
                  <div
                    className="absolute inset-0 h-full w-full origin-left rounded-full bg-brand"
                    style={{
                      transform: `scaleX(${progressRatio})`,
                    }}
                  />
                  <div
                    className="absolute top-1/2 z-10 cursor-grab rounded-full bg-brand shadow-md shadow-brand/40 ring-2 ring-white/20 transition hover:scale-110 active:cursor-grabbing"
                    style={{
                      left: `${progressRatio * 100}%`,
                      transform: "translate(-50%, -50%)",
                      width: "18px",
                      height: "18px",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      startDrag(e);
                    }}
                    aria-hidden
                  />
                </div>
              </div>
            </div>
          </>
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
                <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                Listened
              </>
            ) : (
              <>
                <Ear className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Mark listened
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
                <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                Whispered
              </>
            ) : (
              <>
                <Mic className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Whisper quietly
              </>
            )}
          </button>
        </div>
      </div>

      <section
        className="overflow-hidden rounded-2xl border border-amber-500/15 bg-gradient-to-br from-amber-950/20 via-surface-muted/30 to-surface-muted/20 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.06)]"
        aria-labelledby="arabic-verse-heading"
      >
        <button
          type="button"
          id="arabic-verse-heading"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-white/5"
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
          <div className="min-w-0 border-t border-amber-500/10 px-4 py-5 sm:px-6 sm:py-6">
            <p
              className="break-words text-right text-2xl leading-loose text-foreground sm:text-3xl"
              dir="rtl"
              lang="ar"
            >
              {verseWords.length > 0 ? (
                verseWords.map((word, i) => (
                  <span key={i}>
                    {apiWords[i]?.audioUrl ? (
                      <button
                        type="button"
                        className={`m-0 inline border-0 bg-transparent p-0 font-inherit leading-inherit transition-colors ${
                          i === activeWordIndex && audioUrl ? "text-brand" : ""
                        } ${playingWordKey === String(apiWords[i].id) ? "text-brand" : ""} hover:text-brand`}
                        onClick={() => playWordAudio(apiWords[i].audioUrl, String(apiWords[i].id))}
                        title="Play word audio"
                        aria-label={`Play word audio: ${word}`}
                      >
                        {word}
                      </button>
                    ) : (
                      <span className={i === activeWordIndex && audioUrl ? "text-brand" : ""}>
                        {word}
                      </span>
                    )}
                    {i < verseWords.length - 1 ? "\u00A0" : null}
                  </span>
                ))
              ) : (
                verse.verse.textUthmani
              )}
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
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-white/5 transition"
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
            <div className="min-w-0 border-t border-white/5 p-4">
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
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-white/5 transition"
          onClick={() => setShowConfidence((prev) => !prev)}
          aria-expanded={showConfidence}
        >
          <span className="uppercase tracking-[0.4em] text-foreground-muted">
            How confident did that feel?
          </span>
          <span className="text-brand" aria-hidden>
            {showConfidence ? "Hide" : "Show"}
          </span>
        </button>
        {showConfidence && (
          <div className="flex flex-col gap-3 border-t border-white/5 p-4">
            <div className="flex flex-wrap gap-2">
              {CONFIDENCE_STAGES.map((stage) => {
                const selected = isStageSelected(progress.reciteScore ?? 0, stage);
                return (
                  <button
                    key={stage.value}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      selected
                        ? "border-brand/50 bg-brand/20 text-brand"
                        : "border-white/10 bg-white/10 text-foreground hover:border-brand/30 hover:bg-brand/10"
                    }`}
                    onClick={() => onProgressChange({ reciteScore: stage.value })}
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
                    onProgressChange({ reciteScore: Number(event.target.value) })
                  }
                  style={
                    { "--value": progress.reciteScore ?? 0 } as React.CSSProperties
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
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-white/5 transition"
          onClick={() => setShowWhisperNotes((prev) => !prev)}
          aria-expanded={showWhisperNotes}
        >
          <span className="uppercase tracking-[0.4em] text-foreground-muted">
            Whisper notes
          </span>
          <span className="text-brand" aria-hidden>
            {showWhisperNotes ? "Hide" : "Show"}
          </span>
        </button>
        {showWhisperNotes && (
          <div className="border-t border-white/5 p-4">
            <label htmlFor="verse-notes" className="sr-only">
              Whisper notes
            </label>
            <textarea
              id="verse-notes"
              className="min-h-[80px] w-full rounded-2xl border border-white/10 bg-surface-muted/80 p-3 text-sm text-foreground outline-none focus:border-brand"
              placeholder="Track hesitations, tricky pronunciations, breath cues…"
              value={progress.notes ?? ""}
              onChange={(event) => onProgressChange({ notes: event.target.value })}
            />
          </div>
        )}
      </section>
    </article>
  );
};