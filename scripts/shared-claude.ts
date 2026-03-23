/**
 * Shared Claude CLI helper for scripts.
 * Calls `claude -p --model sonnet` via subprocess.
 */

import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

/** Rate limit 偵測 pattern */
const RATE_LIMIT_PATTERNS = [
  "You've hit your limit",
  "rate limit",
  "too many requests",
  "429",
];

/** 檢查輸出是否為 rate limit 錯誤 */
export function isRateLimitError(output: string): boolean {
  const lower = output.toLowerCase();
  return RATE_LIMIT_PATTERNS.some((p) => lower.includes(p.toLowerCase()));
}

export function callClaude(prompt: string, timeout = 180000, maxRetries = 3): string {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const tmpPrompt = join(tmpdir(), `claude-prompt-${Date.now()}.txt`);
    const tmpOutput = join(tmpdir(), `claude-output-${Date.now()}.txt`);
    writeFileSync(tmpPrompt, prompt, "utf-8");

    const env = { ...process.env };
    delete env.CLAUDECODE;
    delete env.ANTHROPIC_API_KEY;

    const tmpStderr = join(tmpdir(), `claude-stderr-${Date.now()}.txt`);
    const result = spawnSync(
      "bash",
      [
        "-c",
        `cat "${tmpPrompt}" | claude -p --model sonnet > "${tmpOutput}" 2>"${tmpStderr}"`,
      ],
      {
        encoding: "utf-8",
        timeout,
        maxBuffer: 2 * 1024 * 1024,
        env,
      }
    );

    // 檢查 subprocess 是否因 timeout 或 signal 被殺死
    if (result.signal) {
      console.error(`[callClaude] 子程序被 ${result.signal} 終止（可能超時 ${timeout}ms）`);
      try { unlinkSync(tmpPrompt); } catch {}
      try { unlinkSync(tmpOutput); } catch {}
      try { unlinkSync(tmpStderr); } catch {}
      throw new Error(`Claude CLI 子程序被 ${result.signal} 終止`);
    }

    // Log stderr separately if present
    try {
      const stderrContent = readFileSync(tmpStderr, "utf-8").trim();
      if (stderrContent) {
        console.error("[callClaude stderr]", stderrContent.substring(0, 500));
      }
    } catch {}
    try { unlinkSync(tmpStderr); } catch {}

    let output = "";
    try {
      output = readFileSync(tmpOutput, "utf-8");
    } catch {}

    try { unlinkSync(tmpPrompt); } catch {}
    try { unlinkSync(tmpOutput); } catch {}

    // Rate limit 偵測 + retry
    if (isRateLimitError(output)) {
      const waitSec = attempt * 60; // 1 分鐘、2 分鐘、3 分鐘
      console.warn(`[callClaude] Rate limit detected (attempt ${attempt}/${maxRetries})，等待 ${waitSec} 秒後重試...`);
      if (attempt < maxRetries) {
        spawnSync("sleep", [String(waitSec)]);
        continue;
      }
      console.error(`[callClaude] Rate limit 重試 ${maxRetries} 次仍失敗`);
    }

    return output;
  }

  return ""; // 不應到達，但 TypeScript 需要
}
