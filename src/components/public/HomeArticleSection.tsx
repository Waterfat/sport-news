"use client";

import { useState, useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import Link from "next/link";
import { HomeCategoryFilter } from "./HomeCategoryFilter";
import { PersonalizedArticleGrid } from "./PersonalizedArticleGrid";
import { getCategorySlug } from "@/lib/constants";

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

export function HomeArticleSection({
  articles,
}: {
  articles: ArticleItem[];
}) {
  const [activeCategory, setActiveCategory] = useQueryState(
    "category",
    parseAsString.withDefault("all")
  );
  const [transitioning, setTransitioning] = useState(false);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return articles;
    return articles.filter((a) => a.category === activeCategory);
  }, [articles, activeCategory]);

  const showMoreLink = activeCategory !== "all" && filtered.length < 4;

  function handleCategoryChange(cat: string) {
    setTransitioning(true);
    setTimeout(() => {
      setActiveCategory(cat);
      setTransitioning(false);
    }, 150);
  }

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground border-l-4 border-brand pl-3">
          最新報導
        </h2>
      </div>

      <div className="mb-5">
        <HomeCategoryFilter active={activeCategory} onChange={handleCategoryChange} />
      </div>

      <div className={`transition-opacity duration-150 ${transitioning ? "opacity-0" : "opacity-100"}`}>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            此分類目前沒有文章
          </p>
        ) : (
          <PersonalizedArticleGrid articles={filtered} />
        )}
      </div>

      {showMoreLink && (
        <div className="mt-4 text-center">
          <Link
            href={`/category/${getCategorySlug(activeCategory)}`}
            className="text-sm text-brand hover:underline"
          >
            查看更多{activeCategory}文章 →
          </Link>
        </div>
      )}
    </section>
  );
}
