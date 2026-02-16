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
  const [loopAudio, setLoopAudio] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [durationFromAudio, setDurationFromAudio] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const dragJustEndedRef = useRef(false);
  const audioUrl = verse.audio?.audio.url;
  const apiDuration = verse.audio?.audio.durationSeconds ?? 0;
  const effectiveDuration = !audioUrl
    ? 0
    : apiDuration > 0
      ? apiDuration
      : durationFromAudio;

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
    <article className="space-y-4 rounded-3xl border border-white/5 bg-surface-raised/50 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            {formatVerseLabel(verse.verse.verseKey)}
          </p>
          <h3 className="text-xl font-semibold text-foreground">
            Ayah {verse.orderInChapter}
          </h3>
        </div>
        <button
          type="button"
          className="text-xs font-semibold uppercase tracking-[0.4em] text-brand underline-offset-4 hover:underline"
          onClick={() => setShowArabic((prev) => !prev)}
        >
          {showArabic ? "Hide Arabic" : "Show Arabic"}
        </button>
      </header>

      {showArabic && (
        <p className="text-right text-3xl leading-snug text-foreground" dir="rtl">
          {verse.verse.textUthmani}
        </p>
      )}

      {verse.translation && (
        <div className="rounded-2xl bg-surface-muted/40 p-4">
          <p className="text-sm leading-relaxed text-foreground-muted md:text-xl">
            {verse.translation.text}
          </p>
          {/* <p className="mt-2 text-[10px] uppercase tracking-widest text-foreground-muted">
            {verse.translation.resourceName}
          </p> */}
        </div>
      )}

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
                className="relative flex h-5 min-w-0 flex-1 cursor-pointer items-center"
                role="progressbar"
                aria-valuenow={currentTime}
                aria-valuemin={0}
                aria-valuemax={effectiveDuration}
                onClick={handleProgressClick}
                onMouseDown={startDrag}
              >
                <div className="h-1.5 w-full rounded-full bg-white/10 transition hover:bg-white/15">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-150 ease-out"
                    style={{
                      width: `${effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0}%`,
                    }}
                  />
                </div>
                <div
                  className="absolute left-0 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded-full bg-brand shadow-md shadow-brand/40 ring-2 ring-white/20 transition hover:scale-110 active:cursor-grabbing"
                  style={{
                    left: `${effectiveDuration > 0 ? Math.min(100, (currentTime / effectiveDuration) * 100) : 0}%`,
                    transform: "translate(-50%, -50%)",
                    width: "12px",
                    height: "12px",
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startDrag(e);
                  }}
                  aria-hidden
                />
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-foreground-muted">
            Audio not available for this selection.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              progress.listened
                ? "border-brand/50 bg-brand/20 text-brand"
                : "border-white/10 bg-white/10 text-foreground hover:border-brand/30 hover:bg-brand/10"
            }`}
            onClick={() => onProgressChange({ listened: !progress.listened })}
          >
            {progress.listened ? "Listened ✓" : "Mark listened"}
          </button>
          <button
            type="button"
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              progress.whispered
                ? "border-brand-accent/50 bg-brand-accent/20 text-brand-accent"
                : "border-white/10 bg-white/10 text-foreground hover:border-brand-accent/30 hover:bg-brand-accent/10"
            }`}
            onClick={() => onProgressChange({ whispered: !progress.whispered })}
          >
            {progress.whispered ? "Whispered ✓" : "Whisper quietly"}
          </button>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-surface-muted/40 p-4"
        role="group"
        aria-label="Recite self-check"
      >
        <span className="text-sm font-medium text-foreground">
          How confident did that feel?
        </span>
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

      <label className="flex flex-col gap-2 text-sm text-foreground-muted">
        Whisper notes
        <textarea
          className="min-h-[80px] rounded-2xl border border-white/10 bg-surface-muted/80 p-3 text-sm text-foreground outline-none focus:border-brand"
          placeholder="Track hesitations, tricky pronunciations, breath cues…"
          value={progress.notes ?? ""}
          onChange={(event) => onProgressChange({ notes: event.target.value })}
        />
      </label>
    </article>
  );
};