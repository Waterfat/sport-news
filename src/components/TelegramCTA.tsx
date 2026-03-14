import Link from "next/link";
import { TELEGRAM_CHANNEL_URL } from "@/lib/constants";

/**
 * Telegram 訂閱推廣元件 - 大型 Banner 版（用於首頁）
 */
export function TelegramBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl min-h-[200px] flex items-center">
      <img
        src="/images/cta-stadium.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative z-10 w-full p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              即時體育新聞直送手機
            </h2>
            <p className="text-white/80 text-sm sm:text-base">
              加入我們的 Telegram 頻道「跟著小豪哥一起看球」，第一時間收到最新 NBA 賽事分析與報導
            </p>
          </div>
          <Link
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shrink-0"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.24l-1.82 8.58c-.13.59-.48.73-.98.45l-2.7-1.99-1.3 1.25c-.14.14-.27.27-.54.27l.19-2.73 4.99-4.51c.22-.19-.05-.3-.34-.11l-6.17 3.89-2.66-.83c-.58-.18-.59-.58.12-.86l10.39-4.01c.48-.18.91.12.75.8z" />
            </svg>
            立即加入頻道
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Telegram 訂閱引導 - 文章底部版
 */
export function TelegramArticleCTA() {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 mt-8 mb-8">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.24l-1.82 8.58c-.13.59-.48.73-.98.45l-2.7-1.99-1.3 1.25c-.14.14-.27.27-.54.27l.19-2.73 4.99-4.51c.22-.19-.05-.3-.34-.11l-6.17 3.89-2.66-.83c-.58-.18-.59-.58.12-.86l10.39-4.01c.48-.18.91.12.75.8z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 mb-1">
            喜歡這篇報導？
          </p>
          <p className="text-sm text-slate-500 mb-3">
            加入我們的 Telegram 頻道，第一時間收到最新體育新聞
          </p>
          <Link
            href={TELEGRAM_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.24l-1.82 8.58c-.13.59-.48.73-.98.45l-2.7-1.99-1.3 1.25c-.14.14-.27.27-.54.27l.19-2.73 4.99-4.51c.22-.19-.05-.3-.34-.11l-6.17 3.89-2.66-.83c-.58-.18-.59-.58.12-.86l10.39-4.01c.48-.18.91.12.75.8z" />
            </svg>
            加入 Telegram 頻道
          </Link>
        </div>
      </div>
    </div>
  );
}
