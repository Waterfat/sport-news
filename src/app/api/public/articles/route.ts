import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET: Public articles list (only published articles)
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient();
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const category = searchParams.get("category");
    const writerId = searchParams.get("writer_id");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("generated_articles")
      .select("id, title, slug, category, created_at, published_at, view_count, writer_persona_id, writer_personas(id, name)", { count: "exact" })
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
