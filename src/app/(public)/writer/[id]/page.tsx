import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { CATEGORY_COLORS, formatDateShort } from "@/lib/constants";

async function getWriter(id: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("writer_personas")
    .select("id, name, description")
    .eq("id", id)
    .single();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const writer = await getWriter(id);

  if (!writer) {
    return { title: "作者未找到 - SportNews" };
  }

  return {
    title: `${writer.name} - SportNews 作者`,
    description: writer.description || `閱讀 ${writer.name} 的體育報導`,
    openGraph: {
      title: `${writer.name} - SportNews 作者`,
      description: writer.description || `閱讀 ${writer.name} 的體育報導`,
      siteName: "SportNews",
    },
  };
}

export default async function WriterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const writer = await getWriter(id);

  if (!writer) {
    notFound();
  }

  const supabase = createServiceClient();
  const { data: articles } = await supabase
    .from("generated_articles")
    .select("id, title, slug, category, published_at, view_count, content")
    .eq("status", "published")
    .eq("writer_persona_id", id)
    .order("published_at", { ascending: false });

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-700 transition-colors">
          首頁
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{writer.name}</span>
      </nav>

      {/* Writer Profile */}
      <div className="bg-gray-50 rounded-2xl p-8 mb-10">
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {writer.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {writer.name}
            </h1>
            {writer.description && (
              <p className="text-gray-600 leading-relaxed">
                {writer.description}
              </p>
            )}
            <p className="text-sm text-gray-400 mt-3">
              共 {articles?.length ?? 0} 篇報導
            </p>
          </div>
        </div>
      </div>

      {/* Articles */}
      <h2 className="text-xl font-bold text-gray-900 mb-5">文章列表</h2>
      {!articles || articles.length === 0 ? (
        <p className="text-gray-500 py-12 text-center">
          此作者目前沒有已發布的文章。
        </p>
      ) : (
        <div className="space-y-4">
          {articles.map((article) => {
            const colorClass =
              CATEGORY_COLORS[article.category ?? ""] ??
              "bg-gray-100 text-gray-800";
            return (
              <Link
                key={article.id}
                href={`/news/${article.slug || article.id}`}
                className="group block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-lg hover:border-gray-300 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2">
                  {article.category && (
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}
                    >
                      {article.category}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatDateShort(article.published_at)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                  {article.title}
                </h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {article.content
                    ?.replace(/[#*_>\-\n]/g, " ")
                    .slice(0, 160)}
                </p>
                <span className="text-xs text-gray-400">
                  {article.view_count ?? 0} views
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
