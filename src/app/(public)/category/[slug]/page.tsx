import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { CATEGORY_COLORS, CATEGORY_DB_MAP, CATEGORY_FALLBACK_IMAGES, CATEGORY_LABELS, formatRelativeTime, getFirstImageUrl, SITE_NAME } from "@/lib/constants";
import { categoryUrl, newsUrl } from "@/lib/routes";
import { getExcerpt } from "@/lib/utils";
import { CategorySidebar } from "@/components/public/CategorySidebar";

export const revalidate = 60;

const comingSoonCategories = new Set(["mlb", "soccer", "general"]);

const CATEGORY_BANNERS: Record<string, string> = {
  nba: "/images/category-nba.jpg",
  mlb: "/images/category-mlb.jpg",
  soccer: "/images/category-soccer.jpg",
  general: "/images/category-general.jpg",
};

type ArticleWithWriter = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  published_at: string | null;
  view_count: number | null;
  slug: string | null;
  images: { url: string }[] | null;
  writer_personas: { name: string } | null;
};

const ITEMS_PER_PAGE = 20;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const displayLabel = CATEGORY_LABELS[slug];

  if (!displayLabel) {
    return { title: "分類未找到 - ${SITE_NAME}" };
  }

  return {
    title: `${displayLabel}新聞 - ${SITE_NAME}`,
    description: `閱讀最新的${displayLabel}體育新聞報導`,
    openGraph: {
      title: `${displayLabel}新聞 - ${SITE_NAME}`,
      description: `閱讀最新的${displayLabel}體育新聞報導`,
      siteName: SITE_NAME,
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam, sort: sortParam } = await searchParams;
  const categoryName = CATEGORY_DB_MAP[slug];
  const displayLabel = CATEGORY_LABELS[slug];

  if (!categoryName) {
    notFound();
  }

  const colorClass = CATEGORY_COLORS[categoryName] ?? "bg-muted text-muted-foreground border border-border rounded-lg";
  const bannerImage = CATEGORY_BANNERS[slug];
  const sortBy = sortParam === "popular" ? "popular" : "latest";

  // 敬請期待分類
  if (comingSoonCategories.has(slug)) {
    return (
      <div>
        {/* Category Banner */}
        {bannerImage && (
          <div className="relative rounded-2xl overflow-hidden mb-8 h-[160px] sm:h-[200px]">
            <img src={bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 flex items-center h-full px-6 sm:px-10">
              <div>
                <span className={`inline-block px-3 py-1 text-sm font-semibold ${colorClass} mb-2`}>
                  {displayLabel}
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {displayLabel}新聞
                </h1>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl overflow-hidden mb-6 max-w-md">
            <img
              src="/images/coming-soon-sports.jpg"
              alt="敬請期待"
              className="w-full h-auto"
            />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">敬請期待</h2>
          <p className="text-muted-foreground max-w-md">
            {displayLabel}新聞即將上線，請持續關注 {SITE_NAME}！
          </p>
          <Link
            href="/"
            className="mt-8 px-6 py-2.5 bg-brand text-brand-foreground text-sm font-medium rounded-lg hover:opacity-90 transition-colors"
          >
            回到首頁
          </Link>
        </div>
      </div>
    );
  }

  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = createServiceClient();

  // Get total count
  const { count } = await supabase
    .from("generated_articles")
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .eq("category", categoryName);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  // Get paginated articles with sort
  const orderColumn = sortBy === "popular" ? "view_count" : "published_at";
  const { data: articles } = await supabase
    .from("generated_articles")
    .select(
      "id, title, content, category, published_at, view_count, slug, images, writer_personas(name)"
    )
    .eq("status", "published")
    .eq("category", categoryName)
    .order(orderColumn, { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  const buildUrl = (params: Record<string, string | number>) => {
    const searchParts: string[] = [];
    for (const [k, v] of Object.entries(params)) {
      searchParts.push(`${k}=${v}`);
    }
    return `${categoryUrl(slug)}?${searchParts.join("&")}`;
  };

  return (
    <div>
      {/* Category Banner */}
      {bannerImage && (
        <div className="relative rounded-2xl overflow-hidden mb-8 h-[160px] sm:h-[200px]">
          <img src={bannerImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 flex items-center h-full px-6 sm:px-10">
            <div>
              <span className={`inline-block px-3 py-1 text-sm font-semibold ${colorClass} mb-2`}>
                {displayLabel}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {displayLabel}新聞
              </h1>
              <p className="text-white/80 mt-1 text-sm">
                共 {totalCount} 篇報導
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb + Sort */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <nav className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-2 bg-muted rounded-full px-4 py-1.5">
            <Link href="/" className="text-muted-foreground hover:text-brand transition-colors">
              首頁
            </Link>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">{displayLabel}</span>
          </span>
        </nav>

        {/* Sort buttons */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Link
            href={buildUrl({ sort: "latest", page: 1 })}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sortBy === "latest"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            最新
          </Link>
          <Link
            href={buildUrl({ sort: "popular", page: 1 })}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              sortBy === "popular"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            最熱門
          </Link>
        </div>
      </div>

      {/* Main content + Sidebar grid */}
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
        {/* Main content */}
        <div>
          {/* Articles */}
          {!articles || articles.length === 0 ? (
            <p className="text-muted-foreground py-12 text-center">
              此分類目前沒有文章。
            </p>
          ) : (
            <div className="space-y-4 mb-8">
              {(articles as unknown as ArticleWithWriter[]).map((article) => {
                const writerName = article.writer_personas?.name;
                const thumbnail = getFirstImageUrl(article.images) || CATEGORY_FALLBACK_IMAGES[article.category ?? ""] || "/images/category-general.jpg";
                return (
                  <Link
                    key={article.id}
                    href={newsUrl(article.slug || article.id)}
                    className="group block rounded-xl border border-border bg-card p-5 hover:shadow-md hover:border-brand/30 transition-all duration-200"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-brand transition-colors mb-2">
                          {article.title}
                        </h2>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {getExcerpt(article.content)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {writerName && <span>{writerName}</span>}
                          {writerName && <span>&middot;</span>}
                          <span>{formatRelativeTime(article.published_at)}</span>
                          {sortBy === "popular" && article.view_count != null && article.view_count > 0 && (
                            <>
                              <span>&middot;</span>
                              <span>{article.view_count} 次瀏覽</span>
                            </>
                          )}
                        </div>
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

          {/* Pagination */}
          {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link
              href={buildUrl({ sort: sortBy, page: currentPage - 1 })}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:border-brand/30 hover:text-brand transition-colors"
            >
              上一頁
            </Link>
          )}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 2
              )
              .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) {
                  acc.push("ellipsis");
                }
                acc.push(p);
                return acc;
              }, [])
              .map((item, i) =>
                item === "ellipsis" ? (
                  <span key={`e${i}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={buildUrl({ sort: sortBy, page: item })}
                    className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg border transition-colors ${
                      item === currentPage
                        ? "bg-brand text-brand-foreground border-brand"
                        : "text-muted-foreground border-border hover:border-brand/30 hover:text-brand"
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}
          </div>
          {currentPage < totalPages && (
            <Link
              href={buildUrl({ sort: sortBy, page: currentPage + 1 })}
              className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:border-brand/30 hover:text-brand transition-colors"
            >
              下一頁
            </Link>
          )}
        </nav>
      )}
        </div>

        {/* Sidebar — desktop only inline, mobile below */}
        <aside className="mt-8 lg:mt-0">
          <CategorySidebar category={categoryName} />
        </aside>
      </div>
    </div>
  );
}
