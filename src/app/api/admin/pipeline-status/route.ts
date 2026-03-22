import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();

    const [rawResult, plansResult, tasksResult, reviewResult, publishedResult, automationResult] = await Promise.all([
      supabase.from("raw_articles").select("*", { count: "exact", head: true }).eq("is_processed", false),
      supabase.from("rewrite_plans").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("rewrite_tasks").select("*", { count: "exact", head: true }).in("status", ["pending", "running"]),
      supabase.from("generated_articles").select("*", { count: "exact", head: true }).eq("review_status", "pending"),
      supabase.from("generated_articles").select("*", { count: "exact", head: true }).eq("status", "published"),
      supabase.from("automation_settings").select("*").eq("id", 1).single(),
    ]);

    return NextResponse.json({
      pipeline: {
        raw_unprocessed: rawResult.count ?? 0,
        plans_pending: plansResult.count ?? 0,
        tasks_active: tasksResult.count ?? 0,
        review_pending: reviewResult.count ?? 0,
        published_total: publishedResult.count ?? 0,
      },
      automation: automationResult.data ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: `Internal error: ${err}` }, { status: 500 });
  }
}
