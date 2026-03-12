import { NextRequest, NextResponse } from "next/server";
import { runSingleCrawler } from "@/lib/crawlers";

export const maxDuration = 60;

// POST: 手動觸發單一來源爬蟲
export async function POST(request: NextRequest) {
  const { sourceId } = await request.json();

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId is required" }, { status: 400 });
  }

  try {
    const result = await runSingleCrawler(sourceId);
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Manual Crawl] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
