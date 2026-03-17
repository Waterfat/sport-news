import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const supabase = createServiceClient();

    const { data: articles, error } = await supabase
      .from("generated_articles")
      .select("id, title, slug, category, view_count, published_at")
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .limit(5);

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
