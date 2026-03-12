import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// POST: 將選中的規劃項目加入產出任務
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  // 檢查是否有正在執行的任務
  const { data: running } = await supabase
    .from("rewrite_tasks")
    .select("id")
    .in("status", ["pending", "running"])
    .limit(1);

  if (running && running.length > 0) {
    return NextResponse.json(
      { error: "有任務正在執行中" },
      { status: 409 }
    );
  }

  // 建立產出任務，把要產出的 plan ids 存在 metadata
  const { data, error } = await supabase
    .from("rewrite_tasks")
    .insert({
      status: "pending",
      error_message: JSON.stringify({ mode: "produce", plan_ids: ids }),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: data }, { status: 201 });
}
