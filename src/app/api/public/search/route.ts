import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json({ articles: [] });
    }

    const supabase = createServiceClient();
    const keyword = `%${q}%`;

    const { data: articles, error } = await supabase
      .from("generated_articles")
      .select("id, title, slug, category, published_at, images")
      .eq("status", "published")
      .or(`title.ilike.${keyword},content.ilike.${keyword}`)
      .order("published_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles: articles ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: `Internal error: ${err}` },
      { status: 500 }
    );
  }
}
