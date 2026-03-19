import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { parsePagination } from "@/lib/constants";
import { auth } from "@/auth";

// 取得 AI 改寫文章列表
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const searchParams = request.nextUrl.searchParams;

  const { page, limit, offset } = parsePagination(searchParams);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

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

  if (category) {
    query = query.eq("category", category);
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
