import { NextResponse } from "next/server";
import { qfApi } from "@/lib/api/qfClient";

export const runtime = "nodejs";

const toPositiveNumber = (value: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chapterId = Number(searchParams.get("chapterId"));
  const reciterId = toPositiveNumber(searchParams.get("reciterId"));

  if (!Number.isFinite(chapterId) || chapterId <= 0) {
    return NextResponse.json(
      { error: "chapterId must be a positive integer" },
      { status: 400 },
    );
  }

  try {
    const chapters = await qfApi.listChapters();
    const chapter = chapters.find((entry) => entry.id === chapterId);

    if (!chapter) {
      return NextResponse.json(
        { error: `Chapter ${chapterId} not found` },
        { status: 404 },
      );
    }

    const verses = await qfApi.buildCoachBundle({
      chapterId,
      fromVerse: 1,
      toVerse: chapter.versesCount,
      perPage: 50,
      reciterId,
    });

    const playlist = verses
      .filter((entry) => entry.audio?.audio.url)
      .map((entry) => ({
        verseKey: entry.verse.verseKey,
        orderInChapter: entry.orderInChapter,
        text: entry.verse.textUthmani,
        audioUrl: entry.audio?.audio.url ?? "",
        durationSeconds: entry.audio?.audio.durationSeconds ?? 0,
      }));

    if (!playlist.length) {
      return NextResponse.json(
        {
          error: "No playable audio segments were returned for this chapter.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      chapter: {
        id: chapter.id,
        nameSimple: chapter.nameSimple,
        versesCount: chapter.versesCount,
      },
      playlist,
    });
  } catch (error) {
    console.error("Failed to assemble chapter audio playlist", error);
    return NextResponse.json(
      { error: "Unable to build the requested chapter audio playlist." },
      { status: 500 },
    );
  }
}


