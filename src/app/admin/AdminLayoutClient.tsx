"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    title: "總覽",
    items: [
      { href: "/admin", label: "儀表板", icon: "📊" },
      { href: "/admin/pipeline", label: "管線狀態", icon: "🔄" },
      { href: "/admin/analytics", label: "數據分析", icon: "📈" },
    ],
  },
  {
    title: "內容",
    items: [
      { href: "/admin/articles", label: "文章管理", icon: "📝" },
      { href: "/admin/review", label: "審稿佇列", icon: "✅" },
      { href: "/admin/raw", label: "素材庫", icon: "📰" },
    ],
  },
  {
    title: "設定",
    items: [
      { href: "/admin/personas", label: "寫手管理", icon: "✍️" },
      { href: "/admin/sports", label: "球種分類", icon: "🏀" },
      { href: "/admin/sources", label: "爬蟲來源", icon: "🕷️" },
      { href: "/admin/channels", label: "發布頻道", icon: "📢" },
      { href: "/admin/scoreboard", label: "比分設定", icon: "🏆" },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:static inset-y-0 left-0 z-50 w-60 bg-white border-r flex flex-col transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="h-14 flex items-center px-4 border-b shrink-0">
          <Link href="/admin" className="font-bold text-gray-900" onClick={() => setSidebarOpen(false)}>
            Howger Sport 後台
          </Link>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-2 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors",
                      isActive(pathname, item.href)
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t p-3 shrink-0">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <span className="text-base">🚪</span>
            登出
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="h-14 flex items-center justify-between px-4 border-b bg-white md:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md text-gray-600 hover:bg-gray-100"
            aria-label="開啟選單"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-sm text-gray-900">Howger Sport</span>
          <div className="w-9" />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
