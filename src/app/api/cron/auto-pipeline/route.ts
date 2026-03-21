import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { publishArticle } from "@/lib/publish-article";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // 驗證 cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  try {
    // 1. 讀取自動化設定
    const { data: settings, error: settingsError } = await supabase
      .from("automation_settings")
      .select("*")
      .eq("id", 1)
      .single();

    if (settingsError || !settings) {
      return NextResponse.json({
        skipped: true,
        reason: "settings not found",
      });
    }

    // 2. 自動模式未開啟 → 跳過
    if (!settings.is_auto_mode) {
      return NextResponse.json({ skipped: true, reason: "manual mode" });
    }

    const now = new Date();
    const result: Record<string, unknown> = { timestamp: now.toISOString() };

    // === Phase A: 檢查已完成的自動任務 → 自動發布 ===
    const publishResult = await autoPublishCompleted(supabase);
    if (publishResult) {
      result.auto_publish = publishResult;
    }

    // === Phase B: 檢查是否該觸發新的產文 ===

    // 3. 檢查間隔未到 → 跳過觸發（但 Phase A 的發布仍然執行）
    if (settings.last_check_at) {
      const lastCheck = new Date(settings.last_check_at);
      const diffMinutes =
        (now.getTime() - lastCheck.getTime()) / (1000 * 60);
      if (diffMinutes < settings.check_interval_minutes) {
        return NextResponse.json({
          ...result,
          trigger: {
            skipped: true,
            reason: "interval not reached",
            next_check_in_minutes: Math.ceil(
              settings.check_interval_minutes - diffMinutes
            ),
          },
        });
      }
    }

    // 4. 更新 last_check_at
    await supabase
      .from("automation_settings")
      .update({ last_check_at: now.toISOString() })
      .eq("id", 1);

    // 5. 計算未處理素材數
    const { count } = await supabase
      .from("raw_articles")
      .select("*", { count: "exact", head: true })
      .eq("is_processed", false);

    const pendingCount = count ?? 0;

    // 6. 未達門檻 → 跳過
    if (pendingCount < settings.article_threshold) {
      return NextResponse.json({
        ...result,
        trigger: {
          skipped: true,
          reason: "threshold not reached",
          pending: pendingCount,
          threshold: settings.article_threshold,
        },
      });
    }

    // 7. 檢查是否有正在執行的任務（避免重複觸發）
    const { data: runningTasks } = await supabase
      .from("rewrite_tasks")
      .select("id")
      .in("status", ["pending", "running"])
      .limit(1);

    if (runningTasks && runningTasks.length > 0) {
      return NextResponse.json({
        ...result,
        trigger: { skipped: true, reason: "task already running" },
      });
    }

    // 8. 達門檻 → 建立 rewrite_task，metadata 標記 auto_publish
    await supabase
      .from("automation_settings")
      .update({
        last_run_at: now.toISOString(),
        last_run_status: "running",
        last_run_error: null,
      })
      .eq("id", 1);

    const { error: insertError } = await supabase
      .from("rewrite_tasks")
      .insert({
        status: "pending",
        metadata: { auto_publish: true },
      });

    if (insertError) {
      await supabase
        .from("automation_settings")
        .update({
          last_run_status: "failed",
          last_run_error: insertError.message,
        })
        .eq("id", 1);

      return NextResponse.json(
        { ...result, error: insertError.message },
        { status: 500 }
      );
    }

    console.log(
      `[Auto-Pipeline] Triggered: ${pendingCount} pending articles (threshold: ${settings.article_threshold})`
    );

    return NextResponse.json({
      ...result,
      trigger: {
        triggered: true,
        pending: pendingCount,
        threshold: settings.article_threshold,
      },
    });
  } catch (error) {
    console.error("[Auto-Pipeline] Error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * 檢查是否有剛完成的自動產文任務（metadata.auto_publish = true）
 * 若有 → 找出新產出的 draft 文章 → 呼叫 publishArticle 逐篇發布
 */
async function autoPublishCompleted(
  supabase: ReturnType<typeof createServiceClient>
): Promise<{ published: number; errors: string[] } | null> {
  // 找已完成但尚未發布的自動任務
  const { data: completedTasks } = await supabase
    .from("rewrite_tasks")
    .select("id, completed_at, metadata")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(5);

  if (!completedTasks || completedTasks.length === 0) return null;

  const autoTasks = completedTasks.filter(
    (t) =>
      t.metadata &&
      typeof t.metadata === "object" &&
      (t.metadata as Record<string, unknown>).auto_publish === true
  );

  if (autoTasks.length === 0) return null;

  // 找出最近 24 小時內 draft + approved 狀態的 generated_articles（產文完成且審查通過但尚未發布的）
  // 加時間過濾避免重複發布舊文章
  const { data: draftArticles } = await supabase
    .from("generated_articles")
    .select("id")
    .eq("status", "draft")
    .eq("review_status", "approved")
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  if (!draftArticles || draftArticles.length === 0) {
    // 沒有 draft 了 → 清除自動任務的 auto_publish 標記（避免重複檢查）
    for (const task of autoTasks) {
      await supabase
        .from("rewrite_tasks")
        .update({
          metadata: {
            ...((task.metadata as Record<string, unknown>) || {}),
            auto_publish: false,
            auto_published: true,
          },
        })
        .eq("id", task.id);
    }
    return null;
  }

  // 逐篇發布
  let published = 0;
  const errors: string[] = [];

  for (const article of draftArticles) {
    const pubResult = await publishArticle(article.id);
    if (pubResult.success) {
      published++;
      console.log(
        `[Auto-Pipeline] Published: "${pubResult.title}" → ${pubResult.channels_published} channels`
      );
    } else {
      errors.push(
        `${article.id}: ${pubResult.errors.join(", ")}`
      );
    }
  }

  // 更新自動任務標記（避免下次重複發布）
  for (const task of autoTasks) {
    await supabase
      .from("rewrite_tasks")
      .update({
        metadata: {
          ...((task.metadata as Record<string, unknown>) || {}),
          auto_publish: false,
          auto_published: true,
        },
      })
      .eq("id", task.id);
  }

  // 更新 automation_settings 的執行狀態
  await supabase
    .from("automation_settings")
    .update({
      last_run_status: errors.length === 0 ? "success" : "failed",
      last_run_error:
        errors.length > 0 ? errors.join("; ").substring(0, 500) : null,
      last_run_articles_count: published,
      last_run_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return { published, errors };
}
