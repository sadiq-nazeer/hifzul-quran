import { NextResponse } from "next/server";
import { qfApi } from "@/lib/api/qfClient";

export const runtime = "nodejs";

export async function GET() {
  try {
    const reciters = await qfApi.listReciters();
    return NextResponse.json({ reciters });
  } catch (error) {
    console.error("Failed to fetch reciters", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json(
      {
        error: "Unable to load reciters from Quran.Foundation.",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}

