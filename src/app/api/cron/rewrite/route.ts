import { NextRequest, NextResponse } from "next/server";
import { processUnprocessedArticles } from "@/lib/ai-rewriter";

export const maxDuration = 120; // AI 改寫需要更多時間

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processUnprocessedArticles(5);
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron/Rewrite] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
