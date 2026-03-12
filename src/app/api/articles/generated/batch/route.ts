import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { publishArticle } from "@/lib/publish-article";

// POST: 批次操作文章（發布、刪除）
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { ids, action } = body as { ids: string[]; action: string };

  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "ids is required" }, { status: 400 });
  }

  if (!["publish", "delete"].includes(action)) {
    return NextResponse.json(
      { error: "action must be publish or delete" },
      { status: 400 }
    );
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("generated_articles")
      .delete()
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ids.length });
  }

  // publish: 統一發布邏輯
  const results = [];
  for (const id of ids) {
    const result = await publishArticle(id);
    results.push(result);
  }

  const published = results.filter((r) => r.success).length;
  return NextResponse.json({ success: true, published, results });
}
