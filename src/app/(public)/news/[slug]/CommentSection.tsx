"use client";

import { useEffect, useState } from "react";

interface Comment {
  id: number;
  author_name: string;
  content: string;
  created_at: string;
}

export default function CommentSection({ articleId }: { articleId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/public/comments?article_id=${articleId}`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments || []))
      .catch(() => {});
  }, [articleId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/public/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          article_id: articleId,
          author_name: name.trim(),
          content: content.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setContent("");
      } else {
        const data = await res.json();
        setError(data.error || "發送失敗");
      }
    } catch {
      setError("網路錯誤");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12 border-t border-gray-200 pt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-6">
        留言 ({comments.length})
      </h2>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-4 mb-8">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm text-gray-900">
                  {comment.author_name}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleString("zh-TW")}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的名稱"
          maxLength={100}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="寫下你的想法..."
          maxLength={1000}
          rows={3}
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          {submitting ? "發送中..." : "發表留言"}
        </button>
      </form>
    </section>
  );
}
