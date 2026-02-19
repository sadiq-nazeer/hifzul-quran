"use client";

import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
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

/** Full surah paragraph text size: index → Tailwind text/leading classes. */
const FULL_SURAH_TEXT_SIZES = [
  "text-base leading-relaxed md:text-lg md:leading-loose lg:text-xl",
  "text-xl leading-relaxed md:text-2xl md:leading-loose lg:text-3xl",
  "text-2xl leading-relaxed md:text-3xl md:leading-loose lg:text-4xl",
  "text-3xl leading-relaxed md:text-4xl md:leading-loose lg:text-5xl",
] as const;
const FULL_SURAH_TEXT_SIZE_MIN = 0;
const FULL_SURAH_TEXT_SIZE_MAX = FULL_SURAH_TEXT_SIZES.length - 1;

type Props = {
  sessionVerses: CoachSessionVerse[];
  /** Full chapter verses with word-level data (for word pronunciation in Full Surah view) */
  fullChapterVerses?: CoachSessionVerse[];
  chapterId?: number;
  chapterName?: string;
  reciterId?: number;
  reciterName?: string;
  /** Session slice range (for display and inline editing when scope is "session") */
  fromVerse?: number;
  toVerse?: number;
  versesCount?: number;
  onRangeChange?: (fromVerse: number, toVerse: number) => void;
};

const ARABIC_NUMERALS = "٠١٢٣٤٥٦٧٨٩";

const toArabicNumerals = (n: number): string =>
  String(n)
    .split("")
    .map((d) => ARABIC_NUMERALS[Number.parseInt(d, 10)] ?? d)
    .join("");

const clampVerse = (value: number | undefined, min: number, max: number): number => {
  const n = value ?? min;
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
};

