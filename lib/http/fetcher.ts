type FetchInit = RequestInit & { timeoutMs?: number };

const defaultHeaders: HeadersInit = {
  "Content-Type": "application/json",
};

export const jsonFetcher = async <TData>(
  input: string | URL,
  init: FetchInit = {},
): Promise<TData> => {
  const controller = new AbortController();
  const timeout = init.timeoutMs ?? 10_000;
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        ...defaultHeaders,
        ...init.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Request to ${input.toString()} failed (${response.status}): ${errorBody}`,
      );
    }

    return (await response.json()) as TData;
  } finally {
    clearTimeout(id);
  }
};

