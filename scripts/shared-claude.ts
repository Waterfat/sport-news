/**
 * Shared Claude CLI helper for scripts.
 * Calls `claude -p --model sonnet` via subprocess.
 */

import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export function callClaude(prompt: string, timeout = 180000): string {
  const tmpPrompt = join(tmpdir(), `claude-prompt-${Date.now()}.txt`);
  const tmpOutput = join(tmpdir(), `claude-output-${Date.now()}.txt`);
  writeFileSync(tmpPrompt, prompt, "utf-8");

  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.ANTHROPIC_API_KEY;

  spawnSync(
    "bash",
    [
      "-c",
      `cat "${tmpPrompt}" | claude -p --model sonnet > "${tmpOutput}" 2>&1`,
    ],
    {
      encoding: "utf-8",
      timeout,
      maxBuffer: 2 * 1024 * 1024,
      env,
    }
  );

  let output = "";
  try {
    output = readFileSync(tmpOutput, "utf-8");
  } catch {}

  try { unlinkSync(tmpPrompt); } catch {}
  try { unlinkSync(tmpOutput); } catch {}

  return output;
}
