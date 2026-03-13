import Image from "next/image";
import Link from "next/link";

const navLinks = [
  { href: "/", label: "首頁" },
  { href: "/category/nba", label: "NBA" },
  { href: "/category/mlb", label: "MLB" },
  { href: "/category/soccer", label: "足球" },
  { href: "/category/general", label: "綜合" },
];

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="小豪哥體育資訊網"
                width={200}
                height={112}
                className="h-14 w-auto"
                priority
              />
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {/* Mobile nav */}
            <nav className="flex sm:hidden items-center gap-0.5 overflow-x-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-2 py-1 text-xs font-medium text-gray-600 rounded hover:text-gray-900 hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid sm:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">加入 Telegram 頻道</h3>
              <p className="text-sm text-gray-500 mb-3">
                即時體育新聞直送手機，不錯過任何精彩賽事
              </p>
              <Link
                href="https://t.me/howger_sport_news"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0088cc] text-white text-sm font-medium rounded-lg hover:bg-[#0077b5] transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.24l-1.82 8.58c-.13.59-.48.73-.98.45l-2.7-1.99-1.3 1.25c-.14.14-.27.27-.54.27l.19-2.73 4.99-4.51c.22-.19-.05-.3-.34-.11l-6.17 3.89-2.66-.83c-.58-.18-.59-.58.12-.86l10.39-4.01c.48-.18.91.12.75.8z" />
                </svg>
                立即加入
              </Link>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-4">
                {navLinks.slice(1).map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-400 text-center">
              &copy; {new Date().getFullYear()} 小豪哥體育資訊網. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
