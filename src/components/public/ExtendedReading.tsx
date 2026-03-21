import Link from "next/link";
import { newsUrl } from "@/lib/routes";
import { formatRelativeTime, CATEGORY_COLORS } from "@/lib/constants";

interface Article {
  id: string;
  title: string;
  slug: string | null;
  category: string | null;
  published_at: string | null;
}

interface ExtendedReadingProps {
  sameCategory: Article[];
  crossCategory: Article[];
}

export function ExtendedReading({
  sameCategory,
  crossCategory,
}: ExtendedReadingProps) {
  const all = [...sameCategory, ...crossCategory];
  if (all.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold text-foreground mb-5 border-l-4 border-emerald-600 pl-3">
        延伸閱讀
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {all.map((article) => (
          <Link
            key={article.id}
            href={newsUrl(article.slug || article.id)}
            className="group block rounded-lg border border-border bg-card p-4 hover:shadow-md hover:border-emerald-300 transition-all"
          >
            {article.category && (
              <span
                className={`inline-block text-xs px-2 py-0.5 mb-2 ${CATEGORY_COLORS[article.category] ?? "bg-gray-500 text-white rounded-md"}`}
              >
                {article.category}
              </span>
            )}
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-emerald-600 transition-colors mb-2">
              {article.title}
            </h3>
            <time className="text-xs text-muted-foreground">
              {formatRelativeTime(article.published_at)}
            </time>
          </Link>
        ))}
      </div>
    </section>
  );
}
