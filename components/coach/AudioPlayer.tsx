"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

type AudioPlayerProps = {
  audioUrl: string;
  durationSeconds?: number;
  loop?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onStop?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  /** When set, preloads this URL and on current track end reports completion then advances via onNext */
  nextAudioUrl?: string;
  onNext?: (completedTrackSeconds: number) => void;
  /** Override displayed currentTime (e.g. cumulative time across multiple tracks) */
  displayCurrentTime?: number;
  disabled?: boolean;
  showStopButton?: boolean;
  enableDragging?: boolean;
  className?: string;
};

export const AudioPlayer = ({
  audioUrl,
  durationSeconds = 0,
  loop = false,
  onPlay,
  onPause,
  onEnded,
  onStop,
  onTimeUpdate,
  nextAudioUrl,
  onNext,
  displayCurrentTime,
  disabled = false,
  showStopButton = true,
  enableDragging = false,
  className = "",
}: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopSelection, setLoopSelection] = useState(loop);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDurationFromAudio, setTrackDurationFromAudio] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const nextPreloadRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const dragJustEndedRef = useRef(false);
  const advancingTrackRef = useRef(false);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onEndedRef = useRef(onEnded);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onNextRef = useRef(onNext);

  const effectiveDuration =
    durationSeconds > 0 ? durationSeconds : trackDurationFromAudio;

  // Sync loop prop with internal state
  useEffect(() => {
    setLoopSelection(loop);
  }, [loop]);

  // Sync audio element source
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    try {
      const currentSrc = audio.src;
      const newSrc = new URL(audioUrl, window.location.origin).href;
      if (currentSrc === newSrc) {
        audio.loop = loopSelection;
        if (advancingTrackRef.current) {
          advancingTrackRef.current = false;
        }
        return;
      }
    } catch {
      // ignore URL parse errors
    }
    audio.src = audioUrl;
    audio.loop = loopSelection;
    audio.load();
    if (advancingTrackRef.current) {
      // Keep playback continuous when parent advanced to the next verse.
      setIsPlaying(true);
      advancingTrackRef.current = false;
    }
  }, [audioUrl, loopSelection]);

  useEffect(() => {
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onEndedRef.current = onEnded;
    onTimeUpdateRef.current = onTimeUpdate;
    onNextRef.current = onNext;
  }, [onPlay, onPause, onEnded, onTimeUpdate, onNext]);

  // Handle play/pause state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
        onPauseRef.current?.();
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, audioUrl]);

  // Sync time updates
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const syncTime = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      onTimeUpdateRef.current?.(time);
    };

    const onLoadedMetadata = () => {
      syncTime();
      // Don't override when durationSeconds was explicitly provided (e.g. full surah total)
      if (
        durationSeconds <= 0 &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        !Number.isNaN(audio.duration)
      ) {
        setTrackDurationFromAudio(audio.duration);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayRef.current?.();
    };

    const handlePause = () => {
      if (advancingTrackRef.current) {
        return;
      }
      setIsPlaying(false);
      onPauseRef.current?.();
    };

    const handleEnded = () => {
      const nextHandler = onNextRef.current;
      if (nextAudioUrl && nextHandler) {
        const audio = audioRef.current;
        if (audio) {
          const completedTrackSeconds =
            Number.isFinite(audio.currentTime) && audio.currentTime > 0
              ? audio.currentTime
              : Number.isFinite(audio.duration) && audio.duration > 0
                ? audio.duration
                : 0;
          advancingTrackRef.current = true;
          audio.src = nextAudioUrl;
          audio.currentTime = 0;
          audio.play().then(() => {
            nextHandler(completedTrackSeconds);
          }).catch(() => {
            advancingTrackRef.current = false;
            setIsPlaying(false);
            onEndedRef.current?.();
          });
        } else {
          advancingTrackRef.current = false;
          nextHandler(0);
        }
        return;
      }
      setIsPlaying(false);
      onEndedRef.current?.();
    };

    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl, durationSeconds, nextAudioUrl]);

  const togglePlayPause = () => {
    if (disabled || !audioUrl) return;
    setIsPlaying((prev) => !prev);
  };

  const stopPlayback = () => {
    advancingTrackRef.current = false;
    setIsPlaying(false);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentTime(0);
    onTimeUpdateRef.current?.(0);
    onStop?.();
  };

  const toggleLoop = () => {
    if (disabled) return;
    setLoopSelection((prev) => !prev);
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
      onTimeUpdateRef.current?.(seekTo);
    },
    [audioUrl, effectiveDuration]
  );

  const seekFromClientXRef = useRef(seekFromClientX);
  useEffect(() => {
    seekFromClientXRef.current = seekFromClientX;
  }, [seekFromClientX]);

  const handleProgressClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!enableDragging) return;
    if (dragJustEndedRef.current) {
      dragJustEndedRef.current = false;
      return;
    }
    seekFromClientX(event.clientX);
  };

  const startDrag = (event: React.MouseEvent) => {
    if (!enableDragging) return;
    event.preventDefault();
    if (!audioUrl || effectiveDuration <= 0) return;
    setIsDragging(true);
  };

  useEffect(() => {
    if (!enableDragging || !isDragging) return;
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
  }, [enableDragging, isDragging]);

  if (!audioUrl) {
    return null;
  }

  const displayTime = displayCurrentTime ?? currentTime;
  const progressRatio =
    effectiveDuration > 0
      ? Math.max(0, Math.min(1, displayTime / effectiveDuration))
      : 0;

  return (
    <div className={`audio-player-panel overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-surface-muted/90 via-surface-muted/70 to-brand/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] text-sm ${className}`}>
      <audio
        ref={audioRef}
        className="hidden"
        onError={() => {
          setIsPlaying(false);
        }}
      />
      {nextAudioUrl ? (
        <audio
          ref={nextPreloadRef}
          src={nextAudioUrl}
          preload="auto"
          className="hidden"
          aria-hidden
        />
      ) : null}
      
      {/* Transport bar: time display + play controls */}
      <div className="flex flex-wrap items-center gap-4 border-b border-foreground/10 px-4 py-3 sm:flex-nowrap">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="audio-time-display flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground/10 px-3 py-2 font-mono text-sm tabular-nums">
            <span className="text-foreground">{formatTime(displayTime)}</span>
            <span className="text-foreground-muted">/</span>
            <span className="text-brand">
              {effectiveDuration > 0 ? formatTime(effectiveDuration) : "—"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
          <button
            type="button"
            className="play-btn-primary order-first flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-black shadow-lg shadow-brand/25 transition hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
            onClick={togglePlayPause}
            disabled={disabled}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <span className="ml-0.5 text-sm font-bold">▶</span>
            )}
          </button>
          <button
            type="button"
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-50 ${
              loopSelection
                ? "border-brand bg-brand/20 text-brand"
                : "border-foreground/20 bg-foreground/5 text-foreground-muted hover:border-foreground/30 hover:bg-foreground/10 hover:text-foreground"
            }`}
            onClick={toggleLoop}
            disabled={disabled}
            aria-label={loopSelection ? "Loop on" : "Loop off"}
            title={loopSelection ? "Loop on" : "Loop off"}
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
          {showStopButton && (
            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-foreground/20 bg-foreground/5 text-foreground-muted transition hover:border-foreground/30 hover:bg-foreground/10 hover:text-foreground disabled:opacity-50"
              onClick={stopPlayback}
              disabled={disabled}
              aria-label="Stop"
              title="Stop"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {effectiveDuration > 0 && (
        <div className="px-4 pb-2 pt-0">
          {enableDragging ? (
            <div
              ref={progressBarRef}
              className="relative flex min-w-0 flex-1 cursor-pointer items-center py-1"
              role="progressbar"
              aria-valuenow={displayTime}
              aria-valuemin={0}
              aria-valuemax={effectiveDuration}
              onClick={handleProgressClick}
            >
              <div className="relative h-2.5 w-full rounded-full bg-surface-highlight/80 shadow-inner ring-1 ring-foreground/15 transition hover:bg-surface-highlight">
                <div
                  className="absolute inset-0 h-full w-full origin-left rounded-full bg-brand shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
                  style={{
                    transform: `scaleX(${progressRatio})`,
                  }}
                />
                <div
                  className="absolute top-1/2 z-10 cursor-grab rounded-full bg-brand shadow-md shadow-brand/40 ring-2 ring-background/80 transition hover:scale-110 active:cursor-grabbing"
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
          ) : (
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-highlight/70 shadow-inner ring-1 ring-foreground/10"
              role="progressbar"
              aria-valuenow={displayTime}
              aria-valuemin={0}
              aria-valuemax={effectiveDuration}
            >
              <div
                className="h-full rounded-full bg-brand transition-[width] duration-150 ease-out"
                style={{
                  width: `${Math.min(
                    100,
                    (displayTime / effectiveDuration) * 100
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
