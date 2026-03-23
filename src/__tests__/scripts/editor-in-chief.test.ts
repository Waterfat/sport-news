import { describe, it, expect } from "vitest";

// editor-in-chief.ts 的純函式需要獨立提取才能測試
// 因為模組頂層有 process.exit，我們用動態方式取得函式
// 先直接測試函式邏輯（從原始碼複製純函式來測試）

// --- 從 editor-in-chief.ts 複製的純函式 ---

function extractFirstJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
    if (depth === 0) return text.substring(start, i + 1);
  }
  return null;
}

interface ReviewResult {
  decision: "approved" | "rejected";
  scores: {
    title_quality: number;
    content_quality: number;
    fact_check: number;
    brand_tone: number;
    seo: number;
    overall: number;
  };
  checks?: {
    topic_unique: "pass" | "fail";
    image_unique: "pass" | "fail";
    has_image: "pass" | "fail";
  };
  reject_reasons: string[];
  suggestions: string[];
}

function parseReviewResult(output: string): ReviewResult {
  if (!output.trim()) {
    throw new Error("Claude returned empty response");
  }
  const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  const jsonStr = extractFirstJson(cleaned);
  if (!jsonStr || !jsonStr.includes('"decision"')) {
    throw new Error(`Response is not valid JSON: ${output.substring(0, 300)}`);
  }
  return JSON.parse(jsonStr);
}

function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.") ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      (hostname.startsWith("172.") &&
        (() => {
          const second = parseInt(hostname.split(".")[1], 10);
          return second >= 16 && second <= 31;
        })())
    ) {
      return false;
    }
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function extractImageUrls(images: unknown): string[] {
  if (!images || !Array.isArray(images)) return [];
  return images
    .map((img: unknown) => {
      if (typeof img === "string") return img;
      if (typeof img === "object" && img !== null && "url" in img) {
        const url = (img as { url?: unknown }).url;
        return typeof url === "string" ? url : undefined;
      }
      return undefined;
    })
    .filter(
      (url): url is string =>
        typeof url === "string" && url.startsWith("http") && isSafeImageUrl(url)
    );
}

// --- 測試 ---

describe("extractFirstJson", () => {
  it("從純 JSON 字串提取", () => {
    const json = '{"decision": "approved"}';
    expect(extractFirstJson(json)).toBe(json);
  });

  it("從包含前綴文字的回應提取", () => {
    const input = '以下是審查結果：\n{"decision": "rejected"}';
    expect(extractFirstJson(input)).toBe('{"decision": "rejected"}');
  });

  it("處理巢狀 JSON", () => {
    const json = '{"scores": {"title": 8, "content": 7}}';
    expect(extractFirstJson(`前言 ${json} 後記`)).toBe(json);
  });

  it("無 JSON 時回傳 null", () => {
    expect(extractFirstJson("no json here")).toBeNull();
  });

  it("未閉合 JSON 回傳 null", () => {
    expect(extractFirstJson('{"unclosed": true')).toBeNull();
  });
});

describe("parseReviewResult", () => {
  const validResult: ReviewResult = {
    decision: "approved",
    scores: {
      title_quality: 8,
      content_quality: 7,
      fact_check: 9,
      brand_tone: 7,
      seo: 6,
      overall: 8,
    },
    checks: {
      topic_unique: "pass",
      image_unique: "pass",
      has_image: "pass",
    },
    reject_reasons: [],
    suggestions: ["可以加入更多數據"],
  };

  it("解析有效的 JSON 回應", () => {
    const result = parseReviewResult(JSON.stringify(validResult));
    expect(result.decision).toBe("approved");
    expect(result.scores.title_quality).toBe(8);
  });

  it("解析包含 markdown code block 的回應", () => {
    const input = "```json\n" + JSON.stringify(validResult) + "\n```";
    const result = parseReviewResult(input);
    expect(result.decision).toBe("approved");
  });

  it("解析包含前後文字的回應", () => {
    const input = "審查完畢，結果如下：\n" + JSON.stringify(validResult) + "\n以上";
    const result = parseReviewResult(input);
    expect(result.decision).toBe("approved");
  });

  it("拒絕空回應", () => {
    expect(() => parseReviewResult("")).toThrow("empty response");
    expect(() => parseReviewResult("   ")).toThrow("empty response");
  });

  it("拒絕無 decision 的 JSON", () => {
    expect(() => parseReviewResult('{"scores": {}}')).toThrow("not valid JSON");
  });

  it("拒絕非 JSON 回應", () => {
    expect(() => parseReviewResult("I cannot review this article")).toThrow(
      "not valid JSON"
    );
  });

  it("解析 rejected 結果", () => {
    const rejected = {
      ...validResult,
      decision: "rejected",
      reject_reasons: ["標題品質不佳", "內容過短"],
    };
    const result = parseReviewResult(JSON.stringify(rejected));
    expect(result.decision).toBe("rejected");
    expect(result.reject_reasons).toHaveLength(2);
  });
});

