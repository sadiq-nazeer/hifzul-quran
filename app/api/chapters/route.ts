import { NextResponse } from "next/server";
import { qfApi } from "@/lib/api/qfClient";

export const runtime = "nodejs";

export async function GET() {
  try {
    const chapters = await qfApi.listChapters();
    return NextResponse.json({ chapters });
  } catch (error) {
    console.error("Failed to fetch chapters", error);
    return NextResponse.json(
      { error: "Unable to load chapter data from Quran.Foundation." },
      { status: 500 },
    );
  }
}

