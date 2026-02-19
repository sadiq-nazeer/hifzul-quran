"use client";

import { Minus, Palette, Plus, Type } from "lucide-react";
import { Fragment, startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  getSurahTextColorOption,
  SURAH_TEXT_COLOR_OPTIONS,
  type SurahTextColorId,
} from "@/components/quran/surahTextColors";
import type { CoachSessionVerse } from "@/lib/types/quran";

/** Split Uthmani Arabic verse into words (space-separated). */
function splitVerseIntoWords(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  return text.trim().split(/\s+/).filter(Boolean);
}

const ARABIC_NUMERALS = "٠١٢٣٤٥٦٧٨٩";

const toArabicNumerals = (n: number): string =>
  String(n)
    .split("")
    .map((d) => ARABIC_NUMERALS[Number.parseInt(d, 10)] ?? d)
    .join("");

/** Full surah paragraph text size: index → Tailwind text/leading classes. */
const FULL_SURAH_TEXT_SIZES = [
  "text-base leading-relaxed md:text-lg md:leading-loose lg:text-xl",
  "text-xl leading-relaxed md:text-2xl md:leading-loose lg:text-3xl",
  "text-2xl leading-relaxed md:text-3xl md:leading-loose lg:text-4xl",
  "text-3xl leading-relaxed md:text-4xl md:leading-loose lg:text-5xl",
] as const;
const FULL_SURAH_TEXT_SIZE_MIN = 0;
const FULL_SURAH_TEXT_SIZE_MAX = FULL_SURAH_TEXT_SIZES.length - 1;

/** Single word entry when assembling text from verses only (no full-text Quran). */
type VerseWordEntry = {
  word: string;
  verseKey: string;
  orderInChapter: number;
  audioUrl?: string;
  wordId?: number;
};

type FullSurahTextProps = {
  verses: CoachSessionVerse[];
  /** Currently highlighted verse key (optional, for audio sync) */
  highlightedVerseKey?: string;
  /** Number of verses per page (used when wordsPerPage is not set) */
  versesPerPage?: number;
  /** Optional: number of words per page; when set, pagination is by word count instead of verse count */
  wordsPerPage?: number;
  /** Default text size index (0-3) */
  defaultTextSize?: number;
  /** Default text color */
  defaultTextColor?: SurahTextColorId;
  /** Default highlight (current ayah) text color */
  defaultHighlightColor?: SurahTextColorId;
  className?: string;
};

