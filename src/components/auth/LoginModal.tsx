"use client";

import { signIn } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            登入 / 註冊
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Google 登入 */}
          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            onClick={() => signIn("google", { callbackUrl: "/" })}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            使用 Google 帳號登入
          </Button>

          {/* LINE 登入 */}
          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            onClick={() => signIn("line", { callbackUrl: "/" })}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#06C755">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967C23.101 14.479 24 12.515 24 10.304zM8.516 13.076H6.562a.48.48 0 0 1-.478-.478V8.539a.48.48 0 0 1 .957 0v3.581h1.475a.48.48 0 0 1 0 .957zm1.895-.478a.48.48 0 0 1-.957 0V8.539a.48.48 0 0 1 .957 0v4.059zm4.895 0a.477.477 0 0 1-.347.46.467.467 0 0 1-.152.018.467.467 0 0 1-.396-.216l-2.06-2.806v2.544a.48.48 0 0 1-.957 0V8.539a.477.477 0 0 1 .347-.459.474.474 0 0 1 .548.197l2.061 2.806V8.539a.48.48 0 0 1 .957 0v4.059zm3.67-2.602a.48.48 0 0 1 0 .957h-1.475v1.167h1.475a.48.48 0 0 1 0 .957h-1.953a.48.48 0 0 1-.478-.478V8.539a.48.48 0 0 1 .478-.478h1.953a.48.48 0 0 1 0 .957h-1.475v1.001h1.475z" />
            </svg>
            使用 LINE 帳號登入
          </Button>
        </div>

        {/* 功能列表 */}
        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-medium text-slate-600">
            登入即可解鎖：
          </p>
          <ul className="text-sm text-slate-500 space-y-1">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 完整賠率分析
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 逐球紀錄
              Play-by-Play
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 勝率曲線圖
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 關注球隊即時通知
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400 text-center pt-2">
          登入即表示同意本站{" "}
          <a href="/privacy" className="underline hover:text-blue-600">隱私權政策</a>
          ，您的 Email 將用於帳號識別與合併
        </p>
      </DialogContent>
    </Dialog>
  );
}
