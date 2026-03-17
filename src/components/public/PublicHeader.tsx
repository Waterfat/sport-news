"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "@/components/auth/UserMenu";

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/scores", label: "即時比分" },
  { href: "/category/nba", label: "NBA" },
  { href: "/category/mlb", label: "MLB" },
  { href: "/category/soccer", label: "足球" },
  { href: "/category/general", label: "綜合" },
  { href: "/standings/nba", label: "排名" },
  { href: "/odds", label: "賠率" },
];

export function PublicHeader() {
  const [logoHidden, setLogoHidden] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const container = document.getElementById("scroll-container");
    if (!container) return;

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;

      requestAnimationFrame(() => {
        const currentY = container.scrollTop;
        const delta = currentY - lastScrollY.current;

        // 向下滾超過 10px → 隱藏 logo
        if (delta > 10 && currentY > 60) {
          setLogoHidden(true);
        }
        // 向上滾超過 10px → 顯示 logo
        else if (delta < -10) {
          setLogoHidden(false);
        }

        lastScrollY.current = currentY;
        ticking.current = false;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="flex-shrink-0 bg-white/90 backdrop-blur-sm border-b border-slate-200 pt-[env(safe-area-inset-top)]">
      {/* Row 1: Logo + UserMenu */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          logoHidden ? "max-h-0 opacity-0" : "max-h-16 opacity-100"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-12 sm:h-14">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/logo.png"
                alt="小豪哥體育資訊網"
                width={280}
                height={50}
                className="h-7 sm:h-9 w-auto"
                priority
              />
            </Link>
            <UserMenu />
          </div>
        </div>
      </div>

      {/* Row 2: Nav tabs */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-slate-600 rounded-md hover:text-blue-600 hover:bg-blue-50 active:scale-[0.97] transition-all duration-150 whitespace-nowrap"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
