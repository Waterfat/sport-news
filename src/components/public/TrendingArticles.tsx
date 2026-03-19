"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp, Eye } from "lucide-react";
import { newsUrl } from "@/lib/routes";

interface TrendingArticle {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  view_count: number | null;
  published_at: string | null;
}

export function TrendingArticles() {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["trending-articles"],
    queryFn: async () => {
      const res = await fetch("/api/public/articles/trending");
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.articles ?? []) as TrendingArticle[];
    },
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
        <TrendingUp className="w-4 h-4 text-red-500" />
        熱門文章
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3.5 bg-muted rounded w-full mb-1.5" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-muted-foreground">暫無資料</p>
      ) : (
        <div className="space-y-3">
          {articles.map((article, idx) => (
            <Link
              key={article.id}
              href={newsUrl(article.slug || article.id)}
              className="group flex items-start gap-3 hover:bg-muted/50 -mx-2 px-2 py-1.5 rounded-lg transition-colors"
            >
              <span className="text-xs font-bold text-muted-foreground/60 mt-0.5 w-5 text-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-blue-600 transition-colors leading-snug">
                  {article.title}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  {article.category && (
                    <span className="text-xs text-muted-foreground">
                      {article.category}
                    </span>
                  )}
                  {article.view_count != null && article.view_count > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                      <Eye className="w-3 h-3" />
                      {article.view_count}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
