import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { z } from "zod";

export const revalidate = 300; // 5 minutes

const QuerySchema = z.object({
  category: z.string().optional(),
  period: z.enum(["week", "month", "all"]).default("all"),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const parsed = QuerySchema.safeParse({
      category: searchParams.get("category") ?? undefined,
      period: searchParams.get("period") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid query params" },
        { status: 400 }
      );
    }

    const { category, period, limit } = parsed.data;
    const supabase = createServiceClient();

    let query = supabase
      .from("generated_articles")
      .select("id, title, slug, category, view_count, published_at")
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .limit(limit);

    // Filter by category
    if (category) {
      query = query.eq("category", category);
    }

    // Filter by time period
    if (period !== "all") {
      const now = new Date();
      const since = new Date();
      if (period === "week") {
        since.setDate(now.getDate() - 7);
      } else if (period === "month") {
        since.setDate(now.getDate() - 30);
      }
      query = query.gte("published_at", since.toISOString());
    }

    const { data: articles, error } = await query;

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
