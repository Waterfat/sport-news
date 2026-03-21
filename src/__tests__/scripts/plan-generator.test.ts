/**
 * plan-generator 核心邏輯測試
 * 測試 parseAIPlan（zod 驗證）和 is_processed 標記邏輯
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// 複製 plan-generator 的 schema 定義（因為 plan-generator 無法直接 import，其依賴 dotenv + supabase）
const PlanProposalSchema = z.object({
  title: z.string().min(1).max(500),
  source_indices: z.array(z.number().int().nonnegative()).min(1),
  league: z.string().nullable().optional(),
  plan_type: z.enum(["official", "columnist"]).optional(),
});

type PlanProposal = z.infer<typeof PlanProposalSchema>;

// 複製 extractJsonArray + parseAIPlan 函式（獨立於 DB 依賴，需與 scripts/plan-generator.ts 同步）
function extractJsonArray(text: string): string | null {
  const start = text.indexOf("[");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let stringChar: '"' | "'" | null = null;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if ((ch === '"' || ch === "'") && !inString) { inString = true; stringChar = ch; continue; }
    if (ch === stringChar) { inString = false; stringChar = null; continue; }
    if (inString) continue;

    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return null;
}

function parseAIPlan(output: string): PlanProposal[] {
  const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonStr = extractJsonArray(cleaned);
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    const validated = z.array(PlanProposalSchema).safeParse(parsed);
    if (!validated.success) return [];
    return validated.data;
  } catch {
    return [];
  }
}

describe("parseAIPlan — zod schema 驗證", () => {
  it("解析正常的 AI 回傳 JSON", () => {
    const input = `[{"title": "NBA 今日焦點", "source_indices": [0, 1], "league": "NBA", "plan_type": "official"}]`;
    const result = parseAIPlan(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("NBA 今日焦點");
    expect(result[0].source_indices).toEqual([0, 1]);
  });

  it("解析包含 markdown code block 的回傳", () => {
    const input = "```json\n[{\"title\": \"測試\", \"source_indices\": [0]}]\n```";
    const result = parseAIPlan(input);
    expect(result).toHaveLength(1);
  });

  it("拒絕空字串", () => {
    expect(parseAIPlan("")).toEqual([]);
  });

  it("拒絕非 JSON 回傳", () => {
    expect(parseAIPlan("I'm sorry, I can't help with that.")).toEqual([]);
  });

  it("拒絕 title 為空的 proposal", () => {
    const input = `[{"title": "", "source_indices": [0]}]`;
    expect(parseAIPlan(input)).toEqual([]);
  });

  it("拒絕 title 超過 500 字元的 proposal", () => {
    const longTitle = "A".repeat(501);
    const input = `[{"title": "${longTitle}", "source_indices": [0]}]`;
    expect(parseAIPlan(input)).toEqual([]);
  });

  it("拒絕 source_indices 為空陣列的 proposal", () => {
    const input = `[{"title": "測試", "source_indices": []}]`;
    expect(parseAIPlan(input)).toEqual([]);
  });

  it("拒絕 source_indices 包含負數", () => {
    const input = `[{"title": "測試", "source_indices": [-1, 0]}]`;
    expect(parseAIPlan(input)).toEqual([]);
  });

  it("拒絕 source_indices 包含浮點數", () => {
    const input = `[{"title": "測試", "source_indices": [0.5]}]`;
    expect(parseAIPlan(input)).toEqual([]);
  });

  it("拒絕不合法的 plan_type", () => {
    const input = `[{"title": "測試", "source_indices": [0], "plan_type": "hacker"}]`;
    expect(parseAIPlan(input)).toEqual([]);
  });

  it("接受缺少 league 和 plan_type 的 proposal（optional 欄位）", () => {
    const input = `[{"title": "NBA 綜合報導", "source_indices": [0, 1, 2]}]`;
    const result = parseAIPlan(input);
    expect(result).toHaveLength(1);
    expect(result[0].league).toBeUndefined();
  });

  it("正確處理多個 proposal", () => {
    const input = `[
      {"title": "文章一", "source_indices": [0], "league": "NBA"},
      {"title": "文章二", "source_indices": [1, 2], "league": "MLB"}
    ]`;
    const result = parseAIPlan(input);
    expect(result).toHaveLength(2);
  });

  it("整批拒絕（一個不合法就全部拒絕，因為 zod 驗證整個陣列）", () => {
    const input = `[
      {"title": "正常", "source_indices": [0]},
      {"title": "", "source_indices": [1]}
    ]`;
    // zod array 驗證失敗會拒絕整個陣列
    expect(parseAIPlan(input)).toEqual([]);
  });

  it("JSON 後帶有含方括號的中文備註（#128 bug 場景）", () => {
    const input = `\`\`\`json
[
  {
    "title": "富邦勇士教練大地震：吳永仁辭總教練",
    "source_indices": [0],
    "league": "PLG",
    "plan_type": "official"
  }
]
\`\`\`

**備註**：本批 10 篇素材中，可用內容極度有限：
- **[1][2][3][4][5][6]**：博彩/運動博弈促銷廣告，跳過
- **[7]**：大學籃球投注指南，跳過
- **[8][9]**：Fantasy Basketball 選人攻略，跳過`;
    const result = parseAIPlan(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("富邦勇士教練大地震：吳永仁辭總教練");
    expect(result[0].source_indices).toEqual([0]);
  });

  it("JSON 後帶有純文字備註（無方括號）", () => {
    const input = `[{"title": "測試", "source_indices": [0], "league": "NBA"}]

這是一段備註文字，說明為什麼只規劃了一篇文章。`;
    const result = parseAIPlan(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("測試");
  });

  it("JSON 被 code fence 包裹且後面有含方括號的備註", () => {
    const input = `\`\`\`json
[{"title": "NBA 今日焦點", "source_indices": [0, 1], "league": "NBA", "plan_type": "official"}]
\`\`\`

說明：
- [0] ESPN 報導 → 主要來源
- [1] CBS Sports → 補充數據
- [2][3][4] 博彩廣告 → 跳過`;
    const result = parseAIPlan(input);
    expect(result).toHaveLength(1);
    expect(result[0].source_indices).toEqual([0, 1]);
  });
});

describe("extractJsonArray — 括號計數器", () => {
  it("正確提取巢狀陣列", () => {
    const text = `[{"a": [1, 2]}, {"b": [3]}] extra text`;
    expect(extractJsonArray(text)).toBe('[{"a": [1, 2]}, {"b": [3]}]');
  });

  it("忽略字串內的方括號", () => {
    const text = `[{"title": "test [0] content", "arr": [1]}]`;
    expect(extractJsonArray(text)).toBe(text);
  });

  it("處理跳脫字元", () => {
    const text = `[{"val": "escaped \\"quote\\" [inside]", "n": [0]}]`;
    const result = extractJsonArray(text);
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toBeTruthy();
  });

  it("沒有陣列時回傳 null", () => {
    expect(extractJsonArray("no array here")).toBeNull();
  });

  it("未閉合的陣列回傳 null", () => {
    expect(extractJsonArray("[1, 2, 3")).toBeNull();
  });

  it("字串內的單引號不被計入括號深度", () => {
    const text = `[{"title": "test 'with [single quote]'", "arr": [1]}]`;
    expect(extractJsonArray(text)).toBe(text);
  });

  it("非標準 JSON 單引號字串（AI 偶爾產出）", () => {
    const text = `[{'title': 'NBA', 'indices': [0]}]`;
    expect(extractJsonArray(text)).toBe(text);
  });
});

// 從 plan-generator 抽取的圖片過濾邏輯（不依賴 DB）
function hasImagesForProposal(
  sourceIndices: number[],
  articles: Array<{ images?: string[] }>,
): boolean {
  return sourceIndices
    .filter((i) => i >= 0 && i < articles.length)
    .some((i) => (articles[i].images?.length ?? 0) > 0);
}

describe("圖片過濾邏輯 — 素材組合必須有圖才規劃", () => {
  it("素材有圖片時回傳 true", () => {
    const articles = [
      { images: ["https://img.com/a.jpg"] },
      { images: [] },
    ];
    expect(hasImagesForProposal([0, 1], articles)).toBe(true);
  });

  it("所有素材都沒圖時回傳 false", () => {
    const articles = [
      { images: [] },
      { images: [] },
    ];
    expect(hasImagesForProposal([0, 1], articles)).toBe(false);
  });

  it("素材 images 為 undefined 時視為無圖", () => {
    const articles = [
      { images: undefined },
      { images: undefined },
    ];
    expect(hasImagesForProposal([0, 1], articles)).toBe(false);
  });

  it("只要有一篇素材有圖就通過", () => {
    const articles = [
      { images: [] },
      { images: undefined },
      { images: ["https://img.com/only-one.jpg"] },
    ];
    expect(hasImagesForProposal([0, 1, 2], articles)).toBe(true);
  });

  it("source_indices 超出邊界時安全過濾", () => {
    const articles = [{ images: [] }];
    // source_indices [0, 5] 但 articles 只有 index 0
    expect(hasImagesForProposal([0, 5], articles)).toBe(false);
  });

  it("空 source_indices 回傳 false", () => {
    const articles = [{ images: ["https://img.com/a.jpg"] }];
    expect(hasImagesForProposal([], articles)).toBe(false);
  });
});

// 從 plan-generator 抽取的標題去重邏輯
function extractKeyTerms(title: string): Set<string> {
  const terms = new Set<string>();
  const englishWords = title.match(/[A-Za-z]+/g) || [];
  for (const w of englishWords) {
    if (w.length >= 3) terms.add(w.toLowerCase());
  }
  const chinese = title.replace(/[A-Za-z0-9\s\p{P}]/gu, "");
  for (let i = 0; i < chinese.length - 1; i++) {
    terms.add(chinese.substring(i, i + 2));
  }
  return terms;
}

function isSimilarTitle(a: string, b: string, threshold = 0.5): boolean {
  const ka = extractKeyTerms(a);
  const kb = extractKeyTerms(b);
  if (ka.size === 0 || kb.size === 0) return false;
  const intersection = [...ka].filter((x) => kb.has(x)).length;
  const overlap = intersection / Math.min(ka.size, kb.size);
  return overlap >= threshold;
}

describe("extractKeyTerms — 關鍵詞提取", () => {
  it("提取英文球員名", () => {
    const terms = extractKeyTerms("LeBron James 率湖人大勝勇士");
    expect(terms.has("lebron")).toBe(true);
    expect(terms.has("james")).toBe(true);
  });

  it("提取中文 bigram", () => {
    const terms = extractKeyTerms("湖人擊敗勇士");
    expect(terms.has("湖人")).toBe(true);
    expect(terms.has("勇士")).toBe(true);
  });

  it("忽略短英文詞（< 3 字元）", () => {
    const terms = extractKeyTerms("AI vs ML comparison");
    expect(terms.has("ai")).toBe(false);
    expect(terms.has("vs")).toBe(false);
    expect(terms.has("comparison")).toBe(true);
  });

  it("空字串回傳空 Set", () => {
    expect(extractKeyTerms("").size).toBe(0);
  });
});

describe("isSimilarTitle — 標題相似度", () => {
  it("高度相似的同主題文章", () => {
    expect(isSimilarTitle(
      "LeBron James 率湖人大勝勇士",
      "湖人擊敗勇士，LeBron James 砍下35分"
    )).toBe(true);
  });

  it("不同主題的文章", () => {
    expect(isSimilarTitle(
      "LeBron James 率湖人大勝勇士",
      "大谷翔平連續三場全壘打創紀錄"
    )).toBe(false);
  });

  it("同聯盟但不同球隊的文章", () => {
    expect(isSimilarTitle(
      "Celtics 連勝五場 Tatum 表現亮眼",
      "Nuggets 擊敗 Suns Jokic 大三元"
    )).toBe(false);
  });

  it("空標題不相似", () => {
    expect(isSimilarTitle("", "任何標題")).toBe(false);
    expect(isSimilarTitle("任何標題", "")).toBe(false);
  });

  it("完全相同的標題", () => {
    expect(isSimilarTitle("NBA 今日焦點", "NBA 今日焦點")).toBe(true);
  });

  it("純英文縮寫標題（長度 < 3）— 提取的 key terms 為空，回傳 false（已知邊界行為）", () => {
    // extractKeyTerms("AI vs ML") 因為都是短詞 < 3，回傳空 Set
    // isSimilarTitle 因此回傳 false（保守策略，避免誤判）
    expect(isSimilarTitle("AI vs ML", "AI vs ML")).toBe(false);
  });
});

describe("is_processed 標記邏輯", () => {
  it("收集所有 allPlans 中的 raw_article_ids 並去重", () => {
    const allPlans = [
      { writer_persona_id: "p1", title: "A", raw_article_ids: ["r1", "r2"], league: "NBA", plan_type: "official" },
      { writer_persona_id: "p2", title: "B", raw_article_ids: ["r2", "r3"], league: "MLB", plan_type: "columnist" },
    ];
    const usedIds = [...new Set(allPlans.flatMap((p) => p.raw_article_ids))];
    expect(usedIds).toEqual(["r1", "r2", "r3"]);
    expect(usedIds).toHaveLength(3); // r2 不重複
  });

  it("空 allPlans 不產生 usedIds", () => {
    const allPlans: { raw_article_ids: string[] }[] = [];
    const usedIds = [...new Set(allPlans.flatMap((p) => p.raw_article_ids))];
    expect(usedIds).toEqual([]);
  });
});
