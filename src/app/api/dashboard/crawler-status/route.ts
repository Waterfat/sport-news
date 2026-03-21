import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { auth } from "@/auth";

interface CrawlerStatus {
  source: string;
  count: number;
  lastCrawled: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("raw_articles")
    .select("source, crawled_at");

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch crawler status" },
      { status: 500 }
    );
  }

  // Group by source in memory
  const grouped = new Map<string, { count: number; lastCrawled: string }>();
  for (const row of data || []) {
    const existing = grouped.get(row.source);
    if (!existing) {
      grouped.set(row.source, {
        count: 1,
        lastCrawled: row.crawled_at,
      });
    } else {
      existing.count++;
      if (row.crawled_at > existing.lastCrawled) {
        existing.lastCrawled = row.crawled_at;
      }
    }
  }

  const result: CrawlerStatus[] = Array.from(grouped.entries())
    .map(([source, { count, lastCrawled }]) => ({
      source,
      count,
      lastCrawled,
    }))
    .sort(
      (a, b) =>
        new Date(b.lastCrawled).getTime() - new Date(a.lastCrawled).getTime()
    );

  return NextResponse.json(result);
}
