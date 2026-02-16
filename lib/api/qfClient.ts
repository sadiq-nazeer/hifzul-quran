import "server-only";

import { appConfig } from "@/lib/config";
import type {
  ChapterSummary,
  CoachSessionVerse,
  ReciterProfile,
  TafsirSnippet,
  TranslationSnippet,
  VerseAudio,
  VerseText,
} from "@/lib/types/quran";

type ClientCredentialsTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type TokenCache = {
  value: string;
  expiresAt: number;
};

type FetchOptions = {
  query?: Record<string, string | number | undefined>;
  revalidateSeconds?: number;
  tags?: string[];
  cache?: RequestCache;
};

type RawChapter = {
  id: number;
  name_arabic: string;
  name_simple: string;
  name_complex: string;
  revelation_place: "meccan" | "medinan";
  verses_count: number;
  pages?: [number, number];
};

type RawTranslation = {
  resource_id: number;
  resource_name: string;
  language_name: string;
  text: string;
  verse_key: string;
};

type RawTafsir = {
  resource_id: number;
  resource_name: string;
  text: string;
  verse_key: string;
};

type RawVerse = {
  id: number;
  verse_key: string;
  hizb_number?: number;
  juz_number?: number;
  page_number?: number;
  verse_number?: number;
  text_uthmani: string;
  text_uthmani_hafs?: string;
  text_uthmani_simple?: string;
  text_imlaei?: string;
  text_imlaei_simple?: string;
  text_simple?: string;
  text_indopak?: string;
  translations?: RawTranslation[];
  tafsirs?: RawTafsir[];
};

type RawAudioPayload = {
  url?: string;
  audio_url?: string;
  duration?: number;
  duration_seconds?: number;
  audio_duration?: number;
  format?: string;
  audio_format?: string;
  segments?: Array<[number, number]> | number[][];
};

type RawVerseAudio = {
  verse_key: string;
  reciter_id?: number;
  recitation_id?: number;
  recitation?: RawAudioPayload;
  audio_file?: RawAudioPayload;
  audio_files?: RawAudioPayload[];
  audio?: RawAudioPayload;
  audio_url?: string;
  url?: string;
  duration?: number;
  duration_seconds?: number;
  audio_duration?: number;
  format?: string;
  audio_format?: string;
  segments?: Array<[number, number]> | number[][];
};

type VerseCollectionResponse = {
  verses: RawVerse[];
  pagination: {
    per_page: number;
    current_page: number;
    total_pages: number;
  };
};

type ChapterResponse = {
  chapters: RawChapter[];
};

type CoachBundleParams = {
  chapterId: number;
  fromVerse?: number;
  toVerse?: number;
  perPage?: number;
  translationId?: number;
  tafsirId?: number;
  reciterId?: number;
};

const normalizedBaseUrl = appConfig.contentApiBaseUrl.replace(/\/+$/, "");

let tokenCache: TokenCache | null = null;

const buildUrl = (
  path: string,
  query?: Record<string, string | number | undefined>,
) => {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(`${normalizedBaseUrl}/${cleanPath}`);
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }
  return url;
};

