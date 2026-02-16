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

  if (!Number.isFinite(chapterId) || chapterId <= 0) {
    return NextResponse.json(
      { error: "chapterId must be a positive integer" },
      { status: 400 },
    );
  }

  const fromVerse = toPositiveNumber(searchParams.get("fromVerse"));
  const toVerse = toPositiveNumber(searchParams.get("toVerse"));
  const perPage = toPositiveNumber(searchParams.get("perPage"));
  const translationId = toPositiveNumber(searchParams.get("translationId"));
  const tafsirId = toPositiveNumber(searchParams.get("tafsirId"));
  const reciterId = toPositiveNumber(searchParams.get("reciterId"));

  try {
    const verses = await qfApi.buildCoachBundle({
      chapterId,
      fromVerse,
      toVerse,
      perPage,
      translationId,
      tafsirId,
      reciterId,
    });
    return NextResponse.json({ verses });
  } catch (error) {
    console.error("Failed to build coach bundle", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Unable to build memorization bundle.",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

