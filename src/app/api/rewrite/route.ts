import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// POST: 建立新的改寫任務
export async function POST() {
  const supabase = createServiceClient();

  // 檢查是否有正在執行的任務
  const { data: running } = await supabase
    .from("rewrite_tasks")
    .select("id")
    .in("status", ["pending", "running"])
    .limit(1);

  if (running && running.length > 0) {
    return NextResponse.json(
      { error: "已有改寫任務正在執行中" },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("rewrite_tasks")
    .insert({ status: "pending" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: data }, { status: 201 });
}

// GET: 取得最後執行狀態 + 自上次完成以來的新增文章數
export async function GET() {
  const supabase = createServiceClient();

  // 最後一筆已完成的任務
  const { data: lastCompleted } = await supabase
    .from("rewrite_tasks")
    .select("*")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 目前是否有進行中的任務
  const { data: currentTask } = await supabase
    .from("rewrite_tasks")
    .select("*")
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 自上次完成以來新增的文章數
  let newArticleCount = 0;
  if (lastCompleted?.completed_at) {
    const { count } = await supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", lastCompleted.completed_at);
    newArticleCount = count || 0;
  } else {
    // 沒有歷史任務，計算全部文章
    const { count } = await supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true });
    newArticleCount = count || 0;
  }

  return NextResponse.json({
    lastCompleted,
    currentTask,
    newArticleCount,
  });
}
