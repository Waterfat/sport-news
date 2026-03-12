import Link from "next/link";
import { createServiceClient } from "@/lib/supabase";
import { TelegramBanner } from "@/components/TelegramCTA";

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
  writer_personas: { name: string } | null;
};

const categoryColors: Record<string, string> = {
  籃球: "bg-orange-100 text-orange-800",
  棒球: "bg-green-100 text-green-800",
  足球: "bg-blue-100 text-blue-800",
  綜合: "bg-purple-100 text-purple-800",
};

function getArticleHref(article: { slug: string | null; id: string }) {
  return `/news/${article.slug || article.id}`;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function HomePage() {
  const supabase = createServiceClient();

  const { data: articles } = await supabase
    .from("generated_articles")
    .select("id, title, content, category, published_at, view_count, slug, writer_persona_id, writer_personas(name)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(13);

  const allArticles = (articles || []) as unknown as ArticleWithWriter[];
  const hero = allArticles[0] || null;
  const gridArticles = allArticles.slice(1, 13);

  return (
    <div>
      {/* Hero Section */}
      {hero && (
        <Link href={getArticleHref(hero)} className="block group mb-10">
          <article className="relative rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 sm:p-12 text-white overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
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
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {hero.writer_personas?.name && (
                  <span>{hero.writer_personas.name}</span>
                )}
                <span>{formatDate(hero.published_at)}</span>
                <span>{hero.view_count ?? 0} views</span>
              </div>
            </div>
          </article>
        </Link>
      )}

      {/* Telegram CTA Banner */}
      <div className="mb-10">
        <TelegramBanner />
      </div>

      {/* Recent Articles */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-6">最新報導</h2>
        {gridArticles.length === 0 ? (
          <p className="text-gray-500">目前沒有已發布的文章。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gridArticles.map((article) => {
              const writerName = article.writer_personas?.name;
              const colorClass = categoryColors[article.category ?? ""] ?? "bg-gray-100 text-gray-800";

              return (
                <Link
                  key={article.id}
                  href={getArticleHref(article)}
                  className="group block"
                >
                  <article className="h-full rounded-xl border border-gray-200 bg-white p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      {article.category && (
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}
                        >
                          {article.category}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {formatDate(article.published_at)}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 leading-snug mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {article.content?.replace(/[#*_>\-\n]/g, " ").slice(0, 120)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      {writerName && <span>{writerName}</span>}
                      <span>{article.view_count ?? 0} views</span>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
