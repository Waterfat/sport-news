"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, Search, X } from "lucide-react";
import { useTheme } from "next-themes";
import { UserMenu } from "@/components/auth/UserMenu";
import { scoresUrl, categoryUrl, standingsUrl, oddsUrl } from "@/lib/routes";

const navLinks = [
  { href: "/", label: "首頁", exact: true },
  { href: scoresUrl(), label: "即時比分" },
  { href: categoryUrl("nba"), label: "NBA" },
  { href: categoryUrl("mlb"), label: "MLB" },
  { href: categoryUrl("soccer"), label: "足球" },
  { href: categoryUrl("general"), label: "綜合" },
  { href: standingsUrl("nba"), label: "排名" },
  { href: oddsUrl(), label: "賠率" },
];

// Scroll handler 常數
const SCROLL_MIN_POSITION = 60; // 最小滾動位置才觸發隱藏（配合 logo h-12）
const SCROLL_HIDE_DELTA = 10; // 向下滾動 delta 閾值
const SCROLL_SHOW_DELTA = 30; // 向上滾動 delta 閾值（較高，避免慣性震盪誤觸發）
const SCROLL_COOLDOWN_MS = 150; // 狀態切換最小間隔（ms）

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [logoHidden, setLogoHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const lastToggleTime = useRef(0);
  const logoHiddenRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  useEffect(() => {
    const container = document.getElementById("scroll-container");
    if (!container) return;

    let rafId = 0;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      rafId = requestAnimationFrame(() => {
        if (!container.isConnected) {
          ticking.current = false;
          return;
        }

        const currentY = container.scrollTop;
        const delta = currentY - lastScrollY.current;
        const now = Date.now();
        const cooldownOk = now - lastToggleTime.current > SCROLL_COOLDOWN_MS;

        if (
          delta > SCROLL_HIDE_DELTA &&
          currentY > SCROLL_MIN_POSITION &&
          cooldownOk &&
          !logoHiddenRef.current
        ) {
          logoHiddenRef.current = true;
          setLogoHidden(true);
          lastToggleTime.current = now;
        } else if (
          delta < -SCROLL_SHOW_DELTA &&
          cooldownOk &&
          logoHiddenRef.current
        ) {
          logoHiddenRef.current = false;
          setLogoHidden(false);
          lastToggleTime.current = now;
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  function isActive(link: { href: string; exact?: boolean }) {
    if (link.exact) return pathname === link.href;
    return pathname === link.href || pathname.startsWith(link.href + "/");
  }

  return (
    <header className="flex-shrink-0 bg-[#0f172a] pt-[env(safe-area-inset-top)]">
      {/* Row 1: Logo + Theme Toggle + UserMenu — overflow-hidden + 高度過渡 + cooldown 防抖 */}
      <div
        className={`overflow-hidden transition-[height,opacity] duration-200 ease-in-out ${
          logoHidden
            ? "h-0 opacity-0 pointer-events-none"
            : "h-12 sm:h-14 opacity-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="好球研究所 Howger Lab"
                width={280}
                height={50}
                className="h-7 sm:h-9 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="搜尋"
              >
                {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="切換深色模式"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <div className="[&_button]:text-white/80 [&_button:hover]:text-white [&_button:hover]:bg-white/10">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 border-t border-white/10">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋文章..."
                className="w-full pl-9 pr-4 py-2 bg-white/10 border border-white/15 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>
          </form>
        </div>
      )}

      {/* Row 2: Nav tabs */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative">
            <nav className="flex items-center gap-0 overflow-x-auto scrollbar-hide">
              {navLinks.map((link) => {
                const active = isActive(link);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`min-h-[44px] flex items-center px-4 py-2.5 text-sm font-medium border-b-2 active:scale-[0.97] transition-all duration-150 whitespace-nowrap ${
                      active
                        ? "text-white border-blue-400 font-bold"
                        : "text-white/55 border-transparent hover:text-white/90"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            {/* Mobile 右側漸層 */}
            <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-[#0f172a] to-transparent pointer-events-none sm:hidden" />
          </div>
        </div>
      </div>
    </header>
  );
}
