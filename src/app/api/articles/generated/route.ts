import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// 取得 AI 改寫文章列表
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.max(1, Math.min(500, parseInt(searchParams.get("limit") || "20", 10) || 20));
  const status = searchParams.get("status");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("generated_articles")
    .select("*, writer_personas(*)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === "scheduled") {
    query = query.eq("status", "draft").not("scheduled_at", "is", null);
  } else if (status) {
    query = query.eq("status", status);
  }

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
