import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { parsePagination } from "@/lib/constants";

// 取得原始新聞列表
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  const { page, limit, offset } = parsePagination(searchParams);
  const category = searchParams.get("category");
  const source = searchParams.get("source");

  let query = supabase
    .from("raw_articles")
    .select("*", { count: "exact" })
    .order("crawled_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) query = query.eq("category", category);
  if (source) query = query.eq("source", source);

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    articles: data,
    total: count,
    page,
    limit,
  });
}
