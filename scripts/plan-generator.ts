/**
 * 規劃產生器 — 為每位寫手產生預計文章標題列表
 *
 * 使用 Claude CLI 快速產生標題（不產生全文），
 * 結果存入 rewrite_plans 表供後台審核。
 *
 * 使用方式：npx tsx scripts/plan-generator.ts
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "..", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

interface Specialties { sports: string[]; leagues: string[]; teams: string[]; }
interface WriterPersona { id: string; name: string; style_prompt: string; writer_type: string; specialties: Specialties; max_articles: number; }
interface RawArticle { id: string; source: string; title: string; content: string; category: string | null; crawled_at: string; }

// --- Matching logic (same as local-rewriter.ts) ---
function matchesSpecialties(article: RawArticle, spec: Specialties): boolean {
  if (spec.sports.length === 0 && spec.leagues.length === 0 && spec.teams.length === 0) return true;

  const fullText = article.title + " " + article.content;

  const sportKeywords: Record<string, RegExp[]> = {
    籃球: [/\bnba\b/i, /\bbasketball\b/i, /籃球/, /\bncaam\b/i, /\bncaaw\b/i, /\bwnba\b/i, /\bmarch madness\b/i],
    棒球: [/\bmlb\b/i, /\bbaseball\b/i, /棒球/, /大聯盟/, /中職/, /日職/, /\bwbc\b/i],
    美式足球: [/\bnfl\b/i, /美式足球/, /超級盃/, /\bsuper bowl\b/i, /\bfootball\b/i, /\btouchdown\b/i, /\bquarterback\b/i],
    足球: [/\bsoccer\b/i, /足球/, /英超/, /西甲/, /德甲/, /義甲/, /法甲/, /歐冠/, /世界盃/, /\bmls\b/i, /\bpremier league\b/i],
    冰球: [/\bnhl\b/i, /\bhockey\b/i, /冰球/],
    網球: [/\btennis\b/i, /網球/, /大滿貫/],
    綜合: [],
  };

  // 加權計數：計算文章中各球種的關鍵字命中次數，判斷文章的主分類
  const articleSportCounts: Record<string, number> = {};
  for (const [sport, patterns] of Object.entries(sportKeywords)) {
    if (sport === "綜合") continue;
    let count = 0;
    for (const re of patterns) {
      const matches = fullText.match(new RegExp(re.source, re.flags + (re.flags.includes("g") ? "" : "g")));
      if (matches) count += matches.length;
    }
    if (count > 0) articleSportCounts[sport] = count;
  }

  // 找出命中次數最高的球種作為文章主分類
  const dominantSport = Object.entries(articleSportCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  for (const sport of spec.sports) {
    if (sport === "綜合") return true;
    // 文章主分類必須是寫手擅長的球種
    if (dominantSport === sport) return true;
  }

  const leagueKeywords: Record<string, RegExp[]> = {
    NBA: [/\bnba\b/i], MLB: [/\bmlb\b/i, /大聯盟/], NFL: [/\bnfl\b/i], MLS: [/\bmls\b/i],
    英超: [/英超/, /\bpremier league\b/i], 西甲: [/西甲/, /\bla liga\b/i],
    德甲: [/德甲/, /\bbundesliga\b/i], 義甲: [/義甲/, /\bserie a\b/i],
    法甲: [/法甲/, /\bligue 1\b/i], 歐冠: [/歐冠/, /\buchampions league\b/i],
    NHL: [/\bnhl\b/i], 中職: [/中職/, /\bcpbl\b/i], 日職: [/日職/, /\bnpb\b/i],
  };

  for (const league of spec.leagues) {
    const patterns = leagueKeywords[league] || [new RegExp(`\\b${league}\\b`, "i")];
    if (patterns.some((re) => re.test(fullText))) return true;
  }

  for (const team of spec.teams) {
    if (fullText.toLowerCase().includes(team.toLowerCase())) return true;
  }

  return false;
}

function groupByLeague(articles: RawArticle[]): Record<string, RawArticle[]> {
  const groups: Record<string, RawArticle[]> = {};
  const detectors: [string, RegExp[]][] = [
    ["NBA", [/\bnba\b/i]], ["MLB", [/\bmlb\b/i, /大聯盟/]], ["NFL", [/\bnfl\b/i]],
    ["NCAAM", [/\bncaam\b/i, /\bmarch madness\b/i, /\bncaa\b/i]],
    ["英超", [/英超/, /\bpremier league\b/i]], ["西甲", [/西甲/]], ["歐冠", [/歐冠/]],
    ["NHL", [/\bnhl\b/i]], ["WBC", [/\bwbc\b/i]], ["WNBA", [/\bwnba\b/i]],
    ["中職", [/中職/]], ["日職", [/日職/]],
  ];

  for (const a of articles) {
    const t = a.title + " " + a.content + " " + (a.category || "");
    let assigned = false;
    for (const [league, patterns] of detectors) {
      if (patterns.some((re) => re.test(t))) {
        (groups[league] ??= []).push(a);
        assigned = true;
        break;
      }
    }
    if (!assigned) (groups["綜合"] ??= []).push(a);
  }
  return groups;
}

const MAX_GROUP_SIZE = 5;

function groupByTopic(articles: RawArticle[]): RawArticle[][] {
  const groups: RawArticle[][] = [];
  const used = new Set<string>();
  for (const article of articles) {
    if (used.has(article.id)) continue;
    const group = [article];
    used.add(article.id);
    const names1 = extractNames(article.title);
    for (const other of articles) {
      if (used.has(other.id) || group.length >= MAX_GROUP_SIZE) break;
      const names2 = extractNames(other.title);
      if (names1.some((n) => names2.includes(n))) {
        group.push(other);
        used.add(other.id);
      }
    }
    groups.push(group);
  }
  return groups;
}

function extractNames(text: string): string[] {
  const matches = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g) || [];
  return [...new Set(matches.filter((n) => n.split(" ").length <= 4).map((n) => n.toLowerCase()))];
}

// --- Claude title generation ---
function callClaudeForTitles(prompt: string): string[] {
  const tmpPrompt = join(tmpdir(), `plan-prompt-${Date.now()}.txt`);
  const tmpOutput = join(tmpdir(), `plan-output-${Date.now()}.txt`);
  writeFileSync(tmpPrompt, prompt, "utf-8");

  const env = { ...process.env };
  delete env.CLAUDECODE;
  delete env.ANTHROPIC_API_KEY;

  spawnSync("bash", ["-c", `cat "${tmpPrompt}" | claude -p --model sonnet > "${tmpOutput}" 2>&1`], {
    encoding: "utf-8", timeout: 60000, maxBuffer: 1024 * 1024, env,
  });

  let output = "";
  try { output = readFileSync(tmpOutput, "utf-8"); } catch {}
  try { unlinkSync(tmpPrompt); } catch {}
  try { unlinkSync(tmpOutput); } catch {}

  // Parse JSON array of titles
  const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed.titles && Array.isArray(parsed.titles)) return parsed.titles.map(String);
  } catch {}

  // Fallback: extract lines that look like titles
  return cleaned.split("\n").filter((l) => l.trim().length > 5).slice(0, 5);
}

// --- Main ---
export async function generatePlans() {
  console.log(`\n[${new Date().toLocaleString("zh-TW")}] === 開始產生規劃 ===`);

  const { data: personas } = await supabase
    .from("writer_personas")
    .select("id, name, style_prompt, writer_type, specialties, max_articles")
    .eq("is_active", true);

  if (!personas?.length) { console.log("沒有啟用的寫手"); return; }

  const columnists = personas.filter((p) => (p.writer_type || "columnist") === "columnist") as WriterPersona[];
  const officials = personas.filter((p) => p.writer_type === "official") as WriterPersona[];

  // 取得最近 48 小時的文章（確保跨日爬取的文章都能納入）
  const since = new Date();
  since.setHours(since.getHours() - 48);

  const { data: rawArticles } = await supabase
    .from("raw_articles").select("*")
    .gte("crawled_at", since.toISOString())
    .order("crawled_at", { ascending: false });

  if (!rawArticles?.length) { console.log("沒有昨日文章"); return; }

  // 過濾掉垃圾文章（標題太短或只是分類名）
  const validArticles = rawArticles.filter((a) => {
    if (!a.title || a.title.trim().length < 10) return false;
    // 過濾只有分類名稱的文章
    const categoryNames = ["NBA", "MLB", "NFL", "NHL", "NCAAM", "NCAAW", "WNBA", "MLS", "Soccer", "Tennis", "Hockey"];
    if (categoryNames.some((c) => a.title.trim().toUpperCase() === c.toUpperCase())) return false;
    return true;
  });

  if (!validArticles.length) { console.log("沒有有效的昨日文章"); return; }
  console.log(`找到 ${rawArticles.length} 篇昨日文章，其中 ${validArticles.length} 篇有效`);

  const plans: { writer_persona_id: string; title: string; raw_article_ids: string[]; league: string | null; plan_type: string; }[] = [];

  // 追蹤已規劃的文章 ID，用於跨寫手去重
  const plannedArticleIds = new Set<string>();

  // 官方戰報：先按聯盟篩選，再按主題分組
  for (const official of officials) {
    const matched = validArticles.filter((a) => matchesSpecialties(a as RawArticle, official.specialties));
    if (!matched.length) continue;

    const leagueGroups = groupByLeague(matched as RawArticle[]);
    const maxArticles = official.max_articles || 2;
    let count = 0;

    for (const [league, articles] of Object.entries(leagueGroups)) {
      if (count >= maxArticles) break;
      if (articles.length < 1) continue;

      // 如果寫手有設定擅長聯盟，只產出該聯盟的戰報
      if (official.specialties.leagues.length > 0 && !official.specialties.leagues.includes(league)) {
        console.log(`[官方] ${official.name} - 跳過 ${league} (不在擅長聯盟內)`);
        continue;
      }

      // 將該聯盟的文章按主題分組，每組產一個規劃
      const topicGroups = groupByTopic(articles);
      console.log(`[官方] ${official.name} - ${league} (${articles.length} 篇素材，分成 ${topicGroups.length} 個主題)`);

      for (const group of topicGroups) {
        if (count >= maxArticles) break;

        const summaries = group.map((a) => `- ${a.title}\n  ${a.content.substring(0, 200)}`).join("\n\n");
        const prompt = `根據以下體育新聞素材，為一篇 ${league} 報導想一個繁體中文標題。標題要具體描述主題內容，吸引讀者點擊。球員、教練等人名保留英文原文，不要翻譯成中文。只回覆一個標題，不要其他文字。\n\n${summaries}`;

        const titles = callClaudeForTitles(prompt);
        const title = titles[0] || group[0].title;

        plans.push({
          writer_persona_id: official.id,
          title,
          raw_article_ids: group.map((a) => a.id),
          league,
          plan_type: "official",
        });
        group.forEach((a) => plannedArticleIds.add(a.id));
        count++;
      }
    }
  }

  // 專欄作家
  for (const columnist of columnists) {
    const matched = validArticles.filter((a) => matchesSpecialties(a as RawArticle, columnist.specialties));
    if (!matched.length) continue;

    const groups = groupByTopic(matched as RawArticle[]);
    const maxArticles = columnist.max_articles || 2;
    let produced = 0;

    for (const group of groups) {
      if (produced >= maxArticles) break;

      // 跨寫手去重：如果這組素材全部都已被其他規劃使用，跳過
      const newArticles = group.filter((a) => !plannedArticleIds.has(a.id));
      if (newArticles.length === 0) {
        console.log(`[專欄] ${columnist.name} - 跳過 (${group.length} 篇素材皆已被其他規劃使用)`);
        continue;
      }

      const summaries = group.map((a) => `- ${a.title}\n  ${a.content.substring(0, 200)}`).join("\n\n");
      const sportHint = columnist.specialties.sports.length > 0 ? `你專長的領域是：${columnist.specialties.sports.join("、")}。` : "";
      const prompt = `你是專欄作家「${columnist.name}」。${sportHint}根據以下素材，想一個吸引人的繁體中文文章標題。注意正確辨別文章的運動類型，不要搞混。球員、教練等人名保留英文原文，不要翻譯成中文。只回覆一個標題，不要其他文字。\n\n${summaries}`;

      console.log(`[專欄] ${columnist.name} - ${group.length} 篇素材`);
      const titles = callClaudeForTitles(prompt);
      const title = titles[0] || group[0].title;

      plans.push({
        writer_persona_id: columnist.id,
        title,
        raw_article_ids: group.map((a) => a.id),
        league: null,
        plan_type: "columnist",
      });
      group.forEach((a) => plannedArticleIds.add(a.id));
      produced++;
    }
  }

  if (plans.length > 0) {
    const { error } = await supabase.from("rewrite_plans").insert(plans);
    if (error) {
      console.error("儲存規劃失敗:", error.message);
      return;
    }
    console.log(`\n=== 已產生 ${plans.length} 個規劃項目 ===`);
  } else {
    console.log("沒有產生任何規劃");
  }
}

// 直接執行
if (require.main === module) {
  generatePlans().catch(console.error);
}