const fetchAccessToken = async (): Promise<string> => {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.value;
  }

  // Use HTTP Basic Authentication as per API documentation
  const auth = Buffer.from(`${appConfig.clientId}:${appConfig.clientSecret}`).toString("base64");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "content",
  });

  const response = await fetch(appConfig.oauthTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Failed to fetch Quran.Foundation token: ${response.status} ${response.statusText} – ${errorBody}`,
    );
  }

  const payload = (await response.json()) as ClientCredentialsTokenResponse;
  const expiresAt = Date.now() + (payload.expires_in - 60) * 1000;
  tokenCache = {
    value: payload.access_token,
    expiresAt,
  };

  return tokenCache.value;
};

const qfFetch = async <TResponse>(
  path: string,
  {
    query,
    revalidateSeconds = 3600,
    tags,
    cache = "force-cache",
  }: FetchOptions = {},
): Promise<TResponse> => {
  try {
    const token = await fetchAccessToken();
    const url = buildUrl(path, query);

    console.log(`[qfFetch] Requesting: ${url.toString()}`);

    const response = await fetch(url, {
      method: "GET",
      cache,
      headers: {
        "x-auth-token": token,
        "x-client-id": appConfig.clientId,
        Accept: "application/json",
      },
      next: {
        revalidate: revalidateSeconds,
        tags,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        `[qfFetch] Request failed: ${url.toString()}`,
        `Status: ${response.status} ${response.statusText}`,
        `Body: ${errorBody}`,
      );
      throw new Error(
        `Quran.Foundation request failed (${response.status} ${response.statusText}): ${errorBody}`,
      );
    }

    return (await response.json()) as TResponse;
  } catch (error) {
    console.error(`[qfFetch] Error for path: ${path}`, error);
    throw error;
  }
};

const isNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("404") || message.includes("not found");
};

const mapChapter = (raw: RawChapter): ChapterSummary => ({
  id: raw.id,
  nameArabic: raw.name_arabic,
  nameSimple: raw.name_simple,
  nameComplex: raw.name_complex,
  revelationPlace: raw.revelation_place,
  versesCount: raw.verses_count,
  pageNumber: raw.pages?.[0] ?? 1,
});

const sanitizeTranslationText = (input?: string): string | undefined => {
  if (!input) {
    return input;
  }

  const withFootnotes = input.replace(/<sup[^>]*>(.*?)<\/sup>/gi, (_match, inner) => {
    const content = typeof inner === "string" ? inner.trim() : "";
    return content ? ` (${content})` : "";
  });

  const withoutTags = withFootnotes.replace(/<\/?[^>]+>/gi, "");

  const normalized = withoutTags.replace(/\s+/g, " ").trim();
  return normalized;
};

const mapTranslation = (
  raw?: RawTranslation,
): TranslationSnippet | undefined => {
  if (!raw) {
    return undefined;
  }
  return {
    id: raw.resource_id,
    verseKey: raw.verse_key,
    text: sanitizeTranslationText(raw.text) ?? raw.text ?? "",
    languageName: raw.language_name,
    resourceName: raw.resource_name,
  };
};

const mapTafsir = (raw?: RawTafsir): TafsirSnippet | undefined => {
  if (!raw) {
    return undefined;
  }
  return {
    id: raw.resource_id,
    verseKey: raw.verse_key,
    text: raw.text,
    resourceName: raw.resource_name,
  };
};

const pickText = (...candidates: Array<string | undefined>): string | undefined => {
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return undefined;
};

const mapVerse = (raw: RawVerse): VerseText => ({
  id: raw.id,
  verseKey: raw.verse_key,
  hizbNumber: raw.hizb_number,
  juzNumber: raw.juz_number,
  pageNumber: raw.page_number,
  textUthmani:
    pickText(
      raw.text_uthmani,
      raw.text_uthmani_hafs,
      raw.text_uthmani_simple,
      raw.text_imlaei,
      raw.text_imlaei_simple,
      raw.text_indopak,
      raw.text_simple,
    ) ?? "",
  textIndopak: pickText(raw.text_indopak, raw.text_simple),
  textImlaeiSimple: pickText(raw.text_imlaei_simple, raw.text_imlaei, raw.text_simple),
});

const coerceSegments = (
  segments?: Array<[number, number]> | number[][],
): Array<[number, number]> | undefined => {
  if (!segments) {
    return undefined;
  }

  const normalized: Array<[number, number]> = [];
  segments.forEach((segment) => {
    if (!Array.isArray(segment) || segment.length < 2) {
      return;
    }
    const [start, end] = segment;
    if (typeof start !== "number" || typeof end !== "number") {
      return;
    }
    normalized.push([start, end]);
  });

  return normalized.length ? normalized : undefined;
};

const pickAudioSource = (raw: RawVerseAudio): RawAudioPayload | undefined => {
  const sources: Array<RawAudioPayload | undefined> = [
    raw.recitation,
    raw.audio_file,
    raw.audio,
    raw.audio_files?.[0],
  ];

  if (raw.audio_url || raw.url) {
    sources.push({
      audio_url: raw.audio_url ?? raw.url,
      duration: raw.duration ?? raw.duration_seconds ?? raw.audio_duration,
      format: raw.format ?? raw.audio_format,
      segments: raw.segments,
    });
  }

  return sources.find(
    (candidate) => (candidate?.audio_url ?? candidate?.url) !== undefined,
  );
};

const pickDuration = (...candidates: Array<number | undefined>): number => {
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
  }
  return 0;
};

const normalizeAudioUrl = (rawUrl: string): string => {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const base = "https://verses.quran.com";
  if (trimmed.startsWith("/")) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
};

const mapAudio = (raw?: RawVerseAudio): VerseAudio | undefined => {
  if (!raw) {
    return undefined;
  }

  const source = pickAudioSource(raw);
  if (!source) {
    return undefined;
  }

  const url = source.audio_url ?? source.url;
  if (!url) {
    return undefined;
  }

  return {
    verseKey: raw.verse_key,
    reciterId: raw.reciter_id ?? raw.recitation_id ?? 0,
    audio: {
      url: normalizeAudioUrl(url),
      durationSeconds: pickDuration(
        source.duration,
        source.duration_seconds,
        source.audio_duration,
      ),
      format: source.format ?? source.audio_format ?? "mp3",
      segments: coerceSegments(source.segments ?? raw.segments),
    },
  };
};

const fetchTranslationsByVerseKeys = async (
  verseKeys: string[],
  translationId: number,
): Promise<Map<string, RawTranslation>> => {
  const uniqueKeys = Array.from(new Set(verseKeys));
  if (uniqueKeys.length === 0) {
    return new Map();
  }

  const map = new Map<string, RawTranslation>();

  const fetchFromPrimary = async (verseKey: string): Promise<boolean> => {
    const response = await qfFetch<{ translations: RawTranslation[] }>(
      `/quran/translations/${translationId}`,
      {
        query: { verse_key: verseKey },
        cache: "no-store",
      },
    );

    let inserted = false;
    response.translations.forEach((translation) => {
      const key = translation.verse_key ?? verseKey;
      if (key) {
        map.set(key, { ...translation, verse_key: key });
        inserted = true;
      }
    });

    if (!inserted) {
      console.warn(
        `[fetchTranslationsByVerseKeys] Primary response for translationId=${translationId}, verse ${verseKey} was empty. Payload:`,
        response,
      );
    }

    return inserted;
  };

  const fetchFromLegacy = async (verseKey: string): Promise<boolean> => {
    const url = new URL(
      `https://api.quran.com/api/v4/quran/translations/${translationId}`,
    );
    url.searchParams.set("verse_key", verseKey);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `Legacy translation fetch failed (${response.status} ${response.statusText})`,
      );
    }

    const payload = (await response.json()) as {
      translations: RawTranslation[];
    };

    let inserted = false;
    payload.translations.forEach((translation) => {
      const key = translation.verse_key ?? verseKey;
      if (key) {
        map.set(key, { ...translation, verse_key: key });
        inserted = true;
      }
    });

    if (!inserted) {
      console.warn(
        `[fetchTranslationsByVerseKeys] Legacy response for translationId=${translationId}, verse ${verseKey} was empty. Payload:`,
        payload,
      );
    }

    return inserted;
  };

  await Promise.all(
    uniqueKeys.map(async (verseKey) => {
      let inserted = false;
      try {
        inserted = await fetchFromPrimary(verseKey);
      } catch (error) {
        console.warn(
          `[fetchTranslationsByVerseKeys] Primary API missing translation ${translationId} for verse ${verseKey}. Trying legacy endpoint.`,
          error,
        );
      }

      if (inserted) {
        return;
      }

      console.warn(
        `[fetchTranslationsByVerseKeys] Primary API returned an empty translation payload for translationId=${translationId}, verse ${verseKey}. Falling back to legacy endpoint.`,
      );

      try {
        const legacyInserted = await fetchFromLegacy(verseKey);
        if (!legacyInserted) {
          console.warn(
            `[fetchTranslationsByVerseKeys] Legacy API returned no translation for translationId=${translationId}, verse ${verseKey}`,
          );
        }
      } catch (legacyError) {
        console.warn(
          `[fetchTranslationsByVerseKeys] Legacy API also failed for translation ${translationId} verse ${verseKey}`,
          legacyError,
        );
      }
    }),
  );

  return map;
};

