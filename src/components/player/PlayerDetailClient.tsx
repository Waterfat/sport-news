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

export function PlayerDetailClient({
  sport,
  playerId,
}: {
  sport: string;
  playerId: string;
}) {
  const [player, setPlayer] = useState<PlayerInfo | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">找不到此球員</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {player.team && (
        <Link
          href={`/team/${sport}/${player.team.id}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600"
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
              <h1 className="text-2xl font-bold text-slate-900">
                {player.displayName}
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="secondary">#{player.jersey}</Badge>
                <Badge variant="outline">{player.position}</Badge>
                {player.team && (
                  <Link
                    href={`/team/${sport}/${player.team.id}`}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    {player.team.logo && (
                      <img src={player.team.logo} alt="" className="w-4 h-4" />
                    )}
                    {player.team.displayName}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
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
                      <p className="text-2xl font-bold text-slate-900">
                        {s.value}
                      </p>
                      <p className="text-xs text-slate-500">{s.displayName}</p>
                    </div>
                  ))}
                  {stats.slice(3, 5).map((s) => (
                    <div key={s.name} className="text-center blur-sm">
                      <p className="text-2xl font-bold">{s.value}</p>
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
                    <p className="text-2xl font-bold text-slate-900">
                      {s.value}
                    </p>
                    <p className="text-xs text-slate-500">{s.displayName}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </MemberGate>
    </div>
  );
}
