import { NextRequest, NextResponse } from "next/server";
import { runAllCrawlers } from "@/lib/crawlers";

export const maxDuration = 300; // Vercel function timeout（5 分鐘，確保所有爬蟲來源都能完成）

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAllCrawlers();
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron/Crawl] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
