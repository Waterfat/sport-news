import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { auth } from "@/auth";

// GET: 取得審稿佇列（pending + 最近已審的歷史）
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tab = searchParams.get("tab") || "pending";

  const supabase = createServiceClient();

  if (tab === "pending") {
    const { data, error } = await supabase
      .from("generated_articles")
      .select("id, title, status, review_status, created_at, writer_persona_id")
      .eq("review_status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // history: recently reviewed
  const { data, error } = await supabase
    .from("generated_articles")
    .select("id, title, status, review_status, reviewer_note, created_at, updated_at")
    .in("review_status", ["approved", "rejected"])
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH: 更新審稿狀態
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, review_status, reason } = body as {
      id: string;
      review_status: "approved" | "rejected";
      reason?: string;
    };

    if (!id || !["approved", "rejected"].includes(review_status)) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const updateData: Record<string, unknown> = {
      review_status,
      updated_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.reviewer_note = reason;
    }

    const { error } = await supabase
      .from("generated_articles")
      .update(updateData)
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, id, review_status });
  } catch (err) {
    return NextResponse.json({ error: `Internal error: ${err}` }, { status: 500 });
  }
}
