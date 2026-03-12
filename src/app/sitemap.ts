import { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://sportnews.example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServiceClient();

  // Fetch all published articles
  const { data: articles } = await supabase
    .from("generated_articles")
    .select("id, slug, published_at, category")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  // Fetch all active writers
  const { data: writers } = await supabase
    .from("writer_personas")
    .select("id")
    .eq("is_active", true);

  const entries: MetadataRoute.Sitemap = [];

  // Homepage
  entries.push({
    url: SITE_URL,
    lastModified: new Date(),
    changeFrequency: "hourly",
    priority: 1,
  });

  // Category pages
  const categories = ["nba", "mlb", "soccer", "general"];
  for (const cat of categories) {
    entries.push({
      url: `${SITE_URL}/category/${cat}`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.8,
    });
  }

  // Article pages
  if (articles) {
    for (const article of articles) {
      entries.push({
        url: `${SITE_URL}/news/${article.slug || article.id}`,
        lastModified: article.published_at
          ? new Date(article.published_at)
          : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  // Writer pages
  if (writers) {
    for (const writer of writers) {
      entries.push({
        url: `${SITE_URL}/writer/${writer.id}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.5,
      });
    }
  }

  return entries;
}
