import { createServiceClient } from "@/lib/supabase";
import { HeroSection } from "@/components/public/HeroSection";
import { LiveScoreTicker } from "@/components/public/LiveScoreTicker";
import { HomeArticleSection } from "@/components/public/HomeArticleSection";
import { QuickStandings } from "@/components/public/QuickStandings";
import { QuickOdds } from "@/components/public/QuickOdds";
import { TrendingArticles } from "@/components/public/TrendingArticles";

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

async function getEnabledLeagues() {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("scoreboard_configs")
      .select("league_key, label")
      .eq("enabled", true)
      .order("sort_order");

    return (data ?? []).map((row) => ({
      key: row.league_key,
      label: row.label,
    }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const supabase = createServiceClient();

  const [articlesResult, leagues] = await Promise.all([
    supabase
      .from("generated_articles")
      .select("id, title, content, category, published_at, view_count, slug, writer_persona_id, images, writer_personas(name)")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(33),
    getEnabledLeagues(),
  ]);

  const allArticles = (articlesResult.data || []) as unknown as ArticleWithWriter[];
  const hero = allArticles[0] || null;
  const subHeroes = allArticles.slice(1, 3);
  const gridArticles = allArticles.slice(3, 33);

  return (
    <div>
      {/* Live Score Ticker */}
      <LiveScoreTicker leagues={leagues} />

      {/* Hero: 1 large + 2 small */}
      {hero && (
        <HeroSection
          hero={{
            ...hero,
            writerName: hero.writer_personas?.name ?? null,
          }}
          subHeroes={subHeroes.map((a) => ({
            ...a,
            writerName: a.writer_personas?.name ?? null,
          }))}
        />
      )}

      {/* Main content + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content area */}
        <div className="flex-1 min-w-0">
          <HomeArticleSection
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
        </div>

        {/* Sidebar - PC only */}
        <aside className="hidden lg:block w-[300px] flex-shrink-0 space-y-4">
          <div className="sticky top-4 space-y-4">
            <TrendingArticles />
            <QuickStandings />
            <QuickOdds />
          </div>
        </aside>
      </div>

      {/* Mobile: Standings + Odds below articles */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <QuickStandings />
        <QuickOdds />
      </div>
    </div>
  );
}
