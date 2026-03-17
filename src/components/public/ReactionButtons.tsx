"use client";

import { useEffect, useState } from "react";

interface ReactionButtonsProps {
  articleId: string;
}

const REACTIONS = [
  { type: "love", emoji: "\u2764\uFE0F", label: "愛心" },
  { type: "fire", emoji: "\uD83D\uDD25", label: "精彩" },
  { type: "wow", emoji: "\uD83D\uDE2E", label: "驚訝" },
  { type: "sad", emoji: "\uD83D\uDE22", label: "傷心" },
] as const;

type ReactionType = (typeof REACTIONS)[number]["type"];

function getStorageKey(articleId: string): string {
  return `reactions_${articleId}`;
}

function getStoredReactions(articleId: string): Set<ReactionType> {
  try {
    const stored = localStorage.getItem(getStorageKey(articleId));
    if (stored) return new Set(JSON.parse(stored));
  } catch {
    // ignore
  }
  return new Set();
}

function setStoredReactions(articleId: string, reactions: Set<ReactionType>) {
  try {
    localStorage.setItem(
      getStorageKey(articleId),
      JSON.stringify([...reactions])
    );
  } catch {
    // ignore
  }
}

export function ReactionButtons({ articleId }: ReactionButtonsProps) {
  const [selected, setSelected] = useState<Set<ReactionType>>(new Set());
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    love: 0,
    fire: 0,
    wow: 0,
    sad: 0,
  });

  useEffect(() => {
    setSelected(getStoredReactions(articleId));
    // Load counts from localStorage (no backend for reactions)
    try {
      const stored = localStorage.getItem(`reaction_counts_${articleId}`);
      if (stored) setCounts(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, [articleId]);

  const handleReaction = (type: ReactionType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
        setCounts((c) => {
          const updated = { ...c, [type]: Math.max(0, (c[type] || 0) - 1) };
          try {
            localStorage.setItem(
              `reaction_counts_${articleId}`,
              JSON.stringify(updated)
            );
          } catch { /* ignore */ }
          return updated;
        });
      } else {
        next.add(type);
        setCounts((c) => {
          const updated = { ...c, [type]: (c[type] || 0) + 1 };
          try {
            localStorage.setItem(
              `reaction_counts_${articleId}`,
              JSON.stringify(updated)
            );
          } catch { /* ignore */ }
          return updated;
        });
      }
      setStoredReactions(articleId, next);
      return next;
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {REACTIONS.map((r) => {
        const isSelected = selected.has(r.type);
        const count = counts[r.type] || 0;
        return (
          <button
            key={r.type}
            onClick={() => handleReaction(r.type)}
            title={r.label}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border text-sm transition-all ${
              isSelected
                ? "border-blue-300 bg-blue-50 scale-105"
                : "border-border bg-card hover:bg-muted"
            }`}
          >
            <span className="text-base">{r.emoji}</span>
            {count > 0 && (
              <span className="text-xs text-muted-foreground">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
