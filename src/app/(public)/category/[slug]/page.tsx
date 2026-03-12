import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { CATEGORY_COLORS, CATEGORY_DB_MAP, CATEGORY_LABELS, formatDateShort } from "@/lib/constants";

export const revalidate = 60;

const comingSoonCategories = new Set(["mlb", "soccer", "general"]);

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
    return { title: "分類未找到 - SportNews" };
  }

  return {
    title: `${displayLabel}新聞 - SportNews`,
    description: `閱讀最新的${displayLabel}體育新聞報導`,
    openGraph: {
      title: `${displayLabel}新聞 - SportNews`,
      description: `閱讀最新的${displayLabel}體育新聞報導`,
      siteName: "SportNews",
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page: pageParam } = await searchParams;
  const categoryName = CATEGORY_DB_MAP[slug];
  const displayLabel = CATEGORY_LABELS[slug];

  if (!categoryName) {
    notFound();
  }

  const colorClass = CATEGORY_COLORS[categoryName] ?? "bg-gray-100 text-gray-800";

  // 敬請期待分類
  if (comingSoonCategories.has(slug)) {
    return (
      <div>
        <div className="mb-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-700 transition-colors">
              首頁
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-medium">{displayLabel}</span>
          </nav>
          <div className="flex items-center gap-3">
            <span
              className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${colorClass}`}
            >
              {displayLabel}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {displayLabel}新聞
            </h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-6">🏟️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">敬請期待</h2>
          <p className="text-gray-500 max-w-md">
            {displayLabel}新聞即將上線，請持續關注 SportNews！
          </p>
          <Link
            href="/"
            className="mt-8 px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
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

  // Get paginated articles
  const { data: articles } = await supabase
    .from("generated_articles")
    .select(
      "id, title, content, category, published_at, view_count, slug, images, writer_personas(name)"
    )
    .eq("status", "published")
    .eq("category", categoryName)
    .order("published_at", { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700 transition-colors">
            首頁
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{displayLabel}</span>
        </nav>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${colorClass}`}
          >
            {displayLabel}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {displayLabel}新聞
          </h1>
        </div>
        <p className="text-gray-500 mt-2">
          共 {totalCount} 篇報導
        </p>
      </div>

      {/* Articles */}
      {!articles || articles.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">
          此分類目前沒有文章。
        </p>
      ) : (
        <div className="space-y-4 mb-8">
          {(articles as unknown as ArticleWithWriter[]).map((article) => {
            const writerName = article.writer_personas?.name;
            const thumbnail = article.images?.[0]?.url;
            return (
              <Link
                key={article.id}
                href={`/news/${article.slug || article.id}`}
                className="group block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                      {article.title}
                    </h2>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                      {article.content
                        ?.replace(/[#*_>\-\n]/g, " ")
                        .slice(0, 160)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {writerName && <span>{writerName}</span>}
                      <span>{formatDateShort(article.published_at)}</span>
                      <span>{article.view_count ?? 0} views</span>
                    </div>
                  </div>
                  {thumbnail && (
                    <img
                      src={thumbnail}
                      alt=""
                      className="w-28 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
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
              href={`/category/${slug}?page=${currentPage - 1}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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
                  <span key={`e${i}`} className="px-2 text-gray-400">
                    ...
                  </span>
                ) : (
                  <Link
                    key={item}
                    href={`/category/${slug}?page=${item}`}
                    className={`w-10 h-10 flex items-center justify-center text-sm font-medium rounded-lg transition-colors ${
                      item === currentPage
                        ? "bg-gray-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}
          </div>
          {currentPage < totalPages && (
            <Link
              href={`/category/${slug}?page=${currentPage + 1}`}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              下一頁
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
