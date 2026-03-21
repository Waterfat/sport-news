"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { TrendingUp } from "lucide-react";
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
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const rankClass = (idx: number) => {
    if (idx === 0) return "text-amber-500";
    if (idx === 1) return "text-slate-400";
    if (idx === 2) return "text-amber-700";
    return "text-muted-foreground/40";
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Widget header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <h3 className="font-serif text-[15px] font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-red-500" />
          熱門文章
        </h3>
      </div>

      {/* Widget body */}
      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-6 h-6 bg-muted rounded" />
              <div className="flex-1">
                <div className="h-3.5 bg-muted rounded w-full mb-1.5" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <p className="text-sm text-muted-foreground p-4">暫無資料</p>
      ) : (
        <div>
          {articles.map((article, idx) => (
            <Link
              key={article.id}
              href={newsUrl(article.slug || article.id)}
              className="group flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
            >
              <span className={`font-serif text-[22px] font-black leading-none min-w-[26px] ${rankClass(idx)}`}>
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h4>
                {article.category && (
                  <span className="text-[11px] text-muted-foreground mt-1 block">
                    {article.category}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