/** Split Uthmani Arabic verse into words (space-separated). */
function splitVerseIntoWords(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

export const SurahAudioPanel = ({
  sessionVerses,
  fullChapterVerses = [],
  chapterId,
  chapterName,
  reciterId,
  reciterName,
  fromVerse = 1,
  toVerse = 5,
  versesCount = 286,
  onRangeChange,
}: Props) => {
  const AYAT_PER_PAGE = 10;

  const [scope, setScope] = useState<PlaybackScope>("surah");
  const [fullSurahTextView, setFullSurahTextView] = useState(false);
  const [fullSurahTextSizeIndex, setFullSurahTextSizeIndex] = useState(1); // 1 = default (medium)
  const [currentAyahHighlight, setCurrentAyahHighlight] =
    useState<CurrentAyahHighlight>("brand");
  const [highlightDropdownOpen, setHighlightDropdownOpen] = useState(false);
  const highlightDropdownRef = useRef<HTMLDivElement>(null);
  const [surahPage, setSurahPage] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loopSelection] = useState(false);
  const [surahElapsedSeconds, setSurahElapsedSeconds] = useState(0);
  const [sessionRangeExpanded, setSessionRangeExpanded] = useState(true);
  const [playingWordKey, setPlayingWordKey] = useState<string | null>(null);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);

  const sessionVerseByKey = useMemo(
    () => new Map(sessionVerses.map((v) => [v.verse.verseKey, v])),
    [sessionVerses],
  );

  const fullChapterVerseByKey = useMemo(
    () => new Map(fullChapterVerses.map((v) => [v.verse.verseKey, v])),
    [fullChapterVerses],
  );

  const playWordAudio = (wordAudioUrl?: string, wordKey?: string) => {
    if (!wordAudioUrl || !wordKey) return;
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

  useEffect(() => {
    return () => {
      const wordAudio = wordAudioRef.current;
      if (wordAudio) {
        wordAudio.pause();
      }
      wordAudioRef.current = null;
    };
  }, []);

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

  const verseByKeyForWords = useMemo(
    () => (isSurahScope ? fullChapterVerseByKey : sessionVerseByKey),
    [isSurahScope, fullChapterVerseByKey, sessionVerseByKey],
  );

  const {
    playlist: surahPlaylist,
    fullSurahAudio,
    totalDurationSeconds: apiTotalDurationSeconds,
    isLoading: isLoadingSurah,
    isError: surahError,
    error: surahErrorDetail,
  } = useChapterAudioPlaylist({
    chapterId: isSurahScope ? chapterId : undefined,
    reciterId,
    fullSurah: isSurahScope,
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
  const sortedSurahTimestamps = useMemo(
    () =>
      [...(fullSurahAudio?.timestamps ?? [])].sort(
        (a, b) => a.fromMs - b.fromMs,
      ),
    [fullSurahAudio?.timestamps],
  );
  const surahTimelineSeconds =
    sortedSurahTimestamps.length > 0
      ? Math.max(0, sortedSurahTimestamps[sortedSurahTimestamps.length - 1].toMs / 1000)
      : 0;
  // In full surah mode use the best available total duration.
  const surahTotalSeconds =
    isSurahScope
      ? Math.max(apiTotalDurationSeconds ?? 0, surahTimelineSeconds, totalDuration)
      : 0;
  const currentTrackMs = Math.round(surahElapsedSeconds * 1000);
  const surahCurrentVerseKey = useMemo(() => {
    if (!isSurahScope || sortedSurahTimestamps.length === 0) return undefined;
    const atTime = sortedSurahTimestamps.find(
      (timestamp) =>
        currentTrackMs >= timestamp.fromMs && currentTrackMs < timestamp.toMs,
    );
    if (atTime) return atTime.verseKey;
    if (currentTrackMs >= sortedSurahTimestamps[sortedSurahTimestamps.length - 1].toMs) {
      return sortedSurahTimestamps[sortedSurahTimestamps.length - 1].verseKey;
    }
    return undefined;
  }, [currentTrackMs, isSurahScope, sortedSurahTimestamps]);
  const surahCurrentIndex = useMemo(() => {
    if (!surahCurrentVerseKey) return -1;
    return activePlaylist.findIndex((entry) => entry.verseKey === surahCurrentVerseKey);
  }, [activePlaylist, surahCurrentVerseKey]);
  const highlightedTrack =
    isSurahScope && surahCurrentIndex >= 0
      ? activePlaylist[surahCurrentIndex]
      : currentTrack;
  const currentAudioUrl = isSurahScope
    ? fullSurahAudio?.audioUrl?.trim() ?? ""
    : currentTrack?.audioUrl?.trim() ?? "";
  const apiTrackDuration = currentTrack?.durationSeconds ?? 0;
  const effectiveTrackDuration =
    isSurahScope && surahTotalSeconds > 0 ? surahTotalSeconds : apiTrackDuration;
  const displayCurrentTime =
    isSurahScope && effectiveTrackDuration > 0
      ? surahElapsedSeconds
      : undefined;

  useEffect(() => {
    setCurrentIndex(0);
    setSurahElapsedSeconds(0);
    if (scope === "session") {
      setFullSurahTextView(false);
      setSurahPage(0);
    } else if (scope === "surah") {
      setFullSurahTextView(false);
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

  const currentTrackVerseKey = highlightedTrack?.verseKey;

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
      ? `Ayah ${highlightedTrack?.orderInChapter ?? 0} of ${activePlaylist.length}`
      : "No audio queued";

  const scopeButtons: Array<{ id: PlaybackScope; label: string; disabled?: boolean }> =
    [
      {
        id: "surah",
        label: "Full Surah",
        disabled: !chapterId,
      },
      { id: "session", label: "Surah Range" },
    ];

  const disablePanel =
    (isSurahScope && (!chapterId || surahError)) || activePlaylist.length === 0;

  return (
    <section className="rounded-3xl border border-foreground/10 bg-surface-raised/80 p-4 shadow-sm md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-foreground-muted">
            Surah playback
          </p>
          <h2 className="text-2xl font-semibold text-foreground">
            {isSurahScope ? "Full Surah" : "Sliced Session"}
          </h2>
          <p className="text-xs text-foreground-muted">
            {chapterName ? `${chapterName} • ` : ""}
            {reciterName ?? "Mishari Rashid Al-Afasy"}
          </p>
        </div>

        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {scopeButtons.map((button) => (
              <button
                key={button.id}
                type="button"
                disabled={button.disabled}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  scope === button.id
                    ? "bg-brand text-black"
                    : "bg-foreground/5 text-foreground"
                } ${button.disabled ? "opacity-40" : "hover:bg-foreground/10"}`}
                onClick={() => setScope(button.id)}
              >
                {button.label}
              </button>
            ))}
          </div>
          {isSurahScope && chapterId && activePlaylist.length > 0 && (
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                fullSurahTextView
                  ? "bg-foreground/10 text-foreground"
                  : "bg-foreground/5 text-foreground hover:bg-foreground/10"
              }`}
              onClick={() => setFullSurahTextView((prev) => !prev)}
            >
              {fullSurahTextView ? "Ayah Only View" : "Full Surah View"}
            </button>
          )}
        </div>
      </header>

      {scope === "session" && onRangeChange && chapterId != null && versesCount > 0 && (
        <div className="mt-4 rounded-2xl border border-foreground/10 bg-surface-muted/30 overflow-hidden">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-foreground/5 md:p-4"
            onClick={() => setSessionRangeExpanded((prev) => !prev)}
            aria-expanded={sessionRangeExpanded}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Surah Range
            </span>
            <span className="shrink-0 text-foreground-muted" aria-hidden>
              {sessionRangeExpanded ? (
                <ChevronUp className="h-5 w-5" strokeWidth={2} />
              ) : (
                <ChevronDown className="h-5 w-5" strokeWidth={2} />
              )}
            </span>
          </button>
          {sessionRangeExpanded && (
            <div className="border-t border-foreground/10 p-3 md:p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <p className="text-sm text-foreground-muted">
                  Current: Ayah {clampVerse(fromVerse, 1, versesCount)} – {clampVerse(toVerse, 1, versesCount)}
                  {versesCount > 0 && (
                    <span className="ml-1 tabular-nums">
                      ({sessionPlaylist.length} ayat with audio)
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap items-end gap-3 md:shrink-0">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-foreground-muted">From</span>
                    <input
                      type="number"
                      min={1}
                      max={versesCount}
                      className="w-20 rounded-xl border border-foreground/10 bg-surface-raised/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      value={clampVerse(fromVerse, 1, versesCount)}
                      onChange={(e) => {
                        const from = clampVerse(Number(e.target.value), 1, versesCount);
                        onRangeChange(from, Math.max(from, clampVerse(toVerse, 1, versesCount)));
                      }}
                      aria-label="From verse"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-foreground-muted">To</span>
                    <input
                      type="number"
                      min={clampVerse(fromVerse, 1, versesCount)}
                      max={versesCount}
                      className="w-20 rounded-xl border border-foreground/10 bg-surface-raised/80 px-3 py-2 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      value={clampVerse(toVerse, 1, versesCount)}
                      onChange={(e) => {
                        const to = clampVerse(Number(e.target.value), clampVerse(fromVerse, 1, versesCount), versesCount);
                        onRangeChange(clampVerse(fromVerse, 1, versesCount), to);
                      }}
                      aria-label="To verse"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isSurahScope && !chapterId && (
        <p className="mt-4 rounded-2xl border border-dashed border-foreground/15 p-3 text-sm md:p-4 text-foreground-muted">
          Pick a surah to unlock the full-length playback queue.
        </p>
      )}

      {isSurahScope && isLoadingSurah && (
        <p className="mt-4 rounded-2xl border border-foreground/10 p-3 text-sm text-foreground-muted md:p-4">
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
                  isSurahScope
                    ? undefined
                    : activePlaylist.length > 0 && currentIndex + 1 < activePlaylist.length
                      ? activePlaylist[currentIndex + 1].audioUrl
                      : loopSelection
                        ? activePlaylist[0]?.audioUrl
                        : undefined
                }
                onNext={(completedTrackSeconds) => {
                  if (isSurahScope) return;
                  if (!activePlaylist.length) return;
                  void completedTrackSeconds;
                  setCurrentIndex((prev) => {
                    const nextIndex = prev + 1;
                    if (nextIndex < activePlaylist.length) return nextIndex;
                    if (loopSelection) {
                      return 0;
                    }
                    return prev;
                  });
                }}
                onPlay={() => {}}
                onPause={() => {}}
                onTimeUpdate={isSurahScope ? setSurahElapsedSeconds : undefined}
                onStop={() => {
                  setCurrentIndex(0);
                  setSurahElapsedSeconds(0);
                }}
                onEnded={() => {
                  if (!activePlaylist.length) return;
                  if (isSurahScope) {
                    setSurahElapsedSeconds(effectiveTrackDuration);
                    return;
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
                enableDragging={isSurahScope}
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
                    Full Surah • {activePlaylist.length} ayats
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-foreground-muted">
                      Text size:
                    </span>
                    <div className="flex items-center rounded-lg border border-foreground/10 bg-foreground/5">
                      <button
                        type="button"
                        disabled={fullSurahTextSizeIndex <= FULL_SURAH_TEXT_SIZE_MIN}
                        className="rounded-l-lg p-1.5 text-foreground transition hover:bg-foreground/10 disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() =>
                          setFullSurahTextSizeIndex((i) =>
                            Math.max(FULL_SURAH_TEXT_SIZE_MIN, i - 1)
                          )
                        }
                        aria-label="Decrease text size"
                      >
                        <Minus className="h-4 w-4" strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        disabled={fullSurahTextSizeIndex >= FULL_SURAH_TEXT_SIZE_MAX}
                        className="rounded-r-lg border-l border-foreground/10 p-1.5 text-foreground transition hover:bg-foreground/10 disabled:opacity-40 disabled:hover:bg-transparent"
                        onClick={() =>
                          setFullSurahTextSizeIndex((i) =>
                            Math.min(FULL_SURAH_TEXT_SIZE_MAX, i + 1)
                          )
                        }
                        aria-label="Increase text size"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2} />
                      </button>
                    </div>
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
                        className="flex items-center gap-2 rounded-lg border border-foreground/10 bg-foreground/5 px-2.5 py-1.5 text-xs font-medium text-foreground transition hover:bg-foreground/10"
                        onClick={() => setHighlightDropdownOpen((open) => !open)}
                        aria-expanded={highlightDropdownOpen}
                        aria-haspopup="listbox"
                        aria-label={`Highlight: ${AYAH_HIGHLIGHT_OPTIONS.find((o) => o.id === currentAyahHighlight)?.label ?? "Theme"}`}
                      >
                        <span
                          className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-foreground/20 ${AYAH_HIGHLIGHT_OPTIONS.find((o) => o.id === currentAyahHighlight)?.swatchClass ?? "bg-brand"}`}
                          aria-hidden
                        />
                        <span className="text-foreground-muted">
                          {AYAH_HIGHLIGHT_OPTIONS.find((o) => o.id === currentAyahHighlight)?.label ?? "Theme"}
                        </span>
                      </button>
                      {highlightDropdownOpen && (
                        <ul
                          className="absolute right-0 top-full z-10 mt-1 min-w-[8rem] rounded-lg border border-foreground/10 bg-surface-raised py-1 shadow-lg"
                          role="listbox"
                          aria-label="Highlight color options"
                        >
                          {AYAH_HIGHLIGHT_OPTIONS.map((opt) => (
                            <li key={opt.id} role="option" aria-selected={currentAyahHighlight === opt.id}>
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition hover:bg-foreground/10"
                                onClick={() => {
                                  setCurrentAyahHighlight(opt.id);
                                  setHighlightDropdownOpen(false);
                                }}
                              >
                                <span
                                  className={`h-4 w-4 shrink-0 rounded border border-foreground/20 ${opt.swatchClass}`}
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
                <div className="rounded-xl border border-foreground/10 bg-surface-muted/30 p-3 md:p-4">
                  <div
                    className={`surah-paragraph text-center text-foreground ${FULL_SURAH_TEXT_SIZES[fullSurahTextSizeIndex]}`}
                    dir="rtl"
                  >
                    {surahPageAyat.map((entry) => {
                      const isCurrentAyah = highlightedTrack?.verseKey === entry.verseKey;
                      const highlightClass =
                        isCurrentAyah
                          ? AYAH_HIGHLIGHT_OPTIONS.find(
                              (o) => o.id === currentAyahHighlight,
                            )?.className
                          : undefined;
                      const verseForWords = verseByKeyForWords.get(entry.verseKey);
                      const apiWords =
                        verseForWords?.verse.words?.filter(
                          (word) =>
                            word.charTypeName !== "end" &&
                            word.textUthmani.trim().length > 0,
                        ) ?? [];
                      const verseWords =
                        apiWords.length > 0
                          ? apiWords.map((w) => w.textUthmani)
                          : splitVerseIntoWords(entry.text);
                      const hasWordAudio =
                        apiWords.length > 0 &&
                        apiWords.some((w) => w.audioUrl);
                      return (
                        <Fragment key={entry.verseKey}>
                          <span className={highlightClass}>
                            {hasWordAudio
                              ? verseWords.map((word, i) => (
                                  <span key={i}>
                                    {apiWords[i]?.audioUrl ? (
                                      <button
                                        type="button"
                                        className={`m-0 inline border-0 bg-transparent p-0 font-inherit leading-inherit transition-colors hover:opacity-80 ${playingWordKey === `${entry.verseKey}-${apiWords[i].id}` ? "opacity-100 text-brand" : ""}`}
                                        onClick={() =>
                                          playWordAudio(
                                            apiWords[i].audioUrl,
                                            `${entry.verseKey}-${apiWords[i].id}`,
                                          )
                                        }
                                        title="Play word audio"
                                        aria-label={`Play word audio: ${word}`}
                                      >
                                        {word}
                                      </button>
                                    ) : (
                                      <span>{word}</span>
                                    )}
                                    {i < verseWords.length - 1 ? "\u00A0" : null}
                                  </span>
                                ))
                              : entry.text}
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
                {highlightedTrack && (
                  <p className="text-xs text-foreground-muted">
                    Now playing: {nextLabel}
                  </p>
                )}
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeSurahPage <= 0}
                    className="rounded-lg border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-foreground/10 disabled:opacity-40 disabled:hover:bg-foreground/5"
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
                    className="rounded-lg border border-foreground/10 bg-foreground/5 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-foreground/10 disabled:opacity-40 disabled:hover:bg-foreground/5"
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
                {highlightedTrack && (
                  <p className="mb-1 text-xs font-semibold text-foreground-muted">
                    Now playing • {nextLabel}
                  </p>
                )}
                <div className="now-playing-card -mx-4 w-[calc(100%+2rem)] max-w-none rounded-xl border-l-4 border-brand bg-surface-highlight/50 p-3 text-foreground md:p-4">
                  {highlightedTrack ? (
                    (() => {
                      const nowVerse = highlightedTrack.verseKey
                        ? verseByKeyForWords.get(highlightedTrack.verseKey)
                        : undefined;
                      const nowWords =
                        nowVerse?.verse.words?.filter(
                          (w) =>
                            w.charTypeName !== "end" &&
                            w.textUthmani.trim().length > 0,
                        ) ?? [];
                      const nowVerseWords =
                        nowWords.length > 0
                          ? nowWords.map((w) => w.textUthmani)
                          : splitVerseIntoWords(highlightedTrack.text);
                      const nowHasWordAudio =
                        nowWords.length > 0 &&
                        nowWords.some((w) => w.audioUrl);
                      return (
                        <p
                          className="text-right text-3xl leading-snug text-foreground"
                          dir="rtl"
                        >
                          {nowHasWordAudio
                            ? nowVerseWords.map((word, i) => (
                                <span key={i}>
                                  {nowWords[i]?.audioUrl ? (
                                    <button
                                      type="button"
                                      className={`m-0 inline border-0 bg-transparent p-0 font-inherit leading-inherit transition-colors hover:opacity-80 ${playingWordKey === `${highlightedTrack.verseKey}-${nowWords[i].id}` ? "opacity-100 text-brand" : ""}`}
                                      onClick={() =>
                                        playWordAudio(
                                          nowWords[i].audioUrl,
                                          `${highlightedTrack.verseKey}-${nowWords[i].id}`,
                                        )
                                      }
                                      title="Play word audio"
                                      aria-label={`Play word audio: ${word}`}
                                    >
                                      {word}
                                    </button>
                                  ) : (
                                    <span>{word}</span>
                                  )}
                                  {i < nowVerseWords.length - 1
                                    ? "\u00A0"
                                    : null}
                                </span>
                              ))
                            : highlightedTrack.text}
                        </p>
                      );
                    })()
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
        <p className="mt-4 rounded-2xl border border-dashed border-foreground/15 p-3 text-sm md:p-4 text-foreground-muted">
          This selection does not have audio yet. Try another reciter or adjust the
          ayah range.
        </p>
      )}

    </section>
  );
};


