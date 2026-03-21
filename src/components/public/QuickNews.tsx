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
  const displayArticles = articles.slice(0, 5);
  if (displayArticles.length === 0) return null;

  return (
    <section className="mb-9">
      <div className="flex items-center gap-2 mb-3.5">
        <Zap className="h-4 w-4 text-brand fill-brand" />
        <h2 className="font-serif text-[18px] font-bold text-foreground border-l-4 border-brand pl-3">
          快訊
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {displayArticles.map((article) => (
          <Link
            key={article.id}
            href={newsUrl(article.slug || article.id)}
            className="group"
          >
            <article className="bg-card border border-border rounded-xl p-3.5 hover:border-brand/50 hover:shadow-sm hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 min-h-[100px] flex flex-col justify-between">
              <p className="text-[13px] font-semibold text-foreground line-clamp-3 leading-snug group-hover:text-brand transition-colors">
                {article.title}
              </p>
              <span className="text-[11px] text-muted-foreground mt-2 block">
                {formatRelativeTime(article.published_at)}
              </span>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