export function FullSurahText({
  verses,
  highlightedVerseKey,
  versesPerPage = 10,
  wordsPerPage: wordsPerPageProp,
  defaultTextSize = 1,
  defaultTextColor = "foreground",
  defaultHighlightColor = "brand",
  className = "",
}: FullSurahTextProps) {
  const wordsPerPage = wordsPerPageProp ?? 0;
  const useWordsPerPage = wordsPerPage > 0;
  const [textSizeIndex, setTextSizeIndex] = useState(defaultTextSize);
  const [textColor, setTextColor] = useState<SurahTextColorId>(defaultTextColor);
  const [highlightColor, setHighlightColor] = useState<SurahTextColorId>(defaultHighlightColor);
  const [currentPage, setCurrentPage] = useState(0);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [playingWordKey, setPlayingWordKey] = useState<string | null>(null);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const prevInitialPageRef = useRef<number>(-1);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Sort verses by orderInChapter to ensure correct display order
  const sortedVerses = useMemo(
    () => [...verses].sort((a, b) => a.orderInChapter - b.orderInChapter),
    [verses],
  );

  // Assemble full text from each verse only (no full-text Quran): flatten into word entries
  const allWordEntries = useMemo((): VerseWordEntry[] => {
    const entries: VerseWordEntry[] = [];
    for (const cv of sortedVerses) {
      const v = cv.verse;
      const apiWords =
        v.words?.filter(
          (w) =>
            w.charTypeName !== "end" && w.textUthmani.trim().length > 0,
        ) ?? [];
      const wordTexts =
        apiWords.length > 0
          ? apiWords.map((w) => w.textUthmani)
          : splitVerseIntoWords(v.textUthmani);
      for (let i = 0; i < wordTexts.length; i++) {
        entries.push({
          word: wordTexts[i],
          verseKey: v.verseKey,
          orderInChapter: cv.orderInChapter,
          audioUrl: apiWords[i]?.audioUrl,
          wordId: apiWords[i]?.id,
        });
      }
    }
    return entries;
  }, [sortedVerses]);

  const totalPages = useMemo(() => {
    if (useWordsPerPage) {
      return Math.max(1, Math.ceil(allWordEntries.length / wordsPerPage));
    }
    return Math.max(1, Math.ceil(sortedVerses.length / versesPerPage));
  }, [useWordsPerPage, allWordEntries.length, wordsPerPage, sortedVerses.length, versesPerPage]);

  const safePage = Math.min(currentPage, Math.max(0, totalPages - 1));

  const pageVerses = useMemo(
    () =>
      sortedVerses.slice(
        safePage * versesPerPage,
        (safePage + 1) * versesPerPage,
      ),
    [sortedVerses, safePage, versesPerPage],
  );

  const pageWordEntries = useMemo(
    () =>
      useWordsPerPage
        ? allWordEntries.slice(
            safePage * wordsPerPage,
            (safePage + 1) * wordsPerPage,
          )
        : [],
    [useWordsPerPage, allWordEntries, safePage, wordsPerPage],
  );

  // Reset page when verses change - derive initial page from verses or word index
  const versesKey = sortedVerses.map((v) => v.verse.verseKey).join(",");
  const initialPage = useMemo(() => {
    if (!highlightedVerseKey || sortedVerses.length === 0) return 0;
    if (useWordsPerPage) {
      const wordIndex = allWordEntries.findIndex(
        (e) => e.verseKey === highlightedVerseKey,
      );
      return wordIndex >= 0 ? Math.floor(wordIndex / wordsPerPage) : 0;
    }
    const verseIndex = sortedVerses.findIndex(
      (v) => v.verse.verseKey === highlightedVerseKey,
    );
    return verseIndex >= 0 ? Math.floor(verseIndex / versesPerPage) : 0;
  }, [
    sortedVerses,
    highlightedVerseKey,
    versesPerPage,
    useWordsPerPage,
    allWordEntries,
    wordsPerPage,
  ]);

  // Update page when highlighted verse changes
  useEffect(() => {
    if (initialPage !== prevInitialPageRef.current && initialPage >= 0) {
      // Intentional: sync pagination with highlighted verse
      prevInitialPageRef.current = initialPage;
      startTransition(() => {
        setCurrentPage(initialPage);
      });
    }
  }, [initialPage]);

  // Reset to first page when verses change (different surah)
  useEffect(() => {
    // Intentional: reset pagination when surah changes
    startTransition(() => {
      setCurrentPage(0);
    });
  }, [versesKey]);

  // Close color dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorDropdownRef.current &&
        !colorDropdownRef.current.contains(event.target as Node)
      ) {
        setColorDropdownOpen(false);
      }
    };
    if (colorDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [colorDropdownOpen]);

  if (sortedVerses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-surface-muted/30 p-8 text-center">
        <p className="text-sm text-foreground-muted">No verses to display</p>
      </div>
    );
  }

  const selectedTextOption = getSurahTextColorOption(textColor);
  const selectedHighlightOption = getSurahTextColorOption(highlightColor);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Surah info and controls on one row: info left, text size + color picker right */}
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground-muted shrink-0">
          Full Surah • {sortedVerses.length} ayats
          {useWordsPerPage
            ? ` • ${allWordEntries.length} words`
            : ""}
        </p>
        <div className="flex flex-nowrap items-center gap-2 shrink-0">
        <div className="flex items-center rounded-lg border border-white/10 bg-white/5">
          <span
            className="flex items-center rounded-l-lg border-r border-white/10 p-1.5 text-foreground-muted"
            aria-hidden
          >
            <Type className="h-4 w-4 shrink-0" aria-label="Text size" />
          </span>
          <button
            type="button"
            disabled={textSizeIndex <= FULL_SURAH_TEXT_SIZE_MIN}
            className="p-1.5 text-foreground transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() =>
              setTextSizeIndex((i) =>
                Math.max(FULL_SURAH_TEXT_SIZE_MIN, i - 1)
              )
            }
            aria-label="Decrease text size"
          >
            <Minus className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            disabled={textSizeIndex >= FULL_SURAH_TEXT_SIZE_MAX}
            className="border-l border-white/10 rounded-r-lg p-1.5 text-foreground transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() =>
              setTextSizeIndex((i) =>
                Math.min(FULL_SURAH_TEXT_SIZE_MAX, i + 1)
              )
            }
            aria-label="Increase text size"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="relative" ref={colorDropdownRef}>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-1.5 text-foreground transition hover:bg-white/10"
              onClick={() => setColorDropdownOpen((open) => !open)}
              aria-expanded={colorDropdownOpen}
              aria-haspopup="listbox"
              aria-label={`Text and highlight color: ${selectedTextOption.label} / ${selectedHighlightOption.label}`}
            >
              <Palette className="h-4 w-4 shrink-0 text-foreground-muted" aria-hidden />
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-white/20 ${selectedTextOption.swatchClass}`}
                aria-hidden
              />
              <span
                className={`h-3.5 w-3.5 shrink-0 rounded-sm border border-white/20 ${selectedHighlightOption.swatchClass}`}
                aria-hidden
              />
            </button>
            {colorDropdownOpen && (
              <div
                className="absolute right-0 top-full z-10 mt-1 min-w-[16rem] grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-surface-raised py-2 px-2 shadow-lg"
                role="dialog"
                aria-label="Text and highlight color options"
              >
                <div>
                  <p className="mb-1 px-2 text-xs font-semibold text-foreground-muted">Text color</p>
                  <ul className="space-y-0.5" role="listbox" aria-label="Text color options">
                    {SURAH_TEXT_COLOR_OPTIONS.map((opt) => (
                      <li key={opt.id} role="option" aria-selected={textColor === opt.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-foreground transition hover:bg-white/10"
                          onClick={() => setTextColor(opt.id)}
                        >
                          <span className={`h-4 w-4 shrink-0 rounded border border-white/20 ${opt.swatchClass}`} aria-hidden />
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 px-2 text-xs font-semibold text-foreground-muted">Highlight color</p>
                  <ul className="space-y-0.5" role="listbox" aria-label="Highlight color options">
                    {SURAH_TEXT_COLOR_OPTIONS.map((opt) => (
                      <li key={opt.id} role="option" aria-selected={highlightColor === opt.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium text-foreground transition hover:bg-white/10"
                          onClick={() => setHighlightColor(opt.id)}
                        >
                          <span className={`h-4 w-4 shrink-0 rounded border border-white/20 ${opt.swatchClass}`} aria-hidden />
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text display: assembled from each verse only (no full-text Quran) */}
      <div className="rounded-xl border border-white/10 bg-surface-muted/30 p-2 sm:p-3 md:p-4">
        <div
          className={`surah-paragraph text-center ${FULL_SURAH_TEXT_SIZES[textSizeIndex]}`}
          dir="rtl"
        >
          {useWordsPerPage ? (
            // Word-based pages: render word entries with verse number markers at verse boundaries
            pageWordEntries.length > 0 ? (
              <>
                {pageWordEntries.map((entry, i) => {
                  const isHighlighted = entry.verseKey === highlightedVerseKey;
                  const prevEntry = pageWordEntries[i - 1];
                  const showVerseMarker =
                    !prevEntry || prevEntry.verseKey !== entry.verseKey;
                  const wordKey =
                    entry.wordId != null
                      ? `${entry.verseKey}-${entry.wordId}`
                      : `${entry.verseKey}-${i}`;
                  const baseClassName = isHighlighted
                    ? selectedHighlightOption.textClass
                    : selectedTextOption.textClass;
                  return (
                    <Fragment key={`${entry.verseKey}-${i}`}>
                      {showVerseMarker && prevEntry != null ? (
                        <span
                          className="verse-number-marker verse-number-marker--circle"
                          aria-label={`Ayah ${toArabicNumerals(prevEntry.orderInChapter)}`}
                        >
                          {toArabicNumerals(prevEntry.orderInChapter)}
                        </span>
                      ) : null}
                      {showVerseMarker && prevEntry != null ? " " : null}
                      <span className={baseClassName}>
                        {entry.audioUrl ? (
                          <button
                            type="button"
                            className={`m-0 inline border-0 bg-transparent p-0 font-inherit leading-inherit transition-colors hover:opacity-80 ${playingWordKey === wordKey ? "opacity-100 text-brand" : ""}`}
                            onClick={() =>
                              playWordAudio(entry.audioUrl, wordKey)
                            }
                            title="Play word audio"
                            aria-label={`Play word audio: ${entry.word}`}
                          >
                            {entry.word}
                          </button>
                        ) : (
                          <span>{entry.word}</span>
                        )}
                      </span>
                      {i < pageWordEntries.length - 1 ? "\u00A0" : null}
                    </Fragment>
                  );
                })}
                {pageWordEntries.length > 0 ? (
                  <>
                    <span
                      className="verse-number-marker verse-number-marker--circle"
                      aria-label={`Ayah ${toArabicNumerals(pageWordEntries[pageWordEntries.length - 1].orderInChapter)}`}
                    >
                      {toArabicNumerals(
                        pageWordEntries[pageWordEntries.length - 1]
                          .orderInChapter,
                      )}
                    </span>
                  </>
                ) : null}
              </>
            ) : null
          ) : (
            // Verse-based pages: render verses assembled from each verse's words/text only
            pageVerses.map((verse) => {
              const isHighlighted = verse.verse.verseKey === highlightedVerseKey;
              const apiWords =
                verse.verse.words?.filter(
                  (word) =>
                    word.charTypeName !== "end" &&
                    word.textUthmani.trim().length > 0,
                ) ?? [];
              const verseWords =
                apiWords.length > 0
                  ? apiWords.map((w) => w.textUthmani)
                  : splitVerseIntoWords(verse.verse.textUthmani);
              const baseClassName = isHighlighted
                ? selectedHighlightOption.textClass
                : selectedTextOption.textClass;
              return (
                <Fragment key={verse.verse.verseKey}>
                  <span className={baseClassName}>
                    {verseWords.length > 0
                      ? verseWords.map((word, i) => (
                          <span key={i}>
                            {apiWords[i]?.audioUrl ? (
                              <button
                                type="button"
                                className={`m-0 inline border-0 bg-transparent p-0 font-inherit leading-inherit transition-colors hover:opacity-80 ${playingWordKey === `${verse.verse.verseKey}-${apiWords[i].id}` ? "opacity-100 text-brand" : ""}`}
                                onClick={() =>
                                  playWordAudio(
                                    apiWords[i].audioUrl,
                                    `${verse.verse.verseKey}-${apiWords[i].id}`,
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
                      : verse.verse.textUthmani}
                  </span>
                  <span
                    className="verse-number-marker verse-number-marker--circle"
                    aria-label={`Ayah ${verse.orderInChapter}`}
                  >
                    {toArabicNumerals(verse.orderInChapter)}
                  </span>
                  {" "}
                </Fragment>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={safePage <= 0}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
          onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </button>
        <span className="text-xs tabular-nums text-foreground-muted">
          Page {safePage + 1} of {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages - 1}
          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-foreground transition hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5"
          onClick={() =>
            setCurrentPage((p) => Math.min(totalPages - 1, p + 1))
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}
