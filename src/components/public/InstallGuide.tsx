"use client";

import { useState, useEffect } from "react";
import { Smartphone, Monitor, Share, MoreVertical, PlusSquare, Download } from "lucide-react";

type Platform = "ios" | "android";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  return "ios";
}

const iosSteps = [
  {
    icon: <Monitor className="w-5 h-5" />,
    title: "用 Safari 開啟本站",
    description: "請使用 Safari 瀏覽器開啟 howger-sport.com",
  },
  {
    icon: <Share className="w-5 h-5" />,
    title: "點擊底部「分享」按鈕",
    description: "點擊 Safari 底部工具列的分享圖示（方框加上箭頭）",
  },
  {
    icon: <PlusSquare className="w-5 h-5" />,
    title: "選擇「加入主畫面」",
    description: "在分享選單中找到「加入主畫面」選項並點擊",
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: "點擊「新增」完成",
    description: "確認名稱後點擊右上角「新增」，App 圖示會出現在主畫面",
  },
];

const androidSteps = [
  {
    icon: <Monitor className="w-5 h-5" />,
    title: "用 Chrome 開啟本站",
    description: "請使用 Chrome 瀏覽器開啟 howger-sport.com",
  },
  {
    icon: <MoreVertical className="w-5 h-5" />,
    title: "點擊右上角選單 ⋮",
    description: "點擊 Chrome 右上角的三點選單按鈕",
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: "選擇「安裝應用程式」",
    description: "在選單中找到「安裝應用程式」或「新增至主畫面」",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "點擊「安裝」完成",
    description: "確認安裝後，App 圖示會出現在主畫面",
  },
];

export function InstallGuide() {
  const [platform, setPlatform] = useState<Platform>("ios");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const steps = platform === "ios" ? iosSteps : androidSteps;

  return (
    <div className="max-w-lg mx-auto">
      {/* Tabs */}
      <div className="flex rounded-lg bg-slate-100 p-1 mb-8">
        <button
          onClick={() => setPlatform("ios")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
            platform === "ios"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          iOS (iPhone / iPad)
        </button>
        <button
          onClick={() => setPlatform("android")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-colors ${
            platform === "android"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Android
        </button>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-4">
            {/* Step number */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
              {index + 1}
            </div>
            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-blue-600">{step.icon}</span>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          💡 安裝後即可從主畫面直接開啟，享受全螢幕瀏覽體驗，並可離線查看已載入的內容。
        </p>
      </div>
    </div>
  );
}
