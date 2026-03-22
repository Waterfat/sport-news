import Link from "next/link";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PullToRefresh } from "@/components/public/PullToRefresh";
import { PageTracker } from "@/components/public/PageTracker";
import { TELEGRAM_CHANNEL_URL } from "@/lib/constants";
import { scoresUrl, standingsUrl, categoryUrl, oddsUrl } from "@/lib/routes";


export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-[100dvh] flex flex-col bg-background overflow-hidden">
      <PublicHeader />

      {/* Scrollable content area */}
      <div id="scroll-container" className="flex-1 overflow-y-auto overscroll-contain">
        <PullToRefresh scrollContainerId="scroll-container" />
        <PageTracker />
        {/* Main Content */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
          {children}
        </main>

        {/* Footer arc transition */}
        <div className="relative h-12 bg-background overflow-hidden">
          <div className="absolute bottom-0 left-0 right-0 h-full bg-[#0f172a] rounded-t-[40px]" />
        </div>

        {/* Footer */}
        <footer className="bg-[#0f172a] relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-[120px] -right-[80px] w-[350px] h-[350px] rounded-full border-[50px] border-white/[0.025] pointer-events-none" />
          <div className="absolute -bottom-10 left-[8%] w-[160px] h-[160px] rounded-full bg-white/[0.02] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-8 relative z-10">
            {/* Top: Brand + Link columns */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-7 mb-7">
              <div>
                <div className="font-serif text-[22px] font-black text-white mb-2">
                  好球研究所<span className="text-blue-400">資訊網</span>
                </div>
                <p className="text-[13px] text-white/45 max-w-[280px] leading-relaxed">
                  最新體育新聞、即時比分、深度分析
                </p>
              </div>

              <div className="flex gap-8 sm:gap-10 flex-wrap">
                {/* 賽事 */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-3">賽事</p>
                  <Link href={scoresUrl()} className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">即時比分</Link>
                  <Link href={standingsUrl("nba")} className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">排名</Link>
                  <Link href={oddsUrl()} className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">賠率</Link>
                </div>
                {/* 分類 */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-3">分類</p>
                  <Link href={categoryUrl("nba")} className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">NBA</Link>
                  <Link href={categoryUrl("mlb")} className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">MLB</Link>
                  <Link href={categoryUrl("soccer")} className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">足球</Link>
                  <Link href={categoryUrl("general")} className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">綜合</Link>
                </div>
                {/* 更多 */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-white/35 mb-3">更多</p>
                  <Link href="/install" className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">安裝 App</Link>
                  <Link href="/privacy" className="block text-[13px] text-white/65 hover:text-white py-0.5 transition-colors">隱私政策</Link>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.08] mb-5" />

            {/* Bottom: Copyright + Telegram CTA */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-white/25">
                &copy; {new Date().getFullYear()} 好球研究所. All rights reserved.
              </span>
              <Link
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.15] px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.24l-1.82 8.58c-.13.59-.48.73-.98.45l-2.7-1.99-1.3 1.25c-.14.14-.27.27-.54.27l.19-2.73 4.99-4.51c.22-.19-.05-.3-.34-.11l-6.17 3.89-2.66-.83c-.58-.18-.59-.58.12-.86l10.39-4.01c.48-.18.91.12.75.8z" />
                </svg>
                加入 Telegram 頻道
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
