"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  useChapterAudioPlaylist,
  type ChapterAudioEntry,
} from "@/lib/hooks/useChapterAudioPlaylist";
import type { CoachSessionVerse } from "@/lib/types/quran";

type PlaybackScope = "session" | "surah";

type Props = {
  sessionVerses: CoachSessionVerse[];
  chapterId?: number;
  chapterName?: string;
  reciterId?: number;
  reciterName?: string;
};

const formatDuration = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "—";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.max(0, Math.round(seconds - mins * 60));
  if (!mins) {
    return `${secs}s`;
  }
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
};

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/** Play was aborted because we changed source/load; do not treat as user-visible error. */
const isPlayAbortError = (err: unknown): boolean =>
  err instanceof Error && err.name === "AbortError";

export const SurahAudioPanel = ({
  sessionVerses,
  chapterId,
  chapterName,
  reciterId,
  reciterName,
}: Props) => {
  const [scope, setScope] = useState<PlaybackScope>("session");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopSelection, setLoopSelection] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [trackDurationFromAudio, setTrackDurationFromAudio] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastLoadedSrcRef = useRef<string>("");

  const sessionPlaylist = useMemo<ChapterAudioEntry[]>(
    () =>
      sessionVerses
        .filter((verse) => Boolean(verse.audio?.audio.url))
        .map((verse) => ({
          verseKey: verse.verse.verseKey,
          orderInChapter: verse.orderInChapter,
          text: verse.verse.textUthmani,
          audioUrl: verse.audio?.audio.url ?? "",
          durationSeconds: verse.audio?.audio.durationSeconds ?? 0,
        })),
    [sessionVerses],
  );

  const isSurahScope = scope === "surah";
  const {
    playlist: surahPlaylist,
    isLoading: isLoadingSurah,
    isError: surahError,
    error: surahErrorDetail,
  } = useChapterAudioPlaylist({
    chapterId: isSurahScope ? chapterId : undefined,
    reciterId,
    enabled: isSurahScope,
  });

  const activePlaylist = isSurahScope ? surahPlaylist : sessionPlaylist;
  const playlistSignature = useMemo(
    () => activePlaylist.map((entry) => entry.verseKey).join("|"),
    [activePlaylist],
  );
  const totalDuration = useMemo(
    () =>
      activePlaylist.reduce(
        (accumulator, entry) => accumulator + (entry.durationSeconds ?? 0),
        0,
      ),
    [activePlaylist],
  );
  const currentTrack = activePlaylist[currentIndex];
  const currentAudioUrl = currentTrack?.audioUrl?.trim() ?? "";
  const hasValidSource = currentAudioUrl.length > 0;
  const apiTrackDuration = currentTrack?.durationSeconds ?? 0;
  const effectiveTrackDuration =
    apiTrackDuration > 0 ? apiTrackDuration : trackDurationFromAudio;

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
    setCurrentTime(0);
    setTrackDurationFromAudio(0);
    lastLoadedSrcRef.current = "";
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audio.currentTime = 0;
    }
  }, [playlistSignature, scope]);

  // Keep audio element source in sync and call load() so the element has a supported source before play()
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || lastLoadedSrcRef.current === currentAudioUrl) {
      return;
    }
    lastLoadedSrcRef.current = currentAudioUrl;
    if (!currentAudioUrl) {
      audio.removeAttribute("src");
      audio.load();
      return;
    }
    audio.pause();
    audio.src = currentAudioUrl;
    audio.load();
  }, [currentAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasValidSource) {
      return;
    }
    if (!isPlaying) {
      audio.pause();
      return;
    }
    const play = async () => {
      try {
        await audio.play();
      } catch (error) {
        if (isPlayAbortError(error)) {
          return;
        }
        console.error("Failed to start playback", error);
        setIsPlaying(false);
      }
    };
    void play();
  }, [currentAudioUrl, hasValidSource, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const syncTime = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      syncTime();
      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        !Number.isNaN(audio.duration)
      ) {
        setTrackDurationFromAudio(audio.duration);
      }
    };
    audio.addEventListener("timeupdate", syncTime);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    return () => {
      audio.removeEventListener("timeupdate", syncTime);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
    };
  }, [currentAudioUrl]);

  useEffect(() => {
    if (!currentAudioUrl) setTrackDurationFromAudio(0);
  }, [currentAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }
    const handleEnded = () => {
      if (!activePlaylist.length) {
        setIsPlaying(false);
        return;
      }
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex < activePlaylist.length) {
          return nextIndex;
        }
        if (loopSelection) {
          return 0;
        }
        setIsPlaying(false);
        return prev;
      });
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [activePlaylist.length, loopSelection]);

  useEffect(() => {
    if (
      activePlaylist.length === 0 ||
      currentIndex < activePlaylist.length ||
      currentIndex === 0
    ) {
      return;
    }
    setCurrentIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlaylist.length]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack || !hasValidSource) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      if (isPlayAbortError(error)) {
        return;
      }
      console.error("Unable to begin playback", error);
      setIsPlaying(false);
    }
  };

  const restartPlayback = () => {
    if (!activePlaylist.length) {
      return;
    }
    setCurrentIndex(0);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      if (isPlaying) {
        audio.play().catch((err: unknown) => {
          if (!isPlayAbortError(err)) {
            console.error("Restart playback failed", err);
            setIsPlaying(false);
          }
        });
      }
    }
  };

  const nextLabel =
    activePlaylist.length > 0
      ? `Ayah ${currentTrack?.orderInChapter ?? 0} of ${activePlaylist.length}`
      : "No audio queued";

  const scopeButtons: Array<{ id: PlaybackScope; label: string; disabled?: boolean }> =
    [
      { id: "session", label: "Session slice" },
      {
        id: "surah",
        label: "Full surah",
        disabled: !chapterId,
      },
    ];

  const disablePanel =
    (isSurahScope && (!chapterId || surahError)) || activePlaylist.length === 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-surface-raised/80 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            Surah playback
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            {isSurahScope ? "Full surah journey" : "Loop current slice"}
          </h2>
          <p className="text-xs text-foreground-muted">
            {chapterName ? `${chapterName} • ` : ""}
            {reciterName ?? "Mishari Rashid Al-Afasy"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {scopeButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              disabled={button.disabled}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                scope === button.id
                  ? "bg-brand text-black"
                  : "bg-white/10 text-foreground"
              } ${button.disabled ? "opacity-40" : "hover:bg-white/20"}`}
              onClick={() => setScope(button.id)}
            >
              {button.label}
            </button>
          ))}
        </div>
      </header>

      {isSurahScope && !chapterId && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-foreground-muted">
          Pick a surah to unlock the full-length playback queue.
        </p>
      )}

      {isSurahScope && isLoadingSurah && (
        <p className="mt-4 rounded-2xl border border-white/5 p-4 text-sm text-foreground-muted">
          Assembling full surah audio…
        </p>
      )}

      {isSurahScope && surahError && (
        <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          Failed to load surah audio{" "}
          {surahErrorDetail instanceof Error ? `(${surahErrorDetail.message})` : ""}
        </p>
      )}

      {activePlaylist.length > 0 && (
        <div className="audio-player-panel mt-4 overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-surface-muted/90 via-surface-muted/70 to-brand/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] text-sm">
          {/* Transport bar: time display + play controls */}
          <div className="flex flex-wrap items-center gap-4 border-b border-white/5 px-4 py-3 sm:flex-nowrap">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="audio-time-display flex shrink-0 items-center gap-1.5 rounded-xl bg-black/20 px-3 py-2 font-mono text-sm tabular-nums">
                <span className="text-foreground">{formatTime(currentTime)}</span>
                <span className="text-foreground-muted">/</span>
                <span className="text-brand">
                  {effectiveTrackDuration > 0
                    ? formatTime(effectiveTrackDuration)
                    : "—"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground-muted">
                  {nextLabel}
                </p>
                <p className="truncate text-xs text-foreground/80">
                  Queue: {activePlaylist.length} ayat · ~{formatDuration(totalDuration)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
              <button
                type="button"
                className="play-btn-primary order-first rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-brand/25 transition hover:brightness-110 hover:shadow-brand/30 disabled:opacity-50 disabled:hover:brightness-100 disabled:hover:shadow-brand/25"
                onClick={togglePlayPause}
                disabled={disablePanel}
              >
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-foreground transition hover:border-brand/40 hover:bg-brand/10 hover:text-brand disabled:opacity-50"
                onClick={restartPlayback}
                disabled={disablePanel}
              >
                Restart
              </button>
              <button
                type="button"
                className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition disabled:opacity-50 ${
                  loopSelection
                    ? "border-brand/50 bg-brand/20 text-brand"
                    : "border-white/15 bg-white/5 text-foreground hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
                }`}
                onClick={() => setLoopSelection((prev) => !prev)}
                disabled={disablePanel}
              >
                {loopSelection ? "Loop ✓" : "Loop"}
              </button>
            </div>
          </div>

          {/* Progress bar for current ayah */}
          {currentTrack && effectiveTrackDuration > 0 && (
            <div className="px-4 pb-2 pt-0">
              <div
                className="h-1 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={currentTime}
                aria-valuemin={0}
                aria-valuemax={effectiveTrackDuration}
              >
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-150 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      (currentTime / effectiveTrackDuration) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-4 p-4 pt-0">

          <div>
            {currentTrack && (
              <p className="mb-1 text-xs font-semibold text-foreground-muted">
                Now playing • Ayah {currentTrack.orderInChapter}
              </p>
            )}
            <div className="now-playing-card rounded-xl border-l-4 border-brand bg-surface-highlight/50 p-4 text-foreground">
              {currentTrack ? (
                <p className="text-right text-3xl leading-snug text-foreground" dir="rtl">
                  {currentTrack.text}
                </p>
              ) : (
                <p className="text-xs">No ayah selected yet.</p>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {!activePlaylist.length && !(isSurahScope && !chapterId) && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-foreground-muted">
          This selection does not have audio yet. Try another reciter or adjust the
          ayah range.
        </p>
      )}

      {activePlaylist.length > 0 ? (
        <audio
          ref={audioRef}
          className="hidden"
          onError={() => {
            setIsPlaying(false);
          }}
        />
      ) : null}
    </section>
  );
};


