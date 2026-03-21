import Link from "next/link";
import { Zap } from "lucide-react";
import { formatRelativeTime } from "@/lib/constants";
import { newsUrl } from "@/lib/routes";

export interface QuickNewsArticle {
  id: string;
  title: string;
  slug: string | null;
  published_at: string | null;
}

export function QuickNews({ articles }: { articles: QuickNewsArticle[] }) {
  if (articles.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-5 w-5 text-brand fill-brand" />
        <h2 className="text-lg font-bold text-foreground">快訊</h2>
      </div>
      <ul className="divide-y divide-border rounded-lg border bg-card">
        {articles.map((article) => (
          <li key={article.id}>
            <Link
              href={newsUrl(article.slug || article.id)}
              className="flex items-baseline justify-between gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium text-foreground line-clamp-1 min-w-0">
                {article.title}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatRelativeTime(article.published_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
