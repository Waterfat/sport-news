import type { Metadata } from "next";
import { TELEGRAM_CHANNEL_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "隱私權政策",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto prose prose-slate">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">隱私權政策</h1>
      <p className="text-sm text-slate-500 mb-8">最後更新日期：2026 年 3 月 15 日</p>

      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-slate-800">一、資料蒐集</h2>
        <p className="text-slate-600 leading-relaxed">
          好球研究所（以下簡稱「本站」）透過 Google 及 LINE 第三方登入服務蒐集以下個人資料：
        </p>
        <ul className="list-disc pl-6 text-slate-600 space-y-1">
          <li><strong>電子郵件地址（Email）</strong>：用於會員帳號識別、帳號合併及重要通知</li>
          <li><strong>顯示名稱</strong>：用於網站內顯示您的身分</li>
          <li><strong>頭像圖片</strong>：用於網站內顯示您的個人頭像</li>
          <li><strong>LINE 用戶 ID</strong>：用於 LINE 登入驗證及未來推播通知</li>
        </ul>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-slate-800">二、資料用途</h2>
        <p className="text-slate-600 leading-relaxed">您的個人資料僅用於以下目的：</p>
        <ul className="list-disc pl-6 text-slate-600 space-y-1">
          <li>提供會員登入與身分驗證</li>
          <li>合併同一使用者透過不同管道（Google / LINE）建立的帳號</li>
          <li>提供個人化體驗（如關注球隊、賽事通知偏好）</li>
          <li>寄送您訂閱的賽事通知</li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          本站<strong>不會</strong>將您的個人資料出售、出租或提供給第三方作行銷用途。
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-slate-800">三、資料保護</h2>
        <p className="text-slate-600 leading-relaxed">
          本站採用業界標準的安全措施保護您的個人資料，包括加密傳輸（HTTPS）及安全的資料庫存取控制。
          OAuth 登入過程中，本站不會取得或儲存您的第三方帳號密碼。
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-slate-800">四、您的權利</h2>
        <p className="text-slate-600 leading-relaxed">依據台灣個人資料保護法，您享有以下權利：</p>
        <ul className="list-disc pl-6 text-slate-600 space-y-1">
          <li>查詢或請求閱覽您的個人資料</li>
          <li>請求製給複製本</li>
          <li>請求補充或更正</li>
          <li>請求停止蒐集、處理或利用</li>
          <li><strong>請求刪除帳號及所有相關資料</strong></li>
        </ul>
        <p className="text-slate-600 leading-relaxed">
          如需行使上述權利，請透過 Telegram 聯繫我們：
          <a href={TELEGRAM_CHANNEL_URL} className="text-blue-600 hover:underline ml-1" target="_blank" rel="noopener noreferrer">
            @howger_sport_news
          </a>
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-slate-800">五、Cookie 與第三方服務</h2>
        <p className="text-slate-600 leading-relaxed">
          本站使用必要的 Cookie 維持登入狀態。本站使用 Google 及 LINE 的 OAuth 服務進行身分驗證，
          相關資料處理亦受 Google 及 LINE 各自的隱私權政策規範。
        </p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-lg font-semibold text-slate-800">六、政策變更</h2>
        <p className="text-slate-600 leading-relaxed">
          本站保留隨時修改本隱私權政策的權利。修改後將於本頁面公告，繼續使用本站即視為同意修改後的政策。
        </p>
      </section>
    </div>
  );
}
