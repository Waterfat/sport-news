import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// 取得原始新聞列表
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const category = searchParams.get("category");
  const source = searchParams.get("source");
  const offset = (page - 1) * limit;

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
