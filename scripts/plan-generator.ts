/**
 * 規劃產生器 — AI 整體分析所有素材，產出去重後的文章規劃
 *
 * 核心邏輯：
 * 1. 從 DB 讀取最近 48 小時的原始新聞
 * 2. 取得啟用的寫手及其專長設定
 * 3. 根據寫手專長匹配素材
 * 4. 一次把所有素材丟給 Claude，讓 AI 分析、去重、規劃
 * 5. 結果存入 rewrite_plans 表供後台審核
 *
 * 使用方式：npx tsx scripts/plan-generator.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { matchesSpecialties, Specialties, RawArticleBase } from "./shared-matching";
import { callClaude } from "./shared-claude";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface WriterPersona { id: string; name: string; style_prompt: string; writer_type: string; specialties: Specialties; max_articles: number; }
interface RawArticle extends RawArticleBase { crawled_at: string; }

interface PlanProposal {
  title: string;
  source_indices: number[];
  league: string;
  plan_type: "official" | "columnist";
}

function parseAIPlan(output: string): PlanProposal[] {
  const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("AI 回傳非 JSON:", output.substring(0, 500));
    return [];
  }
  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p: PlanProposal) => p.title && Array.isArray(p.source_indices));
  } catch (e) {
    console.error("JSON 解析失敗:", e);
    return [];
  }
}

// --- Main ---
export async function generatePlans() {
  console.log(`\n[${new Date().toLocaleString("zh-TW")}] === 開始產生規劃 ===`);

  const { data: personas } = await supabase
    .from("writer_personas")
    .select("id, name, style_prompt, writer_type, specialties, max_articles")
    .eq("is_active", true);

  if (!personas?.length) { console.log("沒有啟用的寫手"); return; }

  // 取得最近 48 小時的文章
  const since = new Date();
  since.setHours(since.getHours() - 48);

  const { data: rawArticles } = await supabase
    .from("raw_articles").select("*")
    .gte("crawled_at", since.toISOString())
    .order("crawled_at", { ascending: false });

  if (!rawArticles?.length) { console.log("沒有近期文章"); return; }

  // 過濾垃圾文章
  const validArticles = rawArticles.filter((a) => {
    if (!a.title || a.title.trim().length < 10) return false;
    const categoryNames = ["NBA", "MLB", "NFL", "NHL", "NCAAM", "NCAAW", "WNBA", "MLS", "Soccer", "Tennis", "Hockey", "College Sports"];
    if (categoryNames.some((c) => a.title.trim().toUpperCase() === c.toUpperCase())) return false;
    return true;
  });

  if (!validArticles.length) { console.log("沒有有效的文章"); return; }
  console.log(`找到 ${rawArticles.length} 篇文章，其中 ${validArticles.length} 篇有效`);

  // 取得已產出過的文章（避免重複規劃已產出的素材）
  const { data: existingArticles } = await supabase
    .from("generated_articles")
    .select("raw_article_ids")
    .gte("created_at", since.toISOString());

  const alreadyUsedIds = new Set<string>();
  if (existingArticles) {
    for (const article of existingArticles) {
      for (const id of article.raw_article_ids || []) {
        alreadyUsedIds.add(id);
      }
    }
  }

  // 取得近 7 天已發布/已審核的文章標題（供 AI 判斷主題是否已報導過）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const { data: recentPublished } = await supabase
    .from("generated_articles")
    .select("title")
    .in("status", ["published"])
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);

  const publishedTitles = (recentPublished || []).map((a) => a.title);
  console.log(`近 7 天已發布/審核文章: ${publishedTitles.length} 篇`);

  const allPlans: { writer_persona_id: string; title: string; raw_article_ids: string[]; league: string | null; plan_type: string; }[] = [];

  for (const persona of personas as WriterPersona[]) {
    // 匹配專長
    const matched = validArticles.filter((a) => matchesSpecialties(a as RawArticle, persona.specialties));
    if (!matched.length) {
      console.log(`[${persona.name}] 沒有匹配的文章`);
      continue;
    }

    // 排除已被產出過的素材
    const freshArticles = matched.filter((a) => !alreadyUsedIds.has(a.id));
    if (!freshArticles.length) {
      console.log(`[${persona.name}] 所有匹配文章皆已產出過`);
      continue;
    }

    console.log(`[${persona.name}] 匹配 ${matched.length} 篇，新素材 ${freshArticles.length} 篇`);

    const maxArticles = persona.max_articles || 5;

    // 建立素材清單（帶編號供 AI 引用）
    const articleList = freshArticles.map((a, i) =>
      `[${i}] 來源：${a.source}\n    標題：${a.title}\n    摘要：${a.content.substring(0, 300)}`
    ).join("\n\n");

    const writerTypeDesc = persona.writer_type === "official"
      ? "官方體育編輯，負責撰寫每日聯盟戰報與重點新聞報導"
      : `專欄作家「${persona.name}」，有個人觀點和分析風格`;

    // 組裝已發布文章提示
    const publishedSection = publishedTitles.length > 0
      ? `\n以下是近 7 天已發布的文章標題，請勿規劃與這些主題重複的內容：\n${publishedTitles.map((t) => `- ${t}`).join("\n")}\n`
      : "";

    const prompt = `你是體育新聞網站的內容規劃師。以下是從多個來源爬取的 ${freshArticles.length} 篇體育新聞素材。

你的任務：分析這些素材，找出不重複的獨立主題，為「${persona.name}」（${writerTypeDesc}）規劃要產出的文章列表。
${publishedSection}
重要規則：
1. 多篇來自不同來源但報導同一事件的素材，必須合併為一個規劃項目（例如：ESPN 和 ETtoday 都在報導同一場比賽）
2. 同一事件的不同角度（例如：得分紀錄、賽後反應、女友見證）可以合併成一篇綜合報導，或拆成最多 2 篇（主報導 + 花絮）
3. 每個規劃項目必須引用所有相關的素材編號
4. 標題必須是繁體中文，球員/教練等人名保留英文原文
5. 最多產出 ${maxArticles} 個規劃項目
6. Fantasy、選秀預測、排名等列表型內容可以跳過，優先報導實際賽事和新聞事件
7. 與已發布文章主題相同或高度相似的內容，必須跳過不規劃
8. 必須包含 1～2 篇「綜合報導」：從當天多個不同主題的素材中，挑選 3～5 個亮點整合成一篇綜合摘要（例如「今日 NBA 三大焦點」、「本週聯盟大事紀」），這類文章的 source_indices 應引用多篇不同主題的素材
9. 只回覆 JSON，不要其他文字

素材清單：
${articleList}

請以 JSON 陣列格式回覆，每個項目包含：
- title: 繁體中文標題
- source_indices: 引用的素材編號陣列（例如 [0, 3, 7]）
- league: 聯盟名稱（如 "NBA"、"NFL"、"MLB" 等）
- plan_type: "${persona.writer_type}"

範例格式：
[{"title": "Bam Adebayo 單場轟下83分超越 Kobe，寫下 NBA 史上第二高得分紀錄", "source_indices": [0, 1, 5, 8], "league": "NBA", "plan_type": "${persona.writer_type}"}]`;

    console.log(`[${persona.name}] 呼叫 AI 分析 ${freshArticles.length} 篇素材...`);
    const output = callClaude(prompt, 180000);
    const proposals = parseAIPlan(output);

    if (!proposals.length) {
      console.log(`[${persona.name}] AI 沒有產生任何規劃`);
      continue;
    }

    console.log(`[${persona.name}] AI 規劃了 ${proposals.length} 篇文章`);

    for (const proposal of proposals) {
      // 將 source_indices 轉換為實際的 raw_article_ids
      const rawIds = proposal.source_indices
        .filter((i) => i >= 0 && i < freshArticles.length)
        .map((i) => freshArticles[i].id);

      if (rawIds.length === 0) {
        console.log(`  跳過「${proposal.title}」- 沒有有效的素材引用`);
        continue;
      }

      allPlans.push({
        writer_persona_id: persona.id,
        title: proposal.title,
        raw_article_ids: rawIds,
        league: proposal.league || null,
        plan_type: proposal.plan_type || persona.writer_type,
      });

      console.log(`  ✓ ${proposal.title} (${rawIds.length} 篇素材)`);
    }
  }

  if (allPlans.length > 0) {
    const { error } = await supabase.from("rewrite_plans").insert(allPlans);
    if (error) {
      console.error("儲存規劃失敗:", error.message);
      return;
    }
    console.log(`\n=== 已產生 ${allPlans.length} 個規劃項目 ===`);
  } else {
    console.log("沒有產生任何規劃");
  }
}

// 直接執行
if (require.main === module) {
  generatePlans().catch(console.error);
}