describe("isSafeImageUrl", () => {
  it("允許 HTTPS URL", () => {
    expect(isSafeImageUrl("https://example.com/img.jpg")).toBe(true);
  });

  it("拒絕 HTTP URL", () => {
    expect(isSafeImageUrl("http://example.com/img.jpg")).toBe(false);
  });

  it("拒絕 localhost", () => {
    expect(isSafeImageUrl("https://localhost/img.jpg")).toBe(false);
  });

  it("拒絕 127.x.x.x", () => {
    expect(isSafeImageUrl("https://127.0.0.1/img.jpg")).toBe(false);
  });

  it("拒絕 10.x.x.x 內網", () => {
    expect(isSafeImageUrl("https://10.0.0.1/img.jpg")).toBe(false);
  });

  it("拒絕 192.168.x.x 內網", () => {
    expect(isSafeImageUrl("https://192.168.1.1/img.jpg")).toBe(false);
  });

  it("拒絕 172.16-31.x.x 內網", () => {
    expect(isSafeImageUrl("https://172.16.0.1/img.jpg")).toBe(false);
    expect(isSafeImageUrl("https://172.31.0.1/img.jpg")).toBe(false);
  });

  it("允許 172.15.x.x（不在內網範圍）", () => {
    expect(isSafeImageUrl("https://172.15.0.1/img.jpg")).toBe(true);
  });

  it("拒絕 169.254.x.x link-local", () => {
    expect(isSafeImageUrl("https://169.254.1.1/img.jpg")).toBe(false);
  });

  it("拒絕 .local 域名", () => {
    expect(isSafeImageUrl("https://myhost.local/img.jpg")).toBe(false);
  });

  it("拒絕 0.0.0.0", () => {
    expect(isSafeImageUrl("https://0.0.0.0/img.jpg")).toBe(false);
  });

  it("拒絕無效 URL", () => {
    expect(isSafeImageUrl("not-a-url")).toBe(false);
  });
});

describe("extractImageUrls", () => {
  it("從字串陣列提取", () => {
    const images = ["https://example.com/1.jpg", "https://example.com/2.jpg"];
    expect(extractImageUrls(images)).toEqual(images);
  });

  it("從物件陣列提取", () => {
    const images = [
      { url: "https://example.com/1.jpg" },
      { url: "https://example.com/2.jpg" },
    ];
    expect(extractImageUrls(images)).toEqual([
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
    ]);
  });

  it("過濾非 HTTPS URL", () => {
    const images = ["https://safe.com/img.jpg", "http://unsafe.com/img.jpg"];
    expect(extractImageUrls(images)).toEqual(["https://safe.com/img.jpg"]);
  });

  it("過濾內網 URL", () => {
    const images = [
      "https://example.com/img.jpg",
      "https://192.168.1.1/img.jpg",
    ];
    expect(extractImageUrls(images)).toEqual(["https://example.com/img.jpg"]);
  });

  it("處理 null 輸入", () => {
    expect(extractImageUrls(null)).toEqual([]);
  });

  it("處理非陣列輸入", () => {
    expect(extractImageUrls("not-array")).toEqual([]);
  });

  it("處理空陣列", () => {
    expect(extractImageUrls([])).toEqual([]);
  });

  it("混合型陣列（字串+物件）", () => {
    const images = [
      "https://example.com/1.jpg",
      { url: "https://example.com/2.jpg" },
      42,
      null,
    ];
    expect(extractImageUrls(images)).toEqual([
      "https://example.com/1.jpg",
      "https://example.com/2.jpg",
    ]);
  });
});
