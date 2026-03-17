import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase";
import { CATEGORY_COLORS, formatDateFull, formatRelativeTime, getCategorySlug, getFirstImageUrl, SITE_URL } from "@/lib/constants";
import ViewTracker from "./ViewTracker";
import LikeButton from "./LikeButton";
import { TelegramArticleCTA } from "@/components/TelegramCTA";
import { ArticleContent, extractHeadings } from "@/components/public/ArticleContent";
import { TableOfContents } from "@/components/public/TableOfContents";
import { ShareButtons } from "@/components/public/ShareButtons";
import { ReactionButtons } from "@/components/public/ReactionButtons";

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
    return { title: "文章未找到 - 小豪哥體育資訊網" };
  }

  const description = getContentExcerpt(article.content);

  const articleUrl = `${SITE_URL}/news/${article.slug || slug}`;
  const ogImageUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(article.title)}&subtitle=${encodeURIComponent(article.category || "")}&type=article`;

  return {
    title: `${article.title} - 小豪哥體育資訊網`,
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
      siteName: "小豪哥體育資訊網",
      locale: "zh_TW",
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [ogImageUrl],
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
    CATEGORY_COLORS[article.category ?? ""] ?? "bg-muted text-muted-foreground border border-border rounded-lg";

  const articleUrl = `${SITE_URL}/news/${article.slug || slug}`;
  const contentStr = article.content ?? "";
  const showToc = contentStr.length > 1500;
  const headings = showToc ? extractHeadings(contentStr) : [];

  // JSON-LD structured data
  // Note: content is server-generated from trusted DB (not user input), safe to serialize as JSON
  const jsonLdData = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: getContentExcerpt(article.content),
    datePublished: article.published_at,
    dateModified: article.published_at,
    author: writer ? { "@type": "Person", name: writer.name } : undefined,
    publisher: {
      "@type": "Organization",
      name: "小豪哥體育資訊網",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": articleUrl,
    },
    articleSection: article.category ?? undefined,
  });

  return (
    <article className="max-w-3xl mx-auto">
      {/* JSON-LD structured data for SEO - trusted server-generated content */}
      <script type="application/ld+json" suppressHydrationWarning>
        {jsonLdData}
      </script>
      <ViewTracker slug={slug} />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <span className="inline-flex items-center gap-2 bg-muted rounded-full px-4 py-1.5">
          <Link href="/" className="text-muted-foreground hover:text-blue-600 transition-colors">
            首頁
          </Link>
          <span className="text-muted-foreground/40">/</span>
          {article.category && (
            <>
              <Link
                href={`/category/${getCategorySlug(article.category)}`}
                className="text-muted-foreground hover:text-blue-600 transition-colors"
              >
                {article.category}
              </Link>
              <span className="text-muted-foreground/40">/</span>
            </>
          )}
          <span className="text-foreground truncate max-w-[200px]">
            {article.title}
          </span>
        </span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        {article.category && (
          <span
            className={`inline-block px-3 py-1 text-xs font-semibold ${colorClass} mb-4`}
          >
            {article.category}
          </span>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-4">
          {article.title}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
          {writer && (
            <Link
              href={`/writer/${writer.id}`}
              className="font-medium text-foreground hover:text-blue-600 transition-colors"
            >
              {writer.name}
            </Link>
          )}
          {writer && <span>&middot;</span>}
          <time dateTime={article.published_at ?? ""}>
            {formatDateFull(article.published_at)}
          </time>
          {article.published_at && (
            <span className="text-muted-foreground/60">({formatRelativeTime(article.published_at)})</span>
          )}
        </div>

        {/* Share Buttons - top */}
        <ShareButtons url={articleUrl} title={article.title} />
      </header>

      {/* Featured Image */}
      {(() => {
        const featuredUrl = getFirstImageUrl(article.images);
        if (!featuredUrl) return null;
        return (
          <div className="mb-8 rounded-xl overflow-hidden">
            <img
              src={featuredUrl}
              alt={article.title}
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        );
      })()}

      {/* Divider */}
      <hr className="border-border mb-8" />

      {/* Table of Contents */}
      {showToc && headings.length >= 2 && (
        <TableOfContents headings={headings} />
      )}

      {/* Content - react-markdown */}
      <ArticleContent content={contentStr} />

      {/* Reactions */}
      <div className="mb-4">
        <ReactionButtons articleId={article.id} />
      </div>

      {/* Like Button */}
      <div className="mb-8">
        <LikeButton articleId={article.id} />
      </div>

      {/* Share Buttons - bottom */}
      <div className="mb-8">
        <p className="text-sm font-medium text-muted-foreground mb-2">分享這篇文章</p>
        <ShareButtons url={articleUrl} title={article.title} />
      </div>

      {/* Telegram CTA */}
      <TelegramArticleCTA />

      {/* Writer Info */}
      {writer && (
        <div className="bg-muted/50 border border-border rounded-xl p-6 mb-12">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-600 ring-2 ring-blue-600 ring-offset-2 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
              {writer.name.charAt(1) || writer.name.charAt(0)}
            </div>
            <div>
              <Link
                href={`/writer/${writer.id}`}
                className="text-base font-semibold text-foreground hover:text-blue-600 transition-colors"
              >
                {writer.name}
              </Link>
              {writer.description && (
                <p className="text-sm text-muted-foreground mt-1">
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
          <h2 className="text-xl font-bold text-foreground mb-5 border-l-4 border-blue-600 pl-3">相關報導</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {relatedArticles.map((related) => (
              <Link
                key={related.id}
                href={`/news/${related.slug || related.id}`}
                className="group block rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-blue-300 transition-all"
              >
                <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
                  {related.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <time>
                    {related.published_at
                      ? new Date(related.published_at).toLocaleDateString(
                          "zh-TW"
                        )
                      : ""}
                  </time>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
