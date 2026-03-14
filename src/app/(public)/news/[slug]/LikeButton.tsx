"use client";

import { useEffect, useState } from "react";

export default function LikeButton({ articleId }: { articleId: string }) {
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch(`/api/public/likes?article_id=${articleId}`)
      .then((res) => res.json())
      .then((data) => {
        setCount(data.likes || data.count || 0);
        setLiked(data.liked || false);
      })
      .catch((err) => console.error("Failed to fetch likes:", err));
  }, [articleId]);

  const handleLike = async () => {
    try {
      const res = await fetch("/api/public/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(data.liked);
        setCount(data.count);
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
