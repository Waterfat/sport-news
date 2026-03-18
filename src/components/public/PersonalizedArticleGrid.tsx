"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CATEGORY_COLORS, CATEGORY_FALLBACK_IMAGES, formatRelativeTime, getFirstImageUrl } from "@/lib/constants";
import { Star } from "lucide-react";

interface FavoriteTeam {
  sport: string;
  teamId: string;
  name: string;
}

interface ArticleItem {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  published_at: string | null;
  view_count: number | null;
  slug: string | null;
  images: { url: string }[] | null;
  writerName: string | null;
}

function getExcerpt(content: string | null): string {
  if (!content) return "";
  const lines = content.split("\n").filter(Boolean);
  const firstParagraph = lines.find(
    (line) => !line.startsWith("#") && !line.startsWith("-") && !line.startsWith(">") && line.trim().length > 20
  );
  if (firstParagraph) {
    return firstParagraph.replace(/[#*_\[\]()>`~]/g, "").trim().slice(0, 120);
  }
  return content.replace(/[#*_>\-\n\[\]()>`~]/g, " ").trim().slice(0, 120);
}

export function PersonalizedArticleGrid({
  articles,
}: {
  articles: ArticleItem[];
}) {
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
  });

  const sortedArticles = useMemo(() => {
    if (favorites.length === 0) return articles;
    const favoriteNames = favorites.map((f) => f.name);
    return [...articles].sort((a, b) => {
      const aMatch = favoriteNames.some((name) => a.title.includes(name)) ? 1 : 0;
      const bMatch = favoriteNames.some((name) => b.title.includes(name)) ? 1 : 0;
      return bMatch - aMatch;
    });
  }, [favorites, articles]);

  const favoriteNames = useMemo(
    () => favorites.map((f) => f.name),
    [favorites]
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {sortedArticles.map((article, index) => {
        const colorClass = CATEGORY_COLORS[article.category ?? ""] ?? "bg-muted text-muted-foreground rounded-md";
        const thumbnail = getFirstImageUrl(article.images) || CATEGORY_FALLBACK_IMAGES[article.category ?? ""] || "/images/category-general.jpg";
        const isFavorite = favoriteNames.some((name) => article.title.includes(name));

        return (
          <Link
            key={article.id}
            href={`/news/${article.slug || article.id}`}
            className="group block animate-fade-in-up"
            style={{ animationDelay: `${Math.min(index, 11) * 50}ms` }}
          >
            {/* Desktop: vertical card */}
            <article className="hidden sm:block h-full rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:scale-[1.02] hover:border-brand/30 active:scale-[0.98] transition-all duration-200">
              <div className="aspect-video bg-muted relative overflow-hidden">
                <img
                  src={thumbnail}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {isFavorite && (
                  <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
                    <Star className="w-3 h-3 fill-current" />
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  {article.category && (
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
                      {article.category}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(article.published_at)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-card-foreground leading-snug mb-2 line-clamp-2 group-hover:text-brand transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {getExcerpt(article.content)}
                </p>
                {article.writerName && (
                  <div className="text-xs text-muted-foreground">
                    <span>{article.writerName}</span>
                  </div>
                )}
              </div>
            </article>

            {/* Mobile: horizontal card */}
            <article className="sm:hidden rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-brand/30 active:scale-[0.98] transition-all duration-200">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {isFavorite && (
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-400 flex-shrink-0" />
                    )}
                    {article.category && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
                        {article.category}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(article.published_at)}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-card-foreground leading-snug mb-1 line-clamp-2 group-hover:text-brand transition-colors">
                    {article.title}
                  </h3>
                  {article.writerName && (
                    <div className="text-xs text-muted-foreground">
                      <span>{article.writerName}</span>
                    </div>
                  )}
                </div>
                <img
                  src={thumbnail}
                  alt=""
                  className="w-28 h-20 object-cover rounded-lg flex-shrink-0"
                />
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
