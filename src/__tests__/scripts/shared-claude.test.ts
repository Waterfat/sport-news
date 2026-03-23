/**
 * shared-claude rate limit 偵測測試
 */
import { describe, it, expect } from "vitest";
import { isRateLimitError } from "../../../scripts/shared-claude";

describe("isRateLimitError — rate limit 偵測", () => {
  it("偵測 'You've hit your limit' 訊息", () => {
    expect(isRateLimitError("You've hit your limit · resets 1am (Asia/Taipei)")).toBe(true);
  });

  it("偵測 'rate limit' 訊息（大小寫不敏感）", () => {
    expect(isRateLimitError("Rate Limit exceeded")).toBe(true);
    expect(isRateLimitError("RATE LIMIT")).toBe(true);
  });

  it("偵測 'too many requests' 訊息", () => {
    expect(isRateLimitError("Error: Too Many Requests")).toBe(true);
  });

  it("偵測 '429' 錯誤碼", () => {
    expect(isRateLimitError("HTTP 429: Too many requests")).toBe(true);
  });

  it("正常 JSON 輸出不觸發", () => {
    expect(isRateLimitError('{"title": "NBA 今日焦點", "content": "..."}')).toBe(false);
  });

  it("空字串不觸發", () => {
    expect(isRateLimitError("")).toBe(false);
  });

  it("一般錯誤訊息不觸發", () => {
    expect(isRateLimitError("Connection refused")).toBe(false);
    expect(isRateLimitError("Internal Server Error")).toBe(false);
  });

  it("Claude 正常 markdown 回應不觸發", () => {
    expect(isRateLimitError("```json\n{\"title\": \"test\"}\n```")).toBe(false);
  });
});
