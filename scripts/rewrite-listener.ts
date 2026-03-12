/**
 * Mac Mini 改寫監聽器
 *
 * 透過 Supabase Realtime 監聽 rewrite_tasks 表，
 * 收到 pending 任務時自動執行改寫腳本。
 *
 * 使用方式：npx tsx scripts/rewrite-listener.ts
 * 建議搭配 pm2 或 launchd 常駐執行。
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fmakjkvkmbltqgyndijb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const REWRITER_SCRIPT = resolve(__dirname, "local-rewriter.ts");
const PLAN_GENERATOR_SCRIPT = resolve(__dirname, "plan-generator.ts");

let isRunning = false;

// 解析任務的模式：plan（產生規劃）或 produce（根據規劃產出文章）
function parseTaskMode(errorMessage: string | null): { mode: string; planIds?: string[] } {
  if (!errorMessage) return { mode: "plan" };
  try {
    const parsed = JSON.parse(errorMessage);
    if (parsed.mode === "produce" && Array.isArray(parsed.plan_ids)) {
      return { mode: "produce", planIds: parsed.plan_ids };
    }
  } catch {}
  return { mode: "plan" };
}

async function executeTask(taskId: string) {
  if (isRunning) {
    console.log(`[${ts()}] 已有任務執行中，跳過`);
    return;
  }

  isRunning = true;

  // 讀取任務資料以判斷模式
  const { data: task } = await supabase
    .from("rewrite_tasks")
    .select("error_message")
    .eq("id", taskId)
    .single();

  const { mode, planIds } = parseTaskMode(task?.error_message);
  console.log(`[${ts()}] 開始執行任務: ${taskId} (模式: ${mode})`);

  // 更新狀態為 running，清除 error_message（之前用來存 metadata）
  await supabase
    .from("rewrite_tasks")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", taskId);

  // 記錄執行前的最新文章時間，用來精確計算新增數量
  const { data: latestBefore } = await supabase
    .from("generated_articles")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  const beforeTimestamp = latestBefore?.[0]?.created_at || new Date().toISOString();

  try {
    let script: string;
    let args: string[];

    if (mode === "produce" && planIds) {
      // 產出模式：執行 local-rewriter 並傳入 plan ids
      script = REWRITER_SCRIPT;
      args = ["npx", "tsx", script, "--plan-ids", planIds.join(",")];
    } else {
      // 規劃模式：執行 plan-generator
      script = PLAN_GENERATOR_SCRIPT;
      args = ["npx", "tsx", script];
    }

    const result = spawnSync(args[0], args.slice(1), {
      encoding: "utf-8",
      timeout: 600000, // 10 分鐘上限
      maxBuffer: 5 * 1024 * 1024,
      cwd: resolve(__dirname, ".."),
      env: { ...process.env },
      stdio: "pipe",
    });

    console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);

    // 計算此任務實際新增的文章數（只計算任務開始後建立的文章）
    const { count: articlesGenerated } = await supabase
      .from("generated_articles")
      .select("*", { count: "exact", head: true })
      .gt("created_at", beforeTimestamp);

    const generated = articlesGenerated || 0;

    if (result.status === 0) {
      await supabase
        .from("rewrite_tasks")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          articles_generated: generated,
        })
        .eq("id", taskId);

      console.log(
        `[${ts()}] 任務完成 (${mode})，產出 ${generated} 篇文章`
      );
    } else {
      const errorMsg = result.stderr?.substring(0, 500) || "Process exited with non-zero code";
      await supabase
        .from("rewrite_tasks")
        .update({
          status: "failed",
          completed_at: new Date().toISOString(),
          articles_generated: generated,
          error_message: errorMsg,
        })
        .eq("id", taskId);

      console.error(`[${ts()}] 任務失敗: ${errorMsg}`);
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await supabase
      .from("rewrite_tasks")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: errorMsg,
      })
      .eq("id", taskId);

    console.error(`[${ts()}] 任務異常: ${errorMsg}`);
  } finally {
    isRunning = false;
  }
}

function ts() {
  return new Date().toLocaleString("zh-TW");
}

async function checkPendingTasks() {
  const { data } = await supabase
    .from("rewrite_tasks")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);

  if (data && data.length > 0) {
    await executeTask(data[0].id);
  }
}

function startListening() {
  console.log(`[${ts()}] 改寫監聽器啟動，等待任務...`);

  // 訂閱 Realtime
  const channel = supabase
    .channel("rewrite-tasks")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "rewrite_tasks",
        filter: "status=eq.pending",
      },
      (payload) => {
        console.log(`[${ts()}] 收到新任務`);
        executeTask(payload.new.id as string);
      }
    )
    .subscribe((status) => {
      console.log(`[${ts()}] Realtime 連線狀態: ${status}`);
    });

  // 啟動時先檢查有沒有未處理的任務
  checkPendingTasks();

  // 每 30 秒心跳檢查（防止 Realtime 漏接）
  setInterval(() => {
    checkPendingTasks();
  }, 30000);

  // 優雅關閉
  process.on("SIGINT", () => {
    console.log(`\n[${ts()}] 正在關閉監聽器...`);
    supabase.removeChannel(channel);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log(`\n[${ts()}] 收到終止信號，關閉監聽器...`);
    supabase.removeChannel(channel);
    process.exit(0);
  });
}

startListening();
