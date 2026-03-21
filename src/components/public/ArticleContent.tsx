"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { autoLinkChildren } from "@/lib/auto-link";

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function isTwitterUrl(url: string): boolean {
  return /^https?:\/\/(twitter\.com|x\.com)\//.test(url);
}

function buildComponents(category: string | null): Components {
  const link = (children: React.ReactNode) => autoLinkChildren(children, category);

  return {
  h1: ({ children }) => (
    <h1
      id={String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")}
      className="text-2xl font-bold text-foreground mt-10 mb-4 scroll-mt-20"
    >
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2
      id={String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")}
      className="text-xl font-bold text-foreground mt-8 mb-3 scroll-mt-20"
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      id={String(children).toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")}
      className="text-lg font-semibold text-foreground mt-6 mb-2 scroll-mt-20"
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-foreground mt-5 mb-2">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-foreground/90 leading-relaxed mb-4">{link(children)}</p>
  ),
  a: ({ href, children }) => {
    if (href) {
      const youtubeId = getYouTubeId(href);
      if (youtubeId) {
        return (
          <span className="block my-6">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={String(children) || "YouTube video"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full aspect-video rounded-lg"
            />
          </span>
        );
      }
      if (isTwitterUrl(href)) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-sm text-foreground hover:bg-muted/80 transition-colors border border-border my-1"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {children}
          </a>
        );
      }
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors"
      >
        {children}
      </a>
    );
  },
  img: ({ src, alt }) => (
    <span className="block my-6">
      <img
        src={src}
        alt={alt || ""}
        className="rounded-lg max-w-full h-auto mx-auto"
        loading="lazy"
      />
      {alt && (
        <span className="block text-xs text-muted-foreground mt-2 text-center">
          {alt}
        </span>
      )}
    </span>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50/50 dark:bg-blue-950/20 pl-4 py-2 italic text-muted-foreground my-4">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 mb-4 text-foreground/90">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 mb-4 text-foreground/90">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{link(children)}</li>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-6">
      <table className="w-full text-sm border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2 text-foreground/90">
      {children}
    </td>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className={`${className} block bg-muted rounded-lg p-4 overflow-x-auto text-sm my-4`}>
          {children}
        </code>
      );
    }
    return (
      <code className="bg-muted rounded px-1.5 py-0.5 text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="bg-muted rounded-lg p-4 overflow-x-auto text-sm my-4">
      {children}
    </pre>
  ),
  hr: () => <hr className="border-border my-8" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{link(children)}</strong>
  ),
  };
}

export function ArticleContent({ content, category }: { content: string; category?: string | null }) {
  const components = buildComponents(category ?? null);
  return (
    <div className="prose prose-lg max-w-none mb-12">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Re-export for backwards compat (but server components should import from @/lib/markdown-utils directly)
export { extractHeadings } from "@/lib/markdown-utils";
