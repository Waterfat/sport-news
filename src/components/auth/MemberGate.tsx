"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { LoginModal } from "./LoginModal";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

interface MemberGateProps {
  children: React.ReactNode;
  /** 訪客看到的模糊預覽（可選，預設不顯示） */
  fallback?: React.ReactNode;
  /** 引導文字 */
  message?: string;
  /** 是否顯示前幾筆後才模糊（需配合 fallback 使用） */
  className?: string;
}

/**
 * 內容分級包裝元件
 * - 已登入會員：顯示完整內容
 * - 訪客：顯示 fallback（模糊預覽）+ 登入引導
 */
export function MemberGate({
  children,
  fallback,
  message = "登入查看完整內容",
  className,
}: MemberGateProps) {
  const { data: session } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);

  // 已登入 → 顯示完整內容
  if (session?.user) {
    return <>{children}</>;
  }

  // 訪客 → 模糊預覽 + 登入引導
  return (
    <div className={className}>
      {/* 預覽內容 + 毛玻璃遮罩 */}
      <div className="relative">
        {fallback && (
          <div className="overflow-hidden">
            {fallback}
            {/* 毛玻璃漸層遮罩 */}
            <div className="absolute inset-0 top-1/3 bg-gradient-to-b from-transparent via-white/70 to-white backdrop-blur-sm" />
          </div>
        )}

        {/* 登入引導卡片 */}
        <div
          className={`${fallback ? "absolute bottom-0 left-0 right-0" : ""} flex flex-col items-center justify-center py-8 px-4`}
        >
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-sm w-full text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-slate-700 font-medium">{message}</p>
            <Button
              onClick={() => setLoginOpen(true)}
              className="w-full"
            >
              免費登入
            </Button>
          </div>
        </div>
      </div>

      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
    </div>
  );
}

/**
 * 列表類內容的分級包裝
 * 顯示前 N 筆，其餘模糊
 */
export function MemberGateList<T>({
  items,
  previewCount = 5,
  renderItem,
  message = "登入查看完整內容",
  className,
}: {
  items: T[];
  previewCount?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  message?: string;
  className?: string;
}) {
  const { data: session } = useSession();

  // 已登入 → 顯示全部
  if (session?.user) {
    return (
      <div className={className}>
        {items.map((item, i) => renderItem(item, i))}
      </div>
    );
  }

  const previewItems = items.slice(0, previewCount);
  const hasMore = items.length > previewCount;

  return (
    <MemberGate
      message={message}
      fallback={
        hasMore ? (
          <div className={className}>
            {previewItems.map((item, i) => renderItem(item, i))}
            {/* 模糊的額外項目 */}
            {items.slice(previewCount, previewCount + 3).map((item, i) => (
              <div key={`blur-${i}`} className="blur-sm select-none pointer-events-none">
                {renderItem(item, previewCount + i)}
              </div>
            ))}
          </div>
        ) : undefined
      }
    >
      <div className={className}>
        {items.map((item, i) => renderItem(item, i))}
      </div>
    </MemberGate>
  );
}
