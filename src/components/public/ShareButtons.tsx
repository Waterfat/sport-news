"use client";

import { useState } from "react";
import { Link2, MessageCircle, Send } from "lucide-react";

interface ShareButtonsProps {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      label: copied ? "已複製" : "複製連結",
      onClick: handleCopy,
      icon: copied ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <Link2 className="w-4 h-4" />
      ),
      className: copied
        ? "bg-green-50 text-green-600 border-green-200"
        : "bg-muted text-foreground border-border hover:bg-muted/80",
    },
    {
      label: "LINE",
      href: `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`,
      icon: <MessageCircle className="w-4 h-4" />,
      className: "bg-[#06C755]/10 text-[#06C755] border-[#06C755]/20 hover:bg-[#06C755]/20",
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <Send className="w-4 h-4" />,
      className: "bg-[#229ED9]/10 text-[#229ED9] border-[#229ED9]/20 hover:bg-[#229ED9]/20",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      className: "bg-muted text-foreground border-border hover:bg-muted/80",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {shareLinks.map((link) =>
        link.onClick ? (
          <button
            key={link.label}
            onClick={link.onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${link.className}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </button>
        ) : (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${link.className}`}
          >
            {link.icon}
            <span>{link.label}</span>
          </a>
        )
      )}
    </div>
  );
}
