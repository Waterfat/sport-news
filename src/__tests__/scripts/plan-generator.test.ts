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

// 複製 parseAIPlan 函式（獨立於 DB 依賴）
function parseAIPlan(output: string): PlanProposal[] {
  const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]);
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
