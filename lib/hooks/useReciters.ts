import useSWR from "swr";
import { jsonFetcher } from "@/lib/http/fetcher";
import type { ReciterProfile } from "@/lib/types/quran";

type RecitersResponse = {
  reciters: ReciterProfile[];
};

export const useReciters = () => {
  const { data, error, isLoading, mutate } = useSWR<RecitersResponse>(
    "/api/reciters",
    (url) => jsonFetcher<RecitersResponse>(url),
    {
      revalidateOnFocus: false,
      dedupingInterval: 86_400_000,
    },
  );

  return {
    reciters: data?.reciters ?? [],
    isLoading,
    isError: Boolean(error),
    error,
    mutate,
  };
};

