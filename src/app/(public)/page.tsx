import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { TelegramBanner } from "@/components/TelegramCTA";
import { formatRelativeTime } from "@/lib/constants";
import { PersonalizedArticleGrid } from "@/components/public/PersonalizedArticleGrid";

// 每 60 秒重新驗證頁面資料
export const revalidate = 60;

type ArticleWithWriter = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  published_at: string | null;
  view_count: number | null;
  slug: string | null;
  writer_persona_id: string | null;
  images: { url: string }[] | null;
  writer_personas: { name: string } | null;
};

function getArticleHref(article: { slug: string | null; id: string }) {
  return `/news/${article.slug || article.id}`;
}

export default async function HomePage() {
  const supabase = createServiceClient();

  const { data: articles } = await supabase
    .from("generated_articles")
    .select("id, title, content, category, published_at, view_count, slug, writer_persona_id, images, writer_personas(name)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(13);

  const allArticles = (articles || []) as unknown as ArticleWithWriter[];
  const hero = allArticles[0] || null;
  const gridArticles = allArticles.slice(1, 13);

  return (
    <div>
      {/* Hero Section */}
      {hero && (() => {
        const heroImage = hero.images?.[0]?.url;
        return (
          <Link href={getArticleHref(hero)} className="block group mb-10">
            <article className="relative rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 p-8 sm:p-12 text-white overflow-hidden min-h-[280px] flex items-end active:scale-[0.99] transition-transform duration-150">
              <img
                src={heroImage || "/images/hero-sports-bg.jpg"}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="relative z-10">
                {hero.category && (
                  <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-600 text-white mb-4">
                    {hero.category}
                  </span>
                )}
                <h1 className="text-2xl sm:text-4xl font-bold leading-tight mb-3 group-hover:text-blue-300 transition-colors">
                  {hero.title}
                </h1>
                <p className="text-gray-300 text-sm sm:text-base line-clamp-2 max-w-2xl mb-4">
                  {hero.content?.replace(/[#*_>\-\n]/g, " ").slice(0, 200)}
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {hero.writer_personas?.name && (
                    <span>{hero.writer_personas.name}</span>
                  )}
                  <span>&middot;</span>
                  <span>{formatRelativeTime(hero.published_at)}</span>
                  <span>&middot;</span>
                  <span>{hero.view_count ?? 0} views</span>
                </div>
              </div>
            </article>
          </Link>
        );
      })()}

      {/* Telegram CTA Banner */}
      <div className="mb-8">
        <TelegramBanner />
      </div>

      {/* Recent Articles */}
      <section>
        <h2 className="text-xl font-bold text-slate-900 mb-6 border-l-4 border-blue-600 pl-3">最新報導</h2>
        {gridArticles.length === 0 ? (
          <p className="text-slate-500">目前沒有已發布的文章。</p>
        ) : (
          <PersonalizedArticleGrid
            articles={gridArticles.map((article) => ({
              id: article.id,
              title: article.title,
              content: article.content,
              category: article.category,
              published_at: article.published_at,
              view_count: article.view_count,
              slug: article.slug,
              images: article.images,
              writerName: article.writer_personas?.name ?? null,
            }))}
          />
        )}
      </section>
    </div>
  );
}
