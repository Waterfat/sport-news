import Anthropic from "@anthropic-ai/sdk";
import { createServiceClient } from "@/lib/supabase";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_BASE = `你是一個資深的體育新聞記者，你要根據多篇新聞素材，綜合消化後撰寫一篇全新的原創體育新聞文章。

重要規則：
1. 必須用繁體中文撰寫
2. 綜合所有素材的資訊，寫出一篇融合多方觀點的全新文章
3. 絕對不可以直接翻譯或改寫任何一篇原文，必須用完全不同的敘事結構和表達方式
4. 不可出現「根據報導」「據悉」「外媒指出」等新聞轉述用語
5. 用第一人稱的評論口吻或說故事的方式撰寫，像是記者親身觀察
6. 文章長度 400-800 字
7. 標題要有創意、吸引眼球，不可與任何素材標題相似
8. 產出格式為 JSON：{"title": "標題", "content": "內文"}`;

interface RawArticleInput {
  source: string;
  title: string;
  content: string;
  category: string | null;
}

export async function rewriteArticles(
  articles: RawArticleInput[],
  personaPrompt: string
): Promise<{ title: string; content: string }> {
  const systemPrompt = `${SYSTEM_BASE}\n\n你的寫作人設：\n${personaPrompt}`;

  const sourceSummaries = articles
    .map(
      (a, i) =>
        `【素材 ${i + 1}】\n標題：${a.title}\n內容：${a.content.substring(0, 1500)}`
    )
    .join("\n\n---\n\n");

  const category = articles[0].category || "綜合";

  const userMessage = `分類：${category}\n素材數量：${articles.length} 篇\n\n${sourceSummaries}\n\n請以 JSON 格式回覆：{"title": "你的創意標題", "content": "你的原創文章內容"}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI response is not valid JSON");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function processUnprocessedArticles(limit: number = 5): Promise<{
  processed: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  const errors: string[] = [];
  let processed = 0;

  const { data: rawArticles, error: fetchError } = await supabase
    .from("raw_articles")
    .select("*")
    .eq("is_processed", false)
    .order("crawled_at", { ascending: false })
    .limit(limit);

  if (fetchError || !rawArticles?.length) {
    return { processed: 0, errors: fetchError ? [fetchError.message] : [] };
  }

  const { data: personas } = await supabase
    .from("writer_personas")
    .select("*")
    .eq("is_active", true);

  if (!personas?.length) {
    return { processed: 0, errors: ["No active writer personas found"] };
  }

  // 按分類分組
  const grouped: Record<string, typeof rawArticles> = {};
  for (const article of rawArticles) {
    const cat = article.category || "綜合";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(article);
  }

  for (const [, group] of Object.entries(grouped)) {
    const persona = personas[Math.floor(Math.random() * personas.length)];

    try {
      const result = await rewriteArticles(group, persona.style_prompt);

      const { error: insertError } = await supabase
        .from("generated_articles")
        .insert({
          raw_article_ids: group.map((a: { id: string }) => a.id),
          writer_persona_id: persona.id,
          title: result.title,
          content: result.content,
          images: [],
          status: "draft",
        });

      if (insertError) {
        errors.push(`Failed to save: ${insertError.message}`);
        continue;
      }

      await supabase
        .from("raw_articles")
        .update({ is_processed: true })
        .in("id", group.map((a: { id: string }) => a.id));

      processed++;
    } catch (err) {
      errors.push(`AI rewrite failed: ${err}`);
    }
  }

  return { processed, errors };
}
