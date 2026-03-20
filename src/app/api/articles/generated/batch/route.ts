import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase";
import { publishArticle } from "@/lib/publish-article";
import { auth } from "@/auth";
import { z } from "zod";

const BatchBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "ids is required"),
  action: z.enum(["publish", "delete"]),
});

// POST: 批次操作文章（發布、刪除）
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const body = await request.json();
  const parsed = BatchBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request body" },
      { status: 400 }
    );
  }

  const { ids, action } = parsed.data;

  if (action === "delete") {
    const { error } = await supabase
      .from("generated_articles")
      .delete()
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/news/[slug]", "page");
    revalidatePath("/writer/[id]", "page");
    revalidatePath("/rss.xml");

    return NextResponse.json({ success: true, deleted: ids.length });
  }

  // publish: 統一發布邏輯（串行處理，確保封面圖去重正確）
  const results = [];
  for (const id of ids) {
    results.push(await publishArticle(id));
  }

  const published = results.filter((r) => r.success).length;

  if (published > 0) {
    revalidatePath("/");
    revalidatePath("/category/[slug]", "page");
    revalidatePath("/news/[slug]", "page");
    revalidatePath("/writer/[id]", "page");
    revalidatePath("/rss.xml");
  }

  return NextResponse.json({ success: true, published, results });
}
