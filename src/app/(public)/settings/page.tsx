"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoginButton } from "@/components/auth/LoginButton";
import { X } from "lucide-react";

interface FavoriteTeam {
  sport: string;
  teamId: string;
  name: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [favorites, setFavorites] = useState<FavoriteTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.memberId) {
      fetch("/api/member/favorites")
        .then((r) => r.json())
        .then((d) => setFavorites(d.favorites ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-md mx-auto text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">會員設定</h1>
        <p className="text-slate-500">登入後即可管理關注球隊和通知偏好</p>
        <LoginButton size="lg">登入 / 註冊</LoginButton>
      </div>
    );
  }

  async function removeFavorite(sport: string, teamId: string) {
    await fetch("/api/member/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sport, teamId }),
    });
    setFavorites((prev) =>
      prev.filter((t) => !(t.teamId === teamId && t.sport === sport))
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">會員設定</h1>

      {/* 帳號資訊 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">帳號資訊</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-500">姓名</span>
            <span>{session.user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email</span>
            <span>{session.user.email}</span>
          </div>
        </CardContent>
      </Card>

      {/* 關注球隊 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">關注球隊</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-400">載入中...</p>
          ) : favorites.length === 0 ? (
            <p className="text-slate-400">
              尚未關注任何球隊。在球隊頁面點擊「關注」即可加入。
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {favorites.map((team) => (
                <Badge
                  key={`${team.sport}-${team.teamId}`}
                  variant="secondary"
                  className="text-sm py-1 px-3 gap-1"
                >
                  {team.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => removeFavorite(team.sport, team.teamId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
