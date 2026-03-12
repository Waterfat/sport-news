import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";

const categoryMap: Record<string, string> = {
  nba: "籃球",
  mlb: "棒球",
  soccer: "足球",
  general: "綜合",
};

const categoryColors: Record<string, string> = {
  籃球: "bg-orange-100 text-orange-800",
  棒球: "bg-green-100 text-green-800",
  足球: "bg-blue-100 text-blue-800",
  綜合: "bg-purple-100 text-purple-800",
};

type ArticleWithWriter = {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  published_at: string | null;
  view_count: number | null;
  slug: string | null;
  writer_personas: { name: string } | null;
};

const ITEMS_PER_PAGE = 20;

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const categoryName = categoryMap[slug];

  if (!categoryName) {
    return { title: "分類未找到 - SportNews" };
  }

  return {
    title: `${categoryName}新聞 - SportNews`,
    description: `閱讀最新的${categoryName}體育新聞報導`,
    openGraph: {
      title: `${categoryName}新聞 - SportNews`,
      description: `閱讀最新的${categoryName}體育新聞報導`,
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
  const categoryName = categoryMap[slug];

  if (!categoryName) {
    notFound();
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
      "id, title, content, category, published_at, view_count, slug, writer_personas(name)"
    )
    .eq("status", "published")
    .eq("category", categoryName)
    .order("published_at", { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  const colorClass = categoryColors[categoryName] ?? "bg-gray-100 text-gray-800";

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700 transition-colors">
            首頁
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{categoryName}</span>
        </nav>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${colorClass}`}
          >
            {categoryName}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {categoryName}新聞
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
            return (
              <Link
                key={article.id}
                href={`/news/${article.slug || article.id}`}
                className="group block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
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
                      <span>{formatDate(article.published_at)}</span>
                      <span>{article.view_count ?? 0} views</span>
                    </div>
                  </div>
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
