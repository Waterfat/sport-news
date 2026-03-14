/**
 * 本地 AI 改寫腳本（手動觸發）
 *
 * 使用 Claude Code CLI（claude -p）來改寫文章。
 *
 * 核心邏輯：
 * 1. 從 DB 讀取前一天所有爬蟲抓到的原始新聞
 * 2. 取得啟用的寫手及其專長設定
 * 3. 根據寫手專長匹配適合的文章
 * 4. 官方戰報寫手：按聯盟分組，每個聯盟產出一篇當日綜合戰報
 * 5. 專欄作家：可使用所有文章（含官方戰報用過的），按主題分組改寫
 * 6. 改寫結果存回 DB（raw_article_ids 記錄引用來源，不標記文章已處理）
 *
 * 使用方式：npx tsx scripts/local-rewriter.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { matchesSpecialties, Specialties, RawArticleBase } from "./shared-matching";
import { callClaude } from "./shared-claude";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://fmakjkvkmbltqgyndijb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_KEY) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface WriterPersona {
  id: string;
  name: string;
  style_prompt: string;
  writer_type: string;
  specialties: Specialties;
}

interface RawArticle extends RawArticleBase {
  crawled_at: string;
  images: string[];
}

// 將文章按聯盟分組（給官方戰報用）
function groupByLeague(articles: RawArticle[]): Record<string, RawArticle[]> {
  const groups: Record<string, RawArticle[]> = {};

  const leagueDetectors: [string, RegExp[]][] = [
    ["NBA", [/\bnba\b/i]],
    ["MLB", [/\bmlb\b/i, /大聯盟/]],
    ["NFL", [/\bnfl\b/i]],
    ["NCAAM", [/\bncaam\b/i, /\bmarch madness\b/i, /\bncaa\b/i]],
    ["英超", [/英超/, /\bpremier league\b/i]],
    ["西甲", [/西甲/, /\bla liga\b/i]],
    ["歐冠", [/歐冠/, /\buchampions league\b/i]],
    ["MLS", [/\bmls\b/i]],
    ["中職", [/中職/, /\bcpbl\b/i]],
    ["日職", [/日職/, /\bnpb\b/i]],
    ["NHL", [/\bnhl\b/i]],
    ["WBC", [/\bwbc\b/i, /世界棒球經典賽/]],
    ["WNBA", [/\bwnba\b/i]],
  ];

  for (const article of articles) {
    const fullText = article.title + " " + article.content + " " + (article.category || "");
    let assigned = false;
    for (const [league, patterns] of leagueDetectors) {
      if (patterns.some((re) => re.test(fullText))) {
        if (!groups[league]) groups[league] = [];
        groups[league].push(article);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      if (!groups["綜合"]) groups["綜合"] = [];
      groups["綜合"].push(article);
    }
  }

  return groups;
}

// 按關鍵字將文章分組（給一般寫手用），每組最多 MAX_GROUP_SIZE 篇
const MAX_GROUP_SIZE = 5;

function groupByTopic(articles: RawArticle[]): RawArticle[][] {
  const groups: RawArticle[][] = [];
  const used = new Set<string>();

  for (const article of articles) {
    if (used.has(article.id)) continue;

    const group = [article];
    used.add(article.id);

    // 提取標題中的專有名詞（至少兩個詞的人名/隊名）
    const names1 = extractNames(article.title);

    for (const other of articles) {
      if (used.has(other.id)) continue;
      if (group.length >= MAX_GROUP_SIZE) break;

      const names2 = extractNames(other.title);
      // 標題必須有共同的專有名詞才歸為同組
      const overlap = names1.filter((n) => names2.includes(n));

      if (overlap.length >= 1) {
        group.push(other);
        used.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

function extractNames(text: string): string[] {
  // 匹配英文專有名詞（如 Jayson Tatum, Miami Ohio）
  const namePattern = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g;
  const matches = text.match(namePattern) || [];
  // 過濾掉常見非名詞（如 Pro Bowl, North Carolina 保留）
  const filtered = matches.filter((n) => n.split(" ").length <= 4);
  return [...new Set(filtered.map((n) => n.toLowerCase()))];
}

// 從多篇原始文章中收集不重複的圖片 URL（最多取 5 張）
function collectImages(articles: RawArticle[]): string[] {
  const seen = new Set<string>();
  const images: string[] = [];
  for (const a of articles) {
    for (const url of a.images || []) {
      if (url && !seen.has(url) && images.length < 5) {
        seen.add(url);
        images.push(url);
      }
    }
  }
  return images;
}

function parseResult(output: string): { title: string; content: string; category?: string } {
  if (!output.trim()) {
    throw new Error("Claude returned empty response");
  }
  const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "");
  const jsonMatch = cleaned.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Response is not valid JSON: ${output.substring(0, 300)}`);
  }
  return JSON.parse(jsonMatch[0]);
}

function buildColumnistPrompt(
  articles: RawArticle[],
  persona: WriterPersona,
  titleStyleHint?: string
): string {
  const sourceSummaries = articles
    .map(
      (a, i) =>
        `【素材 ${i + 1}】\n來源：${a.source}\n標題：${a.title}\n內容：${a.content.substring(0, 1500)}`
    )
    .join("\n\n---\n\n");

  const category = articles[0].category || "綜合";

  return `你是一個專業的體育新聞部落客/專欄作家，以正式的文章水準撰寫體育報導。

你的寫作人設：
${persona.style_prompt}

你擅長的領域：
- 球種: ${persona.specialties.sports.join(", ") || "全部"}
- 聯盟: ${persona.specialties.leagues.join(", ") || "全部"}
- 球隊: ${persona.specialties.teams.join(", ") || "不限"}

重要規則：
1. 必須用繁體中文撰寫
2. 綜合所有素材的資訊，寫出一篇正式的專欄文章或部落格文章
3. 絕對不可以直接翻譯或改寫任何一篇原文
4. 不可出現「根據報導」「據悉」「外媒指出」等轉述用語
5. 以專業部落客的口吻撰寫，有自己的觀點和分析
6. 文章長度 600-1200 字
7. 標題要有創意、吸引眼球${titleStyleHint ? `\n${titleStyleHint}` : ""}
8. 球員、教練、球隊等名稱保留英文原文，不要翻譯成中文（例如用 LeBron James 而非乔布朗·詹姆斯）
9. 只回覆 JSON，不要 markdown code block

分類：${category}
素材數量：${articles.length} 篇

${sourceSummaries}

請以純 JSON 格式回覆：{"title": "標題", "content": "文章內容", "category": "${category}"}`;
}

function buildOfficialRecapPrompt(
  league: string,
  articles: RawArticle[],
  persona: WriterPersona,
  titleStyleHint?: string
): string {
  const sourceSummaries = articles
    .map(
      (a, i) =>
        `【${i + 1}】${a.source}: ${a.title}\n${a.content.substring(0, 1000)}`
    )
    .join("\n\n---\n\n");

  return `你是 HowgerSport 的官方體育編輯，負責撰寫每日聯盟綜合戰報。

你的寫作風格：
${persona.style_prompt}

重要規則：
1. 必須用繁體中文撰寫
2. 這是一篇「${league} 每日綜合戰報」，要涵蓋今日所有重要賽事和新聞
3. 以正式新聞編輯的角度撰寫，客觀、專業、有深度
4. 開頭用一段簡短的摘要，然後逐場/逐事件報導
5. 每個重點賽事要有比分、關鍵球員表現、簡要分析
6. 結尾可以展望接下來的賽程
7. 文章長度 800-1500 字
8. 標題必須包含「${league}」關鍵字，風格要專業且吸引眼球${titleStyleHint ? `\n${titleStyleHint}` : ""}
9. 球員、教練、球隊等名稱保留英文原文，不要翻譯成中文（例如用 LeBron James 而非乔布朗·詹姆斯）
10. 只回覆 JSON，不要 markdown code block

素材數量：${articles.length} 篇

${sourceSummaries}

請以純 JSON 格式回覆：{"title": "標題", "content": "文章內容", "category": "${league}"}`;
}

interface PlanItem {
  id: string;
  writer_persona_id: string;
  title: string;
  raw_article_ids: string[];
  league: string | null;
  plan_type: string;
}

// === 從規劃項目產出文章（produce 模式）===
async function produceFromPlans(planIds: string[]) {
  console.log(`\n[${new Date().toLocaleString("zh-TW")}] === 從規劃產出文章 ===`);
  console.log(`待產出規劃: ${planIds.length} 個`);

  // 取得規劃項目
  const { data: plans } = await supabase
    .from("rewrite_plans")
    .select("*")
    .in("id", planIds);

  if (!plans?.length) {
    console.log("找不到規劃項目");
    return;
  }

  // 取得所有相關的寫手
  const personaIds = [...new Set(plans.map((p) => p.writer_persona_id))];
  const { data: personas } = await supabase
    .from("writer_personas")
    .select("id, name, style_prompt, writer_type, specialties")
    .in("id", personaIds);

  if (!personas?.length) {
    console.log("找不到對應寫手");
    return;
  }

  const personaMap = Object.fromEntries(personas.map((p) => [p.id, p as WriterPersona]));

  // 取得所有相關的原始文章
  const allRawIds = [...new Set(plans.flatMap((p) => p.raw_article_ids || []))];
  const { data: rawArticles } = await supabase
    .from("raw_articles")
    .select("*")
    .in("id", allRawIds);

  if (!rawArticles?.length) {
    console.log("找不到原始文章");
    return;
  }

  const rawMap = Object.fromEntries(rawArticles.map((a) => [a.id, a as RawArticle]));

  // 讀取各球種的標題風格提詞
  const { data: sportSettings } = await supabase
    .from("sport_settings")
    .select("sport_key, title_prompt")
    .eq("enabled", true);

  const titlePromptMap: Record<string, string> = {};
  if (sportSettings) {
    for (const s of sportSettings) {
      if (s.title_prompt) titlePromptMap[s.sport_key] = s.title_prompt;
    }
  }

  let success = 0;
  let failed = 0;
  const producedPlanIds: string[] = [];

  for (const plan of plans as PlanItem[]) {
    const persona = personaMap[plan.writer_persona_id];
    if (!persona) {
      console.log(`  找不到寫手 ${plan.writer_persona_id}，跳過`);
      failed++;
      continue;
    }

    const articles = (plan.raw_article_ids || [])
      .map((id) => rawMap[id])
      .filter(Boolean);

    if (articles.length === 0) {
      console.log(`  規劃「${plan.title}」沒有對應文章，跳過`);
      failed++;
      continue;
    }

    console.log(`\n  [${plan.plan_type === "official" ? "官方戰報" : "專欄"}] ${persona.name} - "${plan.title}" (${articles.length} 篇素材)`);

    try {
      // 組裝標題風格提詞
      const titlePrompts = Object.values(titlePromptMap).filter(Boolean);
      const titleStyleHint = titlePrompts.length > 0
        ? `標題風格指引：\n${titlePrompts.join("\n")}`
        : undefined;

      let prompt: string;
      if (plan.plan_type === "official" && plan.league) {
        prompt = buildOfficialRecapPrompt(plan.league, articles, persona, titleStyleHint);
      } else {
        prompt = buildColumnistPrompt(articles, persona, titleStyleHint);
      }

      const output = callClaude(prompt);
      const result = parseResult(output);

      const { error: insertError } = await supabase
        .from("generated_articles")
        .insert({
          raw_article_ids: articles.map((a) => a.id),
          writer_persona_id: persona.id,
          title: result.title,
          content: result.content,
          category: result.category || plan.league || articles[0].category || "綜合",
          images: collectImages(articles),
          status: "draft",
        });

      if (insertError) {
        console.error(`    存檔失敗: ${insertError.message}`);
        failed++;
        continue;
      }

      // 標記原始素材為已處理
      const usedIds = articles.map((a) => a.id);
      await supabase
        .from("raw_articles")
        .update({ is_processed: true })
        .in("id", usedIds);

      console.log(`    完成: "${result.title}" (標記 ${usedIds.length} 篇素材為已處理)`);
      success++;
      producedPlanIds.push(plan.id);
    } catch (err) {
      console.error(`    失敗: ${err}`);
      failed++;
    }
  }

  // 刪除已產出的規劃項目
  if (producedPlanIds.length > 0) {
    await supabase.from("rewrite_plans").delete().in("id", producedPlanIds);
    console.log(`\n已移除 ${producedPlanIds.length} 個已產出的規劃項目`);
  }

  console.log(`\n=== 結果: 成功 ${success}, 失敗 ${failed} ===`);
}

// === 原始模式：自動掃描前一天文章改寫 ===
async function main() {
  // 檢查是否為 produce 模式
  const planIdsArg = process.argv.indexOf("--plan-ids");
  if (planIdsArg !== -1 && process.argv[planIdsArg + 1]) {
    const planIds = process.argv[planIdsArg + 1].split(",").filter(Boolean);
    return produceFromPlans(planIds);
  }

  console.log(
    `\n[${new Date().toLocaleString("zh-TW")}] === 開始手動改寫 ===`
  );

  // 取得啟用的寫手
  const { data: personas } = await supabase
    .from("writer_personas")
    .select("id, name, style_prompt, writer_type, specialties, max_articles")
    .eq("is_active", true);

  if (!personas?.length) {
    console.log("沒有啟用的寫手");
    return;
  }

  const columnists = personas.filter(
    (p) => (p.writer_type || "columnist") === "columnist"
  ) as (WriterPersona & { max_articles: number })[];
  const officials = personas.filter(
    (p) => p.writer_type === "official"
  ) as (WriterPersona & { max_articles: number })[];

  console.log(
    `寫手: ${columnists.length} 位專欄作家, ${officials.length} 位官方戰報`
  );

  // 取得最近 48 小時的文章
  const since = new Date();
  since.setHours(since.getHours() - 48);

  console.log(`查詢範圍: ${since.toLocaleString("zh-TW")} ~ 現在`);

  const { data: rawArticles } = await supabase
    .from("raw_articles")
    .select("*")
    .gte("crawled_at", since.toISOString())
    .order("crawled_at", { ascending: false });

  if (!rawArticles?.length) {
    console.log("沒有待處理的文章");
    return;
  }

  console.log(`找到 ${rawArticles.length} 篇未處理文章`);

  // 讀取各球種的標題風格提詞
  const { data: sportSettings } = await supabase
    .from("sport_settings")
    .select("sport_key, title_prompt")
    .eq("enabled", true);

  const titlePromptMap: Record<string, string> = {};
  if (sportSettings) {
    for (const s of sportSettings) {
      if (s.title_prompt) titlePromptMap[s.sport_key] = s.title_prompt;
    }
  }

  const titlePrompts = Object.values(titlePromptMap).filter(Boolean);
  const titleStyleHint = titlePrompts.length > 0
    ? `標題風格指引：\n${titlePrompts.join("\n")}`
    : undefined;

  let success = 0;
  let failed = 0;

  // === 官方戰報寫手：按聯盟出每日綜合戰報 ===
  for (const official of officials) {
    console.log(`\n[官方戰報] 寫手: ${official.name}`);

    const matched = rawArticles.filter((a) =>
      matchesSpecialties(a as RawArticle, official.specialties)
    );

    if (matched.length === 0) {
      console.log("  沒有匹配的文章");
      continue;
    }

    const leagueGroups = groupByLeague(matched as RawArticle[]);
    const maxArticles = official.max_articles || 2;
    let count = 0;

    console.log(
      `  匹配 ${matched.length} 篇，分成 ${Object.keys(leagueGroups).length} 個聯盟 (上限 ${maxArticles} 篇)`
    );

    for (const [league, articles] of Object.entries(leagueGroups)) {
      if (count >= maxArticles) break;
      if (articles.length < 1) continue;

      // 如果寫手有設定擅長聯盟，只產出該聯盟的戰報
      if (official.specialties.leagues.length > 0 && !official.specialties.leagues.includes(league)) {
        console.log(`  跳過 ${league} (不在擅長聯盟內)`);
        continue;
      }

      // 按主題分組，每組各產一篇
      const topicGroups = groupByTopic(articles);
      console.log(`  ${league} (${articles.length} 篇素材，分成 ${topicGroups.length} 個主題)`);

      for (const group of topicGroups) {
        if (count >= maxArticles) break;

        console.log(`  撰寫 ${league} 報導 (${group.length} 篇素材):`);
        group.forEach((a) => console.log(`    - ${a.title}`));

        try {
          const prompt = buildOfficialRecapPrompt(league, group, official, titleStyleHint);
          const output = callClaude(prompt);
          const result = parseResult(output);

          const { error: insertError } = await supabase
            .from("generated_articles")
            .insert({
              raw_article_ids: group.map((a) => a.id),
              writer_persona_id: official.id,
              title: result.title,
              content: result.content,
              category: result.category || league,
              images: collectImages(group),
              status: "draft",
            });

          if (insertError) {
            console.error(`    存檔失敗: ${insertError.message}`);
            failed++;
            continue;
          }

          await supabase
            .from("raw_articles")
            .update({ is_processed: true })
            .in("id", group.map((a) => a.id));

          console.log(`    完成: "${result.title}"`);
          success++;
          count++;
        } catch (err) {
          console.error(`    失敗: ${err}`);
          failed++;
        }
      }
    }
  }

  // === 專欄作家 ===
  for (const columnist of columnists) {
    console.log(`\n[專欄作家] 寫手: ${columnist.name}`);

    const matched = rawArticles.filter((a) =>
      matchesSpecialties(a as RawArticle, columnist.specialties)
    );

    if (matched.length === 0) {
      console.log("  沒有匹配的文章");
      continue;
    }

    const groups = groupByTopic(matched as RawArticle[]);
    const maxArticles = columnist.max_articles || 2;
    console.log(`  匹配 ${matched.length} 篇，分成 ${groups.length} 個主題 (上限 ${maxArticles} 篇)`);

    for (const group of groups.slice(0, maxArticles)) {
      console.log(
        `  改寫 ${group.length} 篇素材:`
      );
      group.forEach((a) => console.log(`    - ${a.title}`));

      try {
        const prompt = buildColumnistPrompt(group, columnist, titleStyleHint);
        const output = callClaude(prompt);
        const result = parseResult(output);

        const { error: insertError } = await supabase
          .from("generated_articles")
          .insert({
            raw_article_ids: group.map((a) => a.id),
            writer_persona_id: columnist.id,
            title: result.title,
            content: result.content,
            category: result.category || group[0].category || "綜合",
            images: collectImages(group),
            status: "draft",
          });

        if (insertError) {
          console.error(`    存檔失敗: ${insertError.message}`);
          failed++;
          continue;
        }

        await supabase
          .from("raw_articles")
          .update({ is_processed: true })
          .in("id", group.map((a) => a.id));

        console.log(`    完成: "${result.title}"`);
        success++;
      } catch (err) {
        console.error(`    失敗: ${err}`);
        failed++;
      }
    }
  }

  console.log(`\n=== 結果: 成功 ${success}, 失敗 ${failed} ===`);
}

main().catch(console.error);
