"use client";

import { useState } from "react";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/public/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "訂閱成功！");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "訂閱失敗");
      }
    } catch {
      setStatus("error");
      setMessage("網路錯誤");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (status !== "idle") setStatus("idle");
        }}
        placeholder="輸入 Email 訂閱電子報"
        required
        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {status === "loading" ? "..." : "訂閱"}
      </button>
      {status === "success" && (
        <span className="text-xs text-green-600 self-center">{message}</span>
      )}
      {status === "error" && (
        <span className="text-xs text-red-600 self-center">{message}</span>
      )}
    </form>
  );
}
