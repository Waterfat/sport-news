"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MemberGate } from "@/components/auth/MemberGate";
import { ArrowLeft } from "lucide-react";

interface PlayerInfo {
  id: string;
  displayName: string;
  jersey: string;
  position: string;
  age: number;
  height: string;
  weight: string;
  headshot: string;
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
  experience: number;
  college: string;
}

interface PlayerStat {
  name: string;
  displayName: string;
  value: string;
}

interface GameLogEntry {
  date: string;
  opponent: string;
  result: string;
  stats: Record<string, string>;
}

interface PlayerGameLog {
  labels: string[];
  entries: GameLogEntry[];
}

export function PlayerDetailClient({
  sport,
  playerId,
}: {
  sport: string;
  playerId: string;
}) {
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [gamelog, setGamelog] = useState<PlayerGameLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGameLog, setShowGameLog] = useState(false);

  useEffect(() => {
    fetch(`/api/public/player?sport=${sport}&id=${playerId}`)
      .then((r) => r.json())
      .then((d) => {
        setPlayer(d.player ?? null);
        setStats(d.stats ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport, playerId]);

  // Fetch game log on demand
  useEffect(() => {
    if (!showGameLog || gamelog) return;

    fetch(`/api/public/player?sport=${sport}&id=${playerId}&type=gamelog`)
      .then((r) => r.json())
      .then((d) => setGamelog(d.gamelog ?? { labels: [], entries: [] }))
      .catch(() => setGamelog({ labels: [], entries: [] }));
  }, [showGameLog, sport, playerId, gamelog]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">找不到此球員</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {player.team && (
        <Link
          href={`/team/${sport}/${player.team.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="w-4 h-4" />
          返回 {player.team.displayName}
        </Link>
      )}

      {/* Player Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {player.headshot && (
              <img
                src={player.headshot}
                alt={player.displayName}
                className="w-20 h-20 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">
                {player.displayName}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">#{player.jersey}</Badge>
                <Badge variant="outline">{player.position}</Badge>
                {player.team && (
                  <Link
                    href={`/team/${sport}/${player.team.id}`}
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {player.team.logo && (
                      <img src={player.team.logo} alt="" className="w-4 h-4" />
                    )}
                    {player.team.displayName}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {player.height && <span>{player.height}</span>}
                {player.weight && <span>{player.weight}</span>}
                {player.age > 0 && <span>{player.age} 歲</span>}
                {player.college && <span>{player.college}</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <MemberGate
        message="登入查看完整球員數據"
        fallback={
          stats.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">本季數據</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                  {stats.slice(0, 3).map((s) => (
                    <div key={s.name} className="text-center">
                      <p className="text-2xl font-bold text-foreground tabular-nums">
                        {s.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.displayName}</p>
                    </div>
                  ))}
                  {stats.slice(3, 5).map((s) => (
                    <div key={s.name} className="text-center blur-sm">
                      <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                      <p className="text-xs">{s.displayName}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : undefined
        }
      >
        {stats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">本季數據</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                {stats.map((s) => (
                  <div key={s.name} className="text-center">
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {s.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.displayName}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </MemberGate>

      {/* Game Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">比賽紀錄</CardTitle>
            {!showGameLog && (
              <button
                onClick={() => setShowGameLog(true)}
                className="text-sm text-primary hover:underline"
              >
                載入 Game Log
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!showGameLog ? (
            <p className="p-6 text-muted-foreground text-center text-sm">
              點擊上方按鈕載入比賽紀錄
            </p>
          ) : !gamelog ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : gamelog.entries.length === 0 ? (
            <p className="p-6 text-muted-foreground text-center text-sm">暫無比賽紀錄</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground sticky left-0 bg-muted min-w-[80px]">
                      日期
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-muted-foreground min-w-[60px]">
                      對手
                    </th>
                    <th className="text-center py-2 px-2 font-medium text-muted-foreground min-w-[36px]">
                      結果
                    </th>
                    {gamelog.labels.map((label) => (
                      <th key={label} className="text-center py-2 px-1.5 font-medium text-muted-foreground min-w-[36px]">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gamelog.entries.map((entry, idx) => (
                    <tr key={idx} className={`border-b border-border ${idx % 2 === 0 ? "bg-card" : "bg-muted/50"}`}>
                      <td className="py-1.5 px-2 sticky left-0 bg-card text-muted-foreground whitespace-nowrap">
                        {entry.date
                          ? new Date(entry.date).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric" })
                          : "-"}
                      </td>
                      <td className="py-1.5 px-2 font-medium">{entry.opponent}</td>
                      <td className={`text-center py-1.5 px-2 font-medium ${entry.result?.startsWith("W") ? "text-green-600" : entry.result?.startsWith("L") ? "text-red-500" : ""}`}>
                        {entry.result || "-"}
                      </td>
                      {gamelog.labels.map((label) => (
                        <td key={label} className="text-center py-1.5 px-1.5 tabular-nums">
                          {entry.stats[label] ?? "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
