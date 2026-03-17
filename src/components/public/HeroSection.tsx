import Link from "next/link";
import { CATEGORY_FALLBACK_IMAGES, formatRelativeTime, getFirstImageUrl } from "@/lib/constants";

interface HeroArticle {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  published_at: string | null;
  slug: string | null;
  images: { url: string }[] | null;
  writerName: string | null;
}

function getHref(article: { slug: string | null; id: string }) {
  return `/news/${article.slug || article.id}`;
}

export function HeroSection({
  hero,
  subHeroes,
}: {
  hero: HeroArticle;
  subHeroes: HeroArticle[];
}) {
  const heroImage = getFirstImageUrl(hero.images) || CATEGORY_FALLBACK_IMAGES[hero.category ?? ""] || "/images/hero-sports-bg.jpg";

  return (
    <section className="mb-8">
      {/* Desktop: grid 2/3 + 1/3 */}
      <div className="hidden sm:grid grid-cols-3 gap-4">
        {/* Main hero */}
        <Link href={getHref(hero)} className="col-span-2 block group">
          <article className="relative rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 text-white overflow-hidden h-full min-h-[320px] flex items-end active:scale-[0.99] transition-transform duration-150">
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="relative z-10 p-8">
              {hero.category && (
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded-md bg-brand text-brand-foreground mb-3">
                  {hero.category}
                </span>
              )}
              <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-2 group-hover:text-blue-300 transition-colors">
                {hero.title}
              </h1>
              <p className="text-gray-300 text-sm line-clamp-2 max-w-2xl mb-3">
                {hero.content?.replace(/[#*_>\-\n]/g, " ").slice(0, 200)}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {hero.writerName && <span>{hero.writerName}</span>}
                <span>&middot;</span>
                <span>{formatRelativeTime(hero.published_at)}</span>
              </div>
            </div>
          </article>
        </Link>

        {/* Sub heroes - stacked vertically */}
        <div className="flex flex-col gap-4">
          {subHeroes.map((article) => {
            const thumb = getFirstImageUrl(article.images) || CATEGORY_FALLBACK_IMAGES[article.category ?? ""] || "/images/category-general.jpg";
            return (
              <Link key={article.id} href={getHref(article)} className="block group flex-1">
                <article className="relative rounded-xl bg-slate-800 text-white overflow-hidden h-full min-h-[150px] flex items-end active:scale-[0.99] transition-transform duration-150">
                  <img
                    src={thumb}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative z-10 p-4">
                    {article.category && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-brand text-brand-foreground mb-2">
                        {article.category}
                      </span>
                    )}
                    <h3 className="text-sm font-bold leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {article.title}
                    </h3>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {formatRelativeTime(article.published_at)}
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile: hero full width + 2 small grid */}
      <div className="sm:hidden space-y-3">
        <Link href={getHref(hero)} className="block group">
          <article className="relative rounded-xl bg-slate-800 text-white overflow-hidden min-h-[200px] flex items-end active:scale-[0.99] transition-transform duration-150">
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="relative z-10 p-5">
              {hero.category && (
                <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-md bg-brand text-brand-foreground mb-2">
                  {hero.category}
                </span>
              )}
              <h1 className="text-xl font-bold leading-tight mb-1.5 group-hover:text-blue-300 transition-colors">
                {hero.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {hero.writerName && <span>{hero.writerName}</span>}
                <span>&middot;</span>
                <span>{formatRelativeTime(hero.published_at)}</span>
              </div>
            </div>
          </article>
        </Link>

        <div className="grid grid-cols-2 gap-3">
          {subHeroes.map((article) => {
            const thumb = getFirstImageUrl(article.images) || CATEGORY_FALLBACK_IMAGES[article.category ?? ""] || "/images/category-general.jpg";
            return (
              <Link key={article.id} href={getHref(article)} className="block group">
                <article className="relative rounded-xl bg-slate-800 text-white overflow-hidden min-h-[120px] flex items-end active:scale-[0.99] transition-transform duration-150">
                  <img
                    src={thumb}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative z-10 p-3">
                    {article.category && (
                      <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-md bg-brand text-brand-foreground mb-1">
                        {article.category}
                      </span>
                    )}
                    <h3 className="text-xs font-bold leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                      {article.title}
                    </h3>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
