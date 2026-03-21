"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { TrendingUp, Star } from "lucide-react";
import { newsUrl } from "@/lib/routes";
import { formatRelativeTime } from "@/lib/constants";

interface TrendingArticle {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  view_count: number | null;
  published_at: string | null;
}

interface FavoriteTeam {
  sport: string;
  teamId: string;
  name: string;
}

const rankClass = (idx: number) => {
  if (idx === 0) return "text-amber-500";
  if (idx === 1) return "text-slate-400";
  if (idx === 2) return "text-amber-700";
  return "text-muted-foreground/40";
};

function WeeklyTrending({ category }: { category: string }) {
  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["trending-articles", category, "week"],
    queryFn: async () => {
      const res = await fetch(
        `/api/public/articles/trending?category=${encodeURIComponent(category)}&period=week&limit=5`
      );
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.articles ?? []) as TrendingArticle[];
    },
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center px-4 py-3.5 border-b border-border">
        <h3 className="font-serif text-[15px] font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-red-500" />
          本週熱門
        </h3>
      </div>

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
        <p className="text-sm text-muted-foreground p-4">本週暫無熱門文章</p>
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
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  {formatRelativeTime(article.published_at)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatedByTeam({ category }: { category: string }) {
  const { data: session } = useSession();

  const { data: favorites = [] } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const res = await fetch("/api/member/favorites");
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.favorites ?? []) as FavoriteTeam[];
    },
    enabled: !!session?.user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["related-by-team", category],
    queryFn: async () => {
      const res = await fetch(
        `/api/public/articles/trending?category=${encodeURIComponent(category)}&period=month&limit=10`
      );
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.articles ?? []) as TrendingArticle[];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Filter articles that mention favorite team names
  const favoriteNames = favorites.map((f) => f.name);
  const related = favoriteNames.length > 0
    ? articles.filter((a) => favoriteNames.some((name) => a.title.includes(name))).slice(0, 5)
    : [];

  if (!session?.user || related.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center px-4 py-3.5 border-b border-border">
        <h3 className="font-serif text-[15px] font-bold text-foreground flex items-center gap-1.5">
          <Star className="w-4 h-4 text-yellow-500" />
          我的球隊新聞
        </h3>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3.5 bg-muted rounded w-full mb-1.5" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div>
          {related.map((article) => (
            <Link
              key={article.id}
              href={newsUrl(article.slug || article.id)}
              className="group block px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
            >
              <h4 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                {article.title}
              </h4>
              <span className="text-[11px] text-muted-foreground mt-1 block">
                {formatRelativeTime(article.published_at)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function CategorySidebar({ category }: { category: string }) {
  return (
    <div className="space-y-6">
      <WeeklyTrending category={category} />
      <RelatedByTeam category={category} />
    </div>
  );
}
