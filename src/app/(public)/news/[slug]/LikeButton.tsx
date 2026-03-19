"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function LikeButton({ articleId }: { articleId: string }) {
  const [optimistic, setOptimistic] = useState<{
    liked: boolean;
    count: number;
  } | null>(null);

  const { data } = useQuery({
    queryKey: ["likes", articleId],
    queryFn: async () => {
      const res = await fetch(`/api/public/likes?article_id=${articleId}`);
      const d = await res.json();
      return {
        count: d.likes || d.count || 0,
        liked: d.liked || false,
      };
    },
  });

  const liked = optimistic?.liked ?? data?.liked ?? false;
  const count = optimistic?.count ?? data?.count ?? 0;

  const handleLike = async () => {
    try {
      const res = await fetch("/api/public/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (res.ok) {
        const d = await res.json();
        setOptimistic({ liked: d.liked, count: d.count });
      }
    } catch {
      // ignore
    }
  };

  return (
    <button
      onClick={handleLike}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
        liked
          ? "border-red-400 bg-red-50 text-red-600"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-700"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  );
}
