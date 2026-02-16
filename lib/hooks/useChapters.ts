import useSWR from "swr";
import { jsonFetcher } from "@/lib/http/fetcher";
import type { ChapterSummary } from "@/lib/types/quran";

type ChaptersResponse = {
  chapters: ChapterSummary[];
};

export const useChapters = () => {
  const { data, error, isLoading, mutate } = useSWR<ChaptersResponse>(
    "/api/chapters",
    (url) => jsonFetcher<ChaptersResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  );

  return {
    chapters: data?.chapters ?? [],
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
};

