import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { CATEGORY_COLORS, formatDateFull, getCategorySlug, SITE_URL } from "@/lib/constants";
import ViewTracker from "./ViewTracker";

import LikeButton from "./LikeButton";
import { TelegramArticleCTA } from "@/components/TelegramCTA";

export const revalidate = 60;

function getContentExcerpt(content: string | null, maxLength = 160): string {
  if (!content) return "";
  return content.replace(/[#*_>\-\n]/g, " ").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

async function getArticle(slug: string) {
  const supabase = createServiceClient();

  // Try by slug first
  let { data: article } = await supabase
    .from("generated_articles")
    .select("*, writer_personas(id, name, description)")
    .eq("status", "published")
    .eq("slug", slug)
    .single();

  // Fallback to id
  if (!article) {
    const { data } = await supabase
      .from("generated_articles")
      .select("*, writer_personas(id, name, description)")
      .eq("status", "published")
      .eq("id", slug)
      .single();
    article = data;
  }

  return article;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    return { title: "文章未找到 - SportNews" };
  }

  const description = getContentExcerpt(article.content);

  const articleUrl = `${SITE_URL}/news/${article.slug || slug}`;

  return {
    title: `${article.title} - SportNews`,
    description,
    alternates: {
      canonical: articleUrl,
    },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      url: articleUrl,
      publishedTime: article.published_at ?? undefined,
      authors: article.writer_personas?.name
        ? [article.writer_personas.name]
        : undefined,
      siteName: "SportNews",
      locale: "zh_TW",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
    },
    other: {
      ...(article.published_at ? { "article:published_time": article.published_at } : {}),
      ...(article.category ? { "article:section": article.category } : {}),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getArticle(slug);

  if (!article) {
    notFound();
  }

  const writer = article.writer_personas as {
    id: string;
    name: string;
    description: string;
  } | null;

  // Fetch related articles (same category, exclude current)
  const supabase = createServiceClient();
  const { data: relatedArticles } = await supabase
    .from("generated_articles")
    .select("id, title, slug, category, published_at, view_count")
    .eq("status", "published")
    .eq("category", article.category)
    .neq("id", article.id)
    .order("published_at", { ascending: false })
    .limit(4);

  const colorClass =
    CATEGORY_COLORS[article.category ?? ""] ?? "bg-gray-100 text-gray-800";

  // Simple markdown-like rendering: split by paragraphs, handle headings
  const contentParagraphs: string[] = (article.content ?? "").split("\n").filter(Boolean);

  const articleUrl = `${SITE_URL}/news/${article.slug || slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: getContentExcerpt(article.content),
    datePublished: article.published_at,
    dateModified: article.published_at,
    author: writer ? { "@type": "Person", name: writer.name } : undefined,
    publisher: {
      "@type": "Organization",
      name: "SportNews",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category ?? undefined,
  };

  return (
    <article className="max-w-3xl mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ViewTracker slug={slug} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-gray-700 transition-colors">
          首頁
        </Link>
        <span>/</span>
        {article.category && (
          <>
            <Link
              href={`/category/${getCategorySlug(article.category)}`}
              className="hover:text-gray-700 transition-colors"
            >
              {article.category}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-400 truncate max-w-[200px]">
          {article.title}
        </span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        {article.category && (
          <span
            className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${colorClass} mb-4`}
          >
            {article.category}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          {writer && (
            <Link
              href={`/writer/${writer.id}`}
              className="font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              {writer.name}
            </Link>
          )}
          <time dateTime={article.published_at ?? ""}>
            {formatDateFull(article.published_at)}
          </time>
          <span className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {article.view_count ?? 0}
          </span>
        </div>
      </header>

      {/* Featured Image */}
      {article.images?.length > 0 && article.images[0]?.url && (
        <div className="mb-8 rounded-xl overflow-hidden">
          <img
            src={article.images[0].url}
            alt={article.images[0].caption || article.title}
            className="w-full max-h-[480px] object-cover"
          />
          {article.images[0].caption && (
            <p className="text-xs text-gray-400 mt-2">{article.images[0].caption}</p>
          )}
        </div>
      )}

      {/* Divider */}
      <hr className="border-gray-200 mb-8" />

      {/* Content */}
      <div className="prose prose-lg prose-gray max-w-none mb-12">
        {contentParagraphs.map((line, i) => {
          const trimmed = line.trim();
          if (trimmed.startsWith("### ")) {
            return (
              <h3
                key={i}
                className="text-xl font-bold text-gray-900 mt-8 mb-3"
              >
                {trimmed.slice(4)}
              </h3>
            );
          }
          if (trimmed.startsWith("## ")) {
            return (
              <h2
                key={i}
                className="text-2xl font-bold text-gray-900 mt-10 mb-4"
              >
                {trimmed.slice(3)}
              </h2>
            );
          }
          if (trimmed.startsWith("# ")) {
            return (
              <h2
                key={i}
                className="text-2xl font-bold text-gray-900 mt-10 mb-4"
              >
                {trimmed.slice(2)}
              </h2>
            );
          }
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            return (
              <div key={i} className="flex items-start gap-2 text-gray-700 leading-relaxed ml-4">
                <span className="select-none" aria-hidden="true">&#8226;</span>
                <span>{trimmed.slice(2)}</span>
              </div>
            );
          }
          if (trimmed.startsWith("> ")) {
            return (
              <blockquote
                key={i}
                className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4"
              >
                {trimmed.slice(2)}
              </blockquote>
            );
          }
          return (
            <p key={i} className="text-gray-700 leading-relaxed mb-4">
              {trimmed}
            </p>
          );
        })}
      </div>

      {/* Like Button */}
      <div className="mb-8">
        <LikeButton articleId={article.id} />
      </div>

      {/* Telegram CTA */}
      <TelegramArticleCTA />

      {/* Writer Info */}
      {writer && (
        <div className="bg-gray-50 rounded-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {writer.name.charAt(0)}
            </div>
            <div>
              <Link
                href={`/writer/${writer.id}`}
                className="text-base font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                {writer.name}
              </Link>
              {writer.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {writer.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Related Articles */}
      {relatedArticles && relatedArticles.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-5">相關報導</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedArticles.map((related) => (
              <Link
                key={related.id}
                href={`/news/${related.slug || related.id}`}
                className="group block rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
              >
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                  {related.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <time>
                    {related.published_at
                      ? new Date(related.published_at).toLocaleDateString(
                          "zh-TW"
                        )
                      : ""}
                  </time>
                  <span>{related.view_count ?? 0} views</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

