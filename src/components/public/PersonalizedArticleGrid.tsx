"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CATEGORY_COLORS, CATEGORY_FALLBACK_IMAGES, formatRelativeTime, getFirstImageUrl } from "@/lib/constants";
import { Star } from "lucide-react";
import { newsUrl } from "@/lib/routes";
import { getExcerpt } from "@/lib/utils";

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

  if (sortedArticles.length === 0) return null;

  const [featured, ...rest] = sortedArticles;
  const featuredColorClass = CATEGORY_COLORS[featured.category ?? ""] ?? "bg-muted text-muted-foreground rounded-md";
  const featuredThumbnail = getFirstImageUrl(featured.images) || CATEGORY_FALLBACK_IMAGES[featured.category ?? ""] || "/images/category-general.jpg";
  const featuredIsFavorite = favoriteNames.some((name) => featured.title.includes(name));

  return (
    <div>
      {/* Featured article — first article, image left + text right */}
      <Link
        href={newsUrl(featured.slug || featured.id)}
        className="group block mb-5 animate-fade-in-up"
      >
        <article className="grid grid-cols-1 sm:grid-cols-2 rounded-xl border border-border bg-card overflow-hidden hover:shadow-lg hover:border-brand/30 active:scale-[0.99] transition-all duration-200">
          <div className="aspect-[4/3] sm:aspect-auto overflow-hidden relative">
            <img
              src={featuredThumbnail}
              alt=""
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            />
            {featuredIsFavorite && (
              <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
                <Star className="w-3 h-3 fill-current" />
              </span>
            )}
          </div>
          <div className="p-6 sm:p-7 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-3">
              {featured.category && (
                <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${featuredColorClass}`}>
                  {featured.category}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(featured.published_at)}
              </span>
            </div>
            <h3 className="font-serif text-[19px] font-bold text-card-foreground leading-snug mb-2.5 line-clamp-2 group-hover:text-brand transition-colors">
              {featured.title}
            </h3>
            <p className="text-[13px] text-muted-foreground line-clamp-3 leading-relaxed mb-3">
              {getExcerpt(featured.content)}
            </p>
            {featured.writerName && (
              <div className="text-xs text-muted-foreground font-medium">{featured.writerName}</div>
            )}
          </div>
        </article>
      </Link>

      {/* Remaining articles — 2-col grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {rest.map((article, index) => {
          const colorClass = CATEGORY_COLORS[article.category ?? ""] ?? "bg-muted text-muted-foreground rounded-md";
          const thumbnail = getFirstImageUrl(article.images) || CATEGORY_FALLBACK_IMAGES[article.category ?? ""] || "/images/category-general.jpg";
          const isFavorite = favoriteNames.some((name) => article.title.includes(name));

          return (
            <Link
              key={article.id}
              href={newsUrl(article.slug || article.id)}
              className="group block animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index, 9) * 50}ms` }}
            >
              <article className="rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-brand/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200">
                <div className="aspect-video overflow-hidden relative">
                  <img
                    src={thumbnail}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                  />
                  {isFavorite && (
                    <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 rounded-full p-1">
                      <Star className="w-3 h-3 fill-current" />
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {article.category && (
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold ${colorClass}`}>
                        {article.category}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(article.published_at)}
                    </span>
                  </div>
                  <h3 className="font-serif text-[15px] font-bold text-card-foreground leading-snug mb-2 line-clamp-2 group-hover:text-brand transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {getExcerpt(article.content)}
                  </p>
                  {article.writerName && (
                    <div className="text-xs text-muted-foreground mt-2">{article.writerName}</div>
                  )}
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
