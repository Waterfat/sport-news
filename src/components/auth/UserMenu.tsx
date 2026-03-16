"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { LoginModal } from "./LoginModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, Settings, Star, User } from "lucide-react";
import Link from "next/link";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);

  // 載入中不顯示
  if (status === "loading") {
    return <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />;
  }

  // 未登入或 admin → 前台顯示登入按鈕（admin 帳號不是前台會員）
  if (!session?.user || session.user.role === "admin") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLoginOpen(true)}
          className="text-sm"
        >
          登入
        </Button>
        <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      </>
    );
  }

  const user = session.user;
  const isAdmin = user.role === "admin";
  const initials = user.name?.charAt(0) ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full hover:bg-slate-100 p-1 transition-colors">
          <Avatar className="w-8 h-8">
            {user.image && <AvatarImage src={user.image} alt={user.name ?? ""} />}
            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <DropdownMenuSeparator />

        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              後台管理
            </Link>
          </DropdownMenuItem>
        )}

        {!isAdmin && (
          <>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Star className="mr-2 h-4 w-4" />
                我的關注
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                設定
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/" })}
          className="cursor-pointer text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
