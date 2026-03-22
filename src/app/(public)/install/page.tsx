import type { Metadata } from "next";
import { InstallGuide } from "@/components/public/InstallGuide";

export const metadata: Metadata = {
  title: "安裝 App",
  description: "將好球研究所安裝到手機主畫面，享受全螢幕瀏覽體驗",
};

export default function InstallPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">安裝 App</h1>
      <p className="text-slate-500 text-center mb-8">
        將本站加入手機主畫面，像原生 App 一樣使用
      </p>
      <InstallGuide />
    </div>
  );
}