export const qfApi = {
  listChapters: async (): Promise<ChapterSummary[]> => {
    const data = await qfFetch<ChapterResponse>("/chapters", {
      query: { language: "en" },
      tags: ["chapters"],
      revalidateSeconds: 86400,
    });
    return data.chapters.map(mapChapter);
  },

  listVersesByChapter: async ({
    chapterId,
    perPage = 5,
    page = 1,
    translationId,
    tafsirId,
  }: {
    chapterId: number;
    perPage?: number;
    page?: number;
    translationId?: number;
    tafsirId?: number;
  }): Promise<{ verses: CoachSessionVerse[]; totalPages: number }> => {
    const textFieldRequest =
      "text_uthmani,text_uthmani_hafs,text_uthmani_simple,text_imlaei,text_imlaei_simple,text_indopak,text_simple";
    const translationFieldRequest = "text,resource_name,language_name,language_id";
    const tafsirFieldRequest = "text,resource_name";

    const normalizedPerPage = Math.max(perPage, 1);
    const normalizedPage = Math.max(page, 1);

    const baseQuery: Record<string, string | number | undefined> = {
      per_page: normalizedPerPage,
      page: normalizedPage,
      fields: textFieldRequest,
    };

    if (translationId !== undefined) {
      baseQuery.translations = translationId;
      baseQuery.translation_fields = translationFieldRequest;
    }
    if (tafsirId !== undefined) {
      baseQuery.tafsirs = tafsirId;
      baseQuery.tafsir_fields = tafsirFieldRequest;
    }

    const fallbackQuery = {
      ...baseQuery,
      chapter_id: chapterId,
      fields: textFieldRequest,
    };

    const fetchVerses = async (
      path: string,
      query: Record<string, string | number | undefined>,
    ) =>
      qfFetch<VerseCollectionResponse>(path, {
        query,
        tags: [`chapter-${chapterId}-verses-page-${normalizedPage}`],
        revalidateSeconds: 900,
      });

    let data: VerseCollectionResponse;

    try {
      console.log(
        `Fetching verses from: ${buildUrl(
          `/verses/by_chapter/${chapterId}`,
          baseQuery,
        )}`,
      );
      data = await fetchVerses(`/verses/by_chapter/${chapterId}`, baseQuery);
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
      console.warn(
        `[listVersesByChapter] /verses/by_chapter route unavailable, falling back to legacy /verses query.`,
        error,
      );
      console.log(
        `Fetching verses from: ${buildUrl("/verses", fallbackQuery)}`,
      );
      data = await fetchVerses("/verses", fallbackQuery);
    }

    const verses = data.verses.map((verse) => {
      // Extract verse number from verse_key (format: "chapter:verse") as fallback
      let orderInChapter = verse.verse_number;
      if (!orderInChapter && verse.verse_key) {
        const parts = verse.verse_key.split(":");
        if (parts.length === 2) {
          const parsed = Number.parseInt(parts[1], 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            orderInChapter = parsed;
          }
        }
      }
      // If still no verse number, default to 0 (will be filtered out if range doesn't include 0)
      orderInChapter = orderInChapter ?? 0;

      return {
        verse: mapVerse(verse),
        translation: mapTranslation(verse.translations?.[0]),
        tafsir: mapTafsir(verse.tafsirs?.[0]),
        chapterId,
        orderInChapter,
      };
    });

    return {
      verses,
      totalPages: data.pagination.total_pages,
    };
  },

  getVerseAudio: async ({
    verseKey,
    reciterId = appConfig.defaultAudioReciterId,
  }: {
    verseKey: string;
    reciterId?: number;
  }): Promise<VerseAudio | undefined> => {
    const targetReciter = reciterId ?? appConfig.defaultAudioReciterId;

    try {
      const data = await qfFetch<{ audio_files?: RawVerseAudio[] }>(
        `/recitations/${targetReciter}/by_ayah/${verseKey}`,
        {
          query: { segments: "true" },
          cache: "no-store",
        },
      );

      if (!data.audio_files || data.audio_files.length === 0) {
        console.warn(
          `[getVerseAudio] No audio payload returned for verse ${verseKey} with reciter ${targetReciter}.`,
        );
        return undefined;
      }

      const mapped = mapAudio(data.audio_files[0]);
      if (!mapped) {
        console.warn(
          `[getVerseAudio] Unable to normalize audio payload for verse ${verseKey} with reciter ${targetReciter}.`,
        );
        return undefined;
      }

      return {
        ...mapped,
        reciterId: targetReciter,
      };
    } catch (error) {
      if (isNotFoundError(error)) {
        console.warn(
          `Audio unavailable for verse ${verseKey} with reciter ${targetReciter}:`,
          error,
        );
        return undefined;
      }
      throw error;
    }
  },

  listReciters: async (): Promise<ReciterProfile[]> => {
    const data = await qfFetch<{
      recitations?: Array<{ id: number; translated_name?: { name: string }; style?: string }>;
      reciters?: Array<{ id: number; translated_name?: { name: string }; style?: string }>;
    }>("/resources/recitations", {
      revalidateSeconds: 86400,
      tags: ["reciters"],
    });

    const reciters = data.recitations ?? data.reciters;

    if (!reciters) {
      throw new Error(
        "Quran.Foundation recitations response did not include a reciter list.",
      );
    }

    return reciters.map((reciter) => ({
      id: reciter.id,
      name: reciter.translated_name?.name ?? `Reciter ${reciter.id}`,
      style: reciter.style ?? "murattal",
    }));
  },

  buildCoachBundle: async (
    params: CoachBundleParams,
  ): Promise<CoachSessionVerse[]> => {
    try {
      const {
        chapterId,
        fromVerse = 1,
        toVerse,
        translationId,
        tafsirId,
        reciterId,
      } = params;
      const perPage = Math.max(params.perPage ?? 5, 1);
      const safeFrom = Math.max(fromVerse, 1);
      const safeTo = Math.max(toVerse ?? safeFrom + perPage - 1, safeFrom);
      const startPage = Math.ceil(safeFrom / perPage);
      const endPage = Math.max(startPage, Math.ceil(safeTo / perPage));

      const pageNumbers = Array.from(
        { length: endPage - startPage + 1 },
        (_, offset) => startPage + offset,
      );

      console.log(
        `Building coach bundle: chapterId=${chapterId}, fromVerse=${safeFrom}, toVerse=${safeTo}, pages=${pageNumbers.join(",")}`,
      );

      const pages = await Promise.all(
        pageNumbers.map(async (pageNumber) => {
          try {
            return await qfApi.listVersesByChapter({
              chapterId,
              perPage,
              page: pageNumber,
              translationId,
              tafsirId,
            });
          } catch (error) {
            console.error(
              `Failed to fetch verses for chapter ${chapterId}, page ${pageNumber}:`,
              error,
            );
            throw new Error(
              `Failed to fetch verses for chapter ${chapterId}, page ${pageNumber}: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
          }
        }),
      );

      let combined = pages.flatMap((page) => page.verses);

      if (translationId !== undefined) {
        const missingTranslationKeys = combined
          .filter((entry) => !entry.translation)
          .map((entry) => entry.verse.verseKey);

        if (missingTranslationKeys.length > 0) {
          try {
            const translationMap = await fetchTranslationsByVerseKeys(
              missingTranslationKeys,
              translationId,
            );
            combined = combined.map((entry) => {
              if (entry.translation) {
                return entry;
              }
              const fallback = translationMap.get(entry.verse.verseKey);
              if (!fallback) {
                return entry;
              }
              return {
                ...entry,
                translation: mapTranslation(fallback),
              };
            });
          } catch (error) {
            console.warn(
              `[buildCoachBundle] Failed to backfill translations for translationId=${translationId}`,
              error,
            );
          }
        }
      }
      console.log(
        `Fetched ${combined.length} verses, filtering to range ${safeFrom}-${safeTo}`,
      );

      const filtered = combined
        .filter((entry) => entry.orderInChapter >= safeFrom && entry.orderInChapter <= safeTo)
        .sort((a, b) => a.orderInChapter - b.orderInChapter);

      console.log(`After filtering: ${filtered.length} verses`);

      if (filtered.length === 0) {
        console.warn(
          `No verses found in range ${safeFrom}-${safeTo} for chapter ${chapterId}. Combined verses: ${combined.length}, orderInChapter values: ${combined.map((v) => v.orderInChapter).join(",")}`,
        );
      }

      const enriched = await Promise.all(
        filtered.map(async (entry) => {
          let audio: VerseAudio | undefined;
          try {
            audio = await qfApi.getVerseAudio({
              verseKey: entry.verse.verseKey,
              reciterId,
            });
          } catch (error) {
            // Audio is optional, log but don't fail the entire bundle
            console.warn(
              `Failed to fetch audio for verse ${entry.verse.verseKey}:`,
              error instanceof Error ? error.message : error,
            );
          }
          return {
            ...entry,
            audio,
          };
        }),
      );

      return enriched;
    } catch (error) {
      console.error("Error in buildCoachBundle:", error);
      throw error;
    }
  },
};

