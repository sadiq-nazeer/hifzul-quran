import useSWR from "swr";
import { jsonFetcher } from "@/lib/http/fetcher";

export type ChapterAudioEntry = {
  verseKey: string;
  orderInChapter: number;
  text: string;
  audioUrl: string;
  durationSeconds: number;
};

type ChapterAudioResponse = {
  chapter: {
    id: number;
    nameSimple: string;
    versesCount: number;
  };
  playlist: ChapterAudioEntry[];
};

type Params = {
  chapterId?: number;
  reciterId?: number;
  enabled?: boolean;
};

export const useChapterAudioPlaylist = ({
  chapterId,
  reciterId,
  enabled = true,
}: Params) => {
  const shouldFetch = Boolean(chapterId) && enabled;

  const search = new URLSearchParams();
  if (chapterId) {
    search.set("chapterId", String(chapterId));
  }
  if (reciterId) {
    search.set("reciterId", String(reciterId));
  }

  const key = shouldFetch ? `/api/coach/chapter-audio?${search.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<ChapterAudioResponse>(
    key,
    (url) => jsonFetcher<ChapterAudioResponse>(url),
    { revalidateOnFocus: false },
  );

  return {
    playlist: data?.playlist ?? [],
    chapterMeta: data?.chapter,
    isLoading: shouldFetch ? isLoading : false,
    isError: Boolean(error),
    error,
    mutate,
  };
};


