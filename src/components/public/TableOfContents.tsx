"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, List } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({ headings }: { headings: TocItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (headings.length < 2) return null;

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setExpanded(false);
  };

  return (
    <>
      {/* Mobile: collapsible */}
      <div className="lg:hidden mb-6">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 w-full px-4 py-3 bg-muted rounded-lg text-sm font-medium text-foreground"
        >
          <List className="w-4 h-4" />
          <span>文章目錄</span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-auto" />
          )}
        </button>
        {expanded && (
          <nav className="mt-2 px-4 py-3 bg-muted/50 rounded-lg">
            <ul className="space-y-1.5">
              {headings.map((h) => (
                <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                  <button
                    onClick={() => handleClick(h.id)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors text-left"
                  >
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Desktop: floating sidebar */}
      <div className="hidden lg:block fixed right-[max(1rem,calc((100vw-768px)/2-320px))] top-1/4 w-56 max-h-[60vh] overflow-y-auto">
        <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            目錄
          </h4>
          <nav>
            <ul className="space-y-1.5">
              {headings.map((h) => (
                <li key={h.id} style={{ paddingLeft: `${(h.level - 1) * 10}px` }}>
                  <button
                    onClick={() => handleClick(h.id)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left leading-snug"
                  >
                    {h.text}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}
