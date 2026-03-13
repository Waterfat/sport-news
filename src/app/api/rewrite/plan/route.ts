import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET: 取得目前的規劃列表
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("rewrite_plans")
    .select("*, writer_personas(name, writer_type)")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 取得所有 raw_article_ids 對應的原始文章標題
  const allRawIds = new Set<string>();
  for (const plan of data || []) {
    for (const id of plan.raw_article_ids || []) {
      allRawIds.add(id);
    }
  }

  let rawArticleMap: Record<string, { title: string; source: string }> = {};
  if (allRawIds.size > 0) {
    const { data: rawArticles } = await supabase
      .from("raw_articles")
      .select("id, title, source, url")
      .in("id", Array.from(allRawIds));
    if (rawArticles) {
      rawArticleMap = Object.fromEntries(
        rawArticles.map((a) => [a.id, { title: a.title, source: a.source, url: a.url }])
      );
    }
  }

  return NextResponse.json({ plans: data || [], rawArticleMap });
}

// POST: 產生規劃（呼叫 rewrite_tasks 觸發 listener）
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();

  let force = false;
  try {
    const body = await request.json();
    force = body?.force === true;
  } catch {}

  // 先檢查是否有正在執行的任務（避免先刪 plans 再發現 task 還在跑）
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

  // 檢查是否已有規劃
  const { count: existingCount } = await supabase
    .from("rewrite_plans")
    .select("*", { count: "exact", head: true });

  if (existingCount && existingCount > 0) {
    if (force) {
      // 清除舊規劃
      await supabase.from("rewrite_plans").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      return NextResponse.json(
        { error: "已有規劃存在", hasExisting: true },
        { status: 409 }
      );
    }
  }

  // 建立規劃任務（plan mode）
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

// DELETE: 刪除選中的規劃項目
export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("rewrite_plans")
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, deleted: ids.length });
}
