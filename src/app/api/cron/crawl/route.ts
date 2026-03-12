import { NextRequest, NextResponse } from "next/server";
import { runAllCrawlers } from "@/lib/crawlers";

export const maxDuration = 60; // Vercel function timeout

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
