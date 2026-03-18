"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Moon, Sun, Search, X } from "lucide-react";
import { useTheme } from "next-themes";
import { UserMenu } from "@/components/auth/UserMenu";

const navLinks = [
  { href: "/", label: "首頁", exact: true },
  { href: "/scores", label: "即時比分" },
  { href: "/category/nba", label: "NBA" },
  { href: "/category/mlb", label: "MLB" },
  { href: "/category/soccer", label: "足球" },
  { href: "/category/general", label: "綜合" },
  { href: "/standings/nba", label: "排名" },
  { href: "/odds", label: "賠率" },
];

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

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = container.scrollTop;
        const delta = currentY - lastScrollY.current;

        if (delta > 10 && currentY > 60) {
          setLogoHidden(true);
        } else if (delta < -10) {
          setLogoHidden(false);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(link: { href: string; exact?: boolean }) {
    if (link.exact) return pathname === link.href;
    return pathname === link.href || pathname.startsWith(link.href + "/");
  }

  return (
    <header className="flex-shrink-0 bg-background/90 backdrop-blur-sm border-b border-border pt-[env(safe-area-inset-top)]">
      {/* Row 1: Logo + Theme Toggle + UserMenu */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          logoHidden ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="超級運動資訊網"
                width={280}
                height={50}
                className="h-7 sm:h-9 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="搜尋"
              >
                {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
              </button>
              {mounted && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  aria-label="切換深色模式"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋文章..."
                className="w-full pl-9 pr-4 py-2 bg-muted border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </form>
        </div>
      )}

      {/* Row 2: Nav tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="relative">
          <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide pb-0.5">
            {navLinks.map((link) => {
              const active = isActive(link);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`min-h-[44px] flex items-center px-3.5 py-2.5 text-sm font-medium rounded-md active:scale-[0.97] transition-all duration-150 whitespace-nowrap ${
                    active
                      ? "text-brand bg-brand-muted font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          {/* Mobile 右側漸層提示可滾動 */}
          <div className="absolute top-0 right-0 bottom-0 w-6 bg-gradient-to-l from-background to-transparent pointer-events-none sm:hidden" />
        </div>
      </div>
    </header>
  );
}
