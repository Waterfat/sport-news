import { createServiceClient } from "@/lib/supabase";
import { SITE_URL } from "@/lib/constants";

export async function GET() {
  const supabase = createServiceClient();

  const { data: articles } = await supabase
    .from("generated_articles")
    .select("id, title, content, category, published_at, slug")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  const items = (articles || [])
    .map((article) => {
      const link = `${SITE_URL}/news/${article.slug || article.id}`;
      const description = article.content
        ?.replace(/[#*_>\-\n]/g, " ")
        .slice(0, 300);
      const pubDate = article.published_at
        ? new Date(article.published_at).toUTCString()
        : "";

      return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${description}]]></description>
      <category>${article.category || ""}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>SportNews</title>
    <link>${SITE_URL}</link>
    <description>最新體育新聞報導</description>
    <language>zh-TW</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
