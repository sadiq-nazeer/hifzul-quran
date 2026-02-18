"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type CollectionItem = { id: string; name?: string; [key: string]: unknown };
type CollectionsData = { collections?: CollectionItem[]; [key: string]: unknown };

export default function CollectionsPage() {
  const [data, setData] = useState<CollectionsData | null>(null);
  const [status, setStatus] = useState<"loading" | "unauthenticated" | "success" | "error">("loading");

  const fetchCollections = useCallback(async () => {
    const res = await fetch("/api/user/collections", { credentials: "same-origin" });
    if (res.status === 401) {
      setStatus("unauthenticated");
      return;
    }
    if (!res.ok) {
      setStatus("error");
      return;
    }
    const json = (await res.json()) as CollectionsData;
    setData(json);
    setStatus("success");
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-12 pt-6">
        <p className="text-muted-foreground">Loading collections…</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-12 pt-6">
        <p className="text-muted-foreground">Sign in to view your collections.</p>
        <Link
          href="/api/auth/login"
          className="mt-4 inline-block text-brand underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto max-w-6xl px-6 pb-12 pt-6">
        <p className="text-muted-foreground">Unable to load collections.</p>
      </main>
    );
  }

  const collections = data?.collections ?? [];
  return (
    <main className="mx-auto max-w-6xl px-6 pb-12 pt-6">
      <h1 className="text-2xl font-semibold text-foreground">Collections</h1>
      {collections.length === 0 ? (
        <p className="mt-4 text-muted-foreground">No collections yet.</p>
      ) : (
        <ul className="mt-4 list-disc space-y-1 pl-6 text-foreground">
          {collections.map((c) => (
            <li key={c.id}>{c.name ?? c.id}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
