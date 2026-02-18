"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  useChapterAudioPlaylist,
  type ChapterAudioEntry,
} from "@/lib/hooks/useChapterAudioPlaylist";
import type { CoachSessionVerse } from "@/lib/types/quran";
import { AudioPlayer } from "./AudioPlayer";

type PlaybackScope = "session" | "surah";

type CurrentAyahHighlight =
  | "brand"
  | "accent"
  | "teal"
  | "amber"
  | "rose"
  | "none";

const AYAH_HIGHLIGHT_OPTIONS: Array<{
  id: CurrentAyahHighlight;
  label: string;
  className: string;
  swatchClass: string;
}> = [
  { id: "brand", label: "Theme", className: "text-brand", swatchClass: "bg-brand" },
  { id: "accent", label: "Accent", className: "text-brand-accent", swatchClass: "bg-brand-accent" },
  { id: "teal", label: "Teal", className: "text-teal-400", swatchClass: "bg-teal-400" },
  { id: "amber", label: "Amber", className: "text-amber-400", swatchClass: "bg-amber-400" },
  { id: "rose", label: "Rose", className: "text-rose-400", swatchClass: "bg-rose-400" },
  { id: "none", label: "None", className: "text-foreground", swatchClass: "bg-foreground/70" },
];

type Props = {
  sessionVerses: CoachSessionVerse[];
  chapterId?: number;
  chapterName?: string;
  reciterId?: number;
  reciterName?: string;
};

const ARABIC_NUMERALS = "٠١٢٣٤٥٦٧٨٩";

const toArabicNumerals = (n: number): string =>
  String(n)
    .split("")
    .map((d) => ARABIC_NUMERALS[Number.parseInt(d, 10)] ?? d)
    .join("");

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


