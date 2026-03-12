import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { parsePagination } from "@/lib/constants";

// GET: Public articles list (only published articles)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const { page, limit: rawLimit } = parsePagination(searchParams);
    const limit = Math.min(rawLimit, 100); // public API 限制上限為 100
    const offset = (page - 1) * limit;
    const category = searchParams.get("category");
    const writerId = searchParams.get("writer_id");

    let query = supabase
      .from("generated_articles")
      .select("id, title, slug, category, images, created_at, published_at, view_count, writer_persona_id, writer_personas(id, name)", { count: "exact" })
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (category) {
      query = query.eq("category", category);
    }

    if (writerId) {
      query = query.eq("writer_persona_id", writerId);
    }

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      articles: data || [],
      total: count,
      page,
      limit,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
