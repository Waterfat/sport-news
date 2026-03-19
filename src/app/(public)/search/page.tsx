import { Metadata } from "next";
import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { CATEGORY_COLORS, CATEGORY_FALLBACK_IMAGES, formatRelativeTime, getFirstImageUrl } from "@/lib/constants";
import { newsUrl } from "@/lib/routes";
import { SearchInput } from "./SearchInput";

export const metadata: Metadata = {
  title: "搜尋文章 - 超級運動資訊網",
};

interface SearchResult {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  published_at: string | null;
  images: { url: string }[] | null;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() || "";

  let articles: SearchResult[] = [];

  if (query) {
    const supabase = createServiceClient();
    const keyword = `%${query}%`;

    const { data } = await supabase
      .from("generated_articles")
      .select("id, title, slug, category, published_at, images")
      .eq("status", "published")
      .or(`title.ilike.${keyword},content.ilike.${keyword}`)
      .order("published_at", { ascending: false })
      .limit(20);

    articles = (data ?? []) as SearchResult[];
  }

  return (
    <div className="max-w-3xl mx-auto bg-card rounded-xl p-6 sm:p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-foreground mb-6">搜尋文章</h1>

      <SearchInput defaultValue={query} />

      {query && (
        <p className="text-sm text-muted-foreground mb-6">
          {articles.length > 0
            ? `找到 ${articles.length} 篇相關文章`
            : "找不到相關文章"}
        </p>
      )}

      {articles.length > 0 && (
        <div className="space-y-4">
          {articles.map((article) => {
            const colorClass =
              CATEGORY_COLORS[article.category ?? ""] ??
              "bg-muted text-muted-foreground border border-border rounded-lg";
            const thumbnail =
              getFirstImageUrl(article.images) ||
              CATEGORY_FALLBACK_IMAGES[article.category ?? ""] ||
              "/images/category-general.jpg";

            return (
              <Link
                key={article.id}
                href={newsUrl(article.slug || article.id)}
                className="group block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-blue-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {article.category && (
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium ${colorClass}`}
                        >
                          {article.category}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(article.published_at)}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h2>
                  </div>
                  <img
                    src={thumbnail}
                    alt=""
                    className="w-28 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {query && articles.length === 0 && (
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">
            找不到包含「{query}」的文章
          </p>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            回到首頁
          </Link>
        </div>
      )}
    </div>
  );
}
