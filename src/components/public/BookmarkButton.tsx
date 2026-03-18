"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { LoginModal } from "@/components/auth/LoginModal";

interface BookmarkButtonProps {
  articleId: string;
}

export function BookmarkButton({ articleId }: BookmarkButtonProps) {
  const { data: session } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const queryClient = useQueryClient();

  const isMember = !!session?.user;

  const { data: bookmarked = false } = useQuery({
    queryKey: ["bookmark", articleId],
    queryFn: async () => {
      const res = await fetch(`/api/member/bookmarks?article_id=${articleId}`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return d.bookmarked || false;
    },
    enabled: isMember,
  });

  const { mutate: toggleBookmark, isPending } = useMutation({
    mutationFn: async () => {
      const method = bookmarked ? "DELETE" : "POST";
      const res = await fetch("/api/member/bookmarks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ article_id: articleId }),
      });
      if (!res.ok) throw new Error("toggle failed");
      const data = await res.json();
      return data.bookmarked as boolean;
    },
    onSuccess: (newBookmarked) => {
      queryClient.setQueryData(["bookmark", articleId], newBookmarked);
    },
  });

  const handleToggle = () => {
    if (!isMember) {
      setLoginOpen(true);
      return;
    }
    toggleBookmark();
  };

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
          bookmarked
            ? "border-yellow-400 bg-yellow-50 text-yellow-700"
            : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-700"
        } ${isPending ? "opacity-50" : ""}`}
        title={bookmarked ? "取消收藏" : "收藏文章"}
      >
        <svg
          className="w-5 h-5"
          fill={bookmarked ? "currentColor" : "none"}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {bookmarked ? "已收藏" : "收藏"}
      </button>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </>
  );
}
