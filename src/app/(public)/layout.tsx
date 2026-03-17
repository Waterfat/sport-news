import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";

const footerLinks = [
  { href: "/scores", label: "即時比分" },
  { href: "/category/nba", label: "NBA" },
  { href: "/category/mlb", label: "MLB" },
  { href: "/category/soccer", label: "足球" },
  { href: "/category/general", label: "綜合" },
  { href: "/standings/nba", label: "排名" },
  { href: "/odds", label: "賠率" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">
      <PublicHeader />

      {/* Scrollable content area */}
      <div id="scroll-container" className="flex-1 overflow-y-auto overscroll-contain">
        {/* Main Content */}
        <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-slate-100 border-t border-slate-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
            {/* Telegram CTA - compact */}
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.24l-1.82 8.58c-.13.59-.48.73-.98.45l-2.7-1.99-1.3 1.25c-.14.14-.27.27-.54.27l.19-2.73 4.99-4.51c.22-.19-.05-.3-.34-.11l-6.17 3.89-2.66-.83c-.58-.18-.59-.58.12-.86l10.39-4.01c.48-.18.91.12.75.8z" />
                </svg>
                <span className="text-sm text-slate-600">即時體育新聞直送手機</span>
              </div>
              <Link
                href="https://t.me/howger_sport_news"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                加入頻道
              </Link>
            </div>

            {/* Footer links */}
            <div className="flex items-center justify-center gap-4 mb-3">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="text-sm text-slate-400 text-center">
                &copy; 2019 小豪哥體育資訊網. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