export const SurahAudioPanel = ({
  sessionVerses,
  chapterId,
  chapterName,
  reciterId,
  reciterName,
}: Props) => {
  const AYAT_PER_PAGE = 10;

  const [scope, setScope] = useState<PlaybackScope>("session");
  const [fullSurahTextView, setFullSurahTextView] = useState(false);
  const [currentAyahHighlight, setCurrentAyahHighlight] =
    useState<CurrentAyahHighlight>("brand");
  const [highlightDropdownOpen, setHighlightDropdownOpen] = useState(false);
  const highlightDropdownRef = useRef<HTMLDivElement>(null);
  const [surahPage, setSurahPage] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loopSelection] = useState(false);
  const [cumulativeTime, setCumulativeTime] = useState(0);
  const [currentVerseTime, setCurrentVerseTime] = useState(0);

  const scrollToRangeSection = () => {
    document.getElementById("session-range")?.scrollIntoView({ behavior: "smooth" });
  };

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
    totalDurationSeconds: apiTotalDurationSeconds,
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
  const apiTrackDuration = currentTrack?.durationSeconds ?? 0;
  // In full surah mode use API total duration when available, else sum of playlist durations
  const surahTotalSeconds =
    isSurahScope
      ? Math.max(apiTotalDurationSeconds ?? 0, totalDuration)
      : 0;
  const effectiveTrackDuration =
    isSurahScope && surahTotalSeconds > 0 ? surahTotalSeconds : apiTrackDuration;
  const displayCurrentTime =
    isSurahScope && effectiveTrackDuration > 0
      ? cumulativeTime + currentVerseTime
      : undefined;

  useEffect(() => {
    setCurrentIndex(0);
    setCumulativeTime(0);
    setCurrentVerseTime(0);
    if (scope === "session") {
      setFullSurahTextView(false);
      setSurahPage(0);
    }
  }, [playlistSignature, scope]);

  const surahTotalPages = Math.max(
    1,
    Math.ceil(activePlaylist.length / AYAT_PER_PAGE),
  );
  const safeSurahPage = Math.min(surahPage, Math.max(0, surahTotalPages - 1));
  const surahPageAyat = useMemo(
    () =>
      activePlaylist.slice(
        safeSurahPage * AYAT_PER_PAGE,
        (safeSurahPage + 1) * AYAT_PER_PAGE,
      ),
    [activePlaylist, safeSurahPage],
  );

  useEffect(() => {
    if (surahPage >= surahTotalPages && surahTotalPages > 0) {
      setSurahPage(Math.max(0, surahTotalPages - 1));
    }
  }, [surahPage, surahTotalPages]);

  const currentTrackVerseKey = currentTrack?.verseKey;

  useEffect(() => {
    if (!isSurahScope || !fullSurahTextView || !currentTrackVerseKey || activePlaylist.length === 0) {
      return;
    }
    const idx = activePlaylist.findIndex((e) => e.verseKey === currentTrackVerseKey);
    if (idx >= 0) {
      const pageForAyah = Math.floor(idx / AYAT_PER_PAGE);
      setSurahPage((prev) => (pageForAyah !== prev ? pageForAyah : prev));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fixed-length primitive deps to avoid "dependency array changed size" error
  }, [isSurahScope, fullSurahTextView, currentTrackVerseKey, playlistSignature]);


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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        highlightDropdownRef.current &&
        !highlightDropdownRef.current.contains(event.target as Node)
      ) {
        setHighlightDropdownOpen(false);
      }
    };
    if (highlightDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [highlightDropdownOpen]);


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
    <section className="rounded-3xl border border-white/10 bg-surface-raised/80 p-4 shadow-sm md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            Surah playback
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            {isSurahScope ? "Full Surah" : "Current Slice"}
          </h2>
          <p className="text-xs text-foreground-muted">
            {chapterName ? `${chapterName} • ` : ""}
            {reciterName ?? "Mishari Rashid Al-Afasy"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          {scope === "session" && sessionPlaylist.length > 0 && (
            <button
              type="button"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-foreground transition hover:border-brand/40 hover:bg-brand/10 hover:text-brand"
              onClick={scrollToRangeSection}
            >
              Change range
            </button>
          )}
          {isSurahScope && chapterId && activePlaylist.length > 0 && (
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                fullSurahTextView
                  ? "bg-white/15 text-foreground"
                  : "bg-white/10 text-foreground hover:bg-white/20"
              }`}
              onClick={() => setFullSurahTextView((prev) => !prev)}
            >
              {fullSurahTextView ? "Ayah only view" : "Full surah view"}
            </button>
          )}
        </div>
      </header>

      {isSurahScope && !chapterId && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-3 text-sm md:p-4 text-foreground-muted">
          Pick a surah to unlock the full-length playback queue.
        </p>
      )}

      {isSurahScope && isLoadingSurah && (
        <p className="mt-4 rounded-2xl border border-white/5 p-3 text-sm text-foreground-muted md:p-4">
          Assembling full surah audio…
        </p>
      )}

      {isSurahScope && surahError && (
        <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300 md:p-4">
          Failed to load surah audio{" "}
          {surahErrorDetail instanceof Error ? `(${surahErrorDetail.message})` : ""}
        </p>
      )}

      {activePlaylist.length > 0 && (
        <div>
          {currentAudioUrl && (
            <div className="mt-4">
              <AudioPlayer
                audioUrl={currentAudioUrl}
                durationSeconds={effectiveTrackDuration}
                loop={loopSelection}
                nextAudioUrl={
                  activePlaylist.length > 0 && currentIndex + 1 < activePlaylist.length
                    ? activePlaylist[currentIndex + 1].audioUrl
                    : loopSelection
                      ? activePlaylist[0]?.audioUrl
                      : undefined
                }
                onNext={() => {
                  if (!activePlaylist.length) return;
                  if (isSurahScope && currentTrack) {
                    setCumulativeTime((prev) => prev + (currentTrack.durationSeconds ?? 0));
                    setCurrentVerseTime(0);
                  }
                  setCurrentIndex((prev) => {
                    const nextIndex = prev + 1;
                    if (nextIndex < activePlaylist.length) return nextIndex;
                    if (loopSelection) {
                      if (isSurahScope) {
                        setCumulativeTime(0);
                        setCurrentVerseTime(0);
                      }
                      return 0;
                    }
                    return prev;
                  });
                }}
                onPlay={() => {}}
                onPause={() => {}}
                onTimeUpdate={isSurahScope ? setCurrentVerseTime : undefined}
                onStop={() => {
                  setCurrentIndex(0);
                  setCumulativeTime(0);
                  setCurrentVerseTime(0);
                }}
                onEnded={() => {
                  if (!activePlaylist.length) return;
                  if (isSurahScope && currentTrack) {
                    setCumulativeTime((prev) => prev + (currentTrack.durationSeconds ?? 0));
                    setCurrentVerseTime(0);
                  }
                  const hasNext =
                    currentIndex + 1 < activePlaylist.length || loopSelection;
                  if (!hasNext) {
                    setCurrentIndex((prev) => prev);
                  }
                }}
                displayCurrentTime={displayCurrentTime}
                disabled={disablePanel}
                showStopButton={true}
                enableDragging={true}
              />
              <div className="mt-3 px-4">
                {/* <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground-muted">
                    {nextLabel}
                  </p>
                  <p className="truncate text-xs text-foreground/80">
                    Queue: {activePlaylist.length} ayat · ~{formatDuration(totalDuration)}
                  </p>
                </div> */}
              </div>
            </div>
          )}

          <div className="space-y-4 p-3 pt-0 md:p-4">
            {isSurahScope && fullSurahTextView && activePlaylist.length > 0 ? (
              <div className="full-surah-ayat-list -mx-3 w-[calc(100%+1.5rem)] max-w-none space-y-1 md:-mx-4 md:w-[calc(100%+2rem)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground-muted">
                    Full surah • {activePlaylist.length} ayat
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-foreground-muted">
                      Highlight:
                    </span>
                    <div
                      className="relative"
                      ref={highlightDropdownRef}
                    >
                      <span className="sr-only">Highlight color</span>
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-white/10"
                        onClick={() => setHighlightDropdownOpen((open) => !open)}
                        aria-expanded={highlightDropdownOpen}
                        aria-haspopup="listbox"
                        aria-label={`Highlight: ${AYAH_HIGHLIGHT_OPTIONS.find((o) => o.id === currentAyahHighlight)?.label ?? "Theme"}`}
                      >
                        <span
                          className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-white/20 ${AYAH_HIGHLIGHT_OPTIONS.find((o) => o.id === currentAyahHighlight)?.swatchClass ?? "bg-brand"}`}
                          aria-hidden
                        />
                        <span className="text-foreground-muted">
                          {AYAH_HIGHLIGHT_OPTIONS.find((o) => o.id === currentAyahHighlight)?.label ?? "Theme"}
                        </span>
                      </button>
                      {highlightDropdownOpen && (
                        <ul
                          className="absolute right-0 top-full z-10 mt-1 min-w-[8rem] rounded-lg border border-white/10 bg-surface-raised py-1 shadow-lg"
                          role="listbox"
                          aria-label="Highlight color options"
                        >
                          {AYAH_HIGHLIGHT_OPTIONS.map((opt) => (
                            <li key={opt.id} role="option" aria-selected={currentAyahHighlight === opt.id}>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition hover:bg-white/10"
                                onClick={() => {
                                  setCurrentAyahHighlight(opt.id);
                                  setHighlightDropdownOpen(false);
                                }}
                              >
                                <span
                                  className={`h-4 w-4 shrink-0 rounded border border-white/20 ${opt.swatchClass}`}
                                  aria-hidden
                                />
                                {opt.label}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-surface-muted/30 p-3 md:p-4">
                  <div
                    className="surah-paragraph text-center text-xl leading-relaxed text-foreground md:text-2xl md:leading-loose lg:text-3xl"
                    dir="rtl"
                  >
                    {surahPageAyat.map((entry) => {
                      const isCurrentAyah = currentTrack?.verseKey === entry.verseKey;
                      const highlightClass =
                        isCurrentAyah
                          ? AYAH_HIGHLIGHT_OPTIONS.find(
                              (o) => o.id === currentAyahHighlight,
                            )?.className
                          : undefined;
                      return (
                        <Fragment key={entry.verseKey}>
                          <span
                            className={highlightClass}
                          >
                            {entry.text}
                          </span>
                          <span
                            className="verse-number-marker verse-number-marker--circle"
                            aria-label={`Ayah ${entry.orderInChapter}`}
                          >
                            {toArabicNumerals(entry.orderInChapter)}
                          </span>
                          {" "}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
                {currentTrack && (
                  <p className="text-xs text-foreground-muted">
                    Now playing: {nextLabel}
                  </p>
                )}
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeSurahPage <= 0}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
                    onClick={() => setSurahPage((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="text-xs tabular-nums text-foreground-muted">
                    Page {safeSurahPage + 1} of {surahTotalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeSurahPage >= surahTotalPages - 1}
                    className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
                    onClick={() =>
                      setSurahPage((p) => Math.min(surahTotalPages - 1, p + 1))
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {currentTrack && (
                  <p className="mb-1 text-xs font-semibold text-foreground-muted">
                    Now playing • {nextLabel}
                  </p>
                )}
                <div className="now-playing-card -mx-4 w-[calc(100%+2rem)] max-w-none rounded-xl border-l-4 border-brand bg-surface-highlight/50 p-3 text-foreground md:p-4">
                  {currentTrack ? (
                    <p className="text-right text-3xl leading-snug text-foreground" dir="rtl">
                      {currentTrack.text}
                    </p>
                  ) : (
                    <p className="text-xs">No ayah selected yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>  
        </div>
      )}

      {!activePlaylist.length && !(isSurahScope && !chapterId) && (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-3 text-sm md:p-4 text-foreground-muted">
          This selection does not have audio yet. Try another reciter or adjust the
          ayah range.
        </p>
      )}

    </section>
  );
};


