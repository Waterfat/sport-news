"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberGate } from "@/components/auth/MemberGate";
import { ArrowLeft, Star } from "lucide-react";

interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  record: string;
  standingSummary: string;
}

interface RosterPlayer {
  id: string;
  displayName: string;
  jersey: string;
  position: string;
  age: number;
  height: string;
  weight: string;
}

interface TeamATS {
  wins: number;
  losses: number;
  pushes: number;
}

export function TeamDetailClient({
  sport,
  teamId,
}: {
  sport: string;
  teamId: string;
}) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const isMember = !!session?.user;

  // Fetch team info, roster, and ATS together
  const { data: teamData, isLoading } = useQuery({
    queryKey: ["team-detail", sport, teamId],
    queryFn: async () => {
      const [teamRes, rosterRes, atsRes] = await Promise.all([
        fetch(`/api/public/team?sport=${sport}&id=${teamId}`).then((r) => r.json()),
        fetch(`/api/public/team?sport=${sport}&id=${teamId}&type=roster`).then((r) => r.json()),
        fetch(`/api/public/team?sport=${sport}&id=${teamId}&type=ats`).then((r) => r.json()),
      ]);
      return {
        team: (teamRes.team ?? null) as TeamInfo | null,
        roster: (rosterRes.roster ?? []) as RosterPlayer[],
        ats: (atsRes.ats ?? null) as TeamATS | null,
      };
    },
  });

  const team = teamData?.team ?? null;
  const roster = teamData?.roster ?? [];
  const ats = teamData?.ats ?? null;

  // Check if favorite
  const { data: isFavorite = false } = useQuery({
    queryKey: ["team-favorite", sport, teamId],
    queryFn: async () => {
      const res = await fetch("/api/member/favorites");
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      const favs = d.favorites ?? [];
      return favs.some(
        (f: { sport: string; teamId: string }) =>
          f.sport === sport && f.teamId === teamId
      );
    },
    enabled: isMember,
  });

  const { mutate: toggleFavorite } = useMutation({
    mutationFn: async () => {
      if (!team) return;
      if (isFavorite) {
        await fetch("/api/member/favorites", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sport, teamId }),
        });
        return false;
      } else {
        await fetch("/api/member/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sport, teamId, name: team.name }),
        });
        return true;
      }
    },
    onSuccess: (newValue) => {
      queryClient.setQueryData(["team-favorite", sport, teamId], newValue);
      // Also invalidate the favorites list used by PersonalizedArticleGrid
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">找不到此球隊</p>
        <Link href={`/standings/${sport}`} className="text-blue-600 text-sm mt-2 inline-block">
          返回排名頁
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/standings/${sport}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        返回排名
      </Link>

      {/* Team Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {team.logo && (
              <img src={team.logo} alt={team.name} className="w-16 h-16" />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary">{team.abbreviation}</Badge>
                {team.record && (
                  <span className="text-sm text-muted-foreground">{team.record}</span>
                )}
              </div>
              {team.standingSummary && (
                <p className="text-sm text-muted-foreground mt-1">
                  {team.standingSummary}
                </p>
              )}
            </div>
            {isMember && (
              <Button
                variant={isFavorite ? "default" : "outline"}
                size="sm"
                onClick={() => toggleFavorite()}
                className="gap-1"
              >
                <Star
                  className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`}
                />
                {isFavorite ? "已關注" : "關注"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ATS (Against the Spread) */}
      {ats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ATS 紀錄</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{ats.wins}</p>
                <p className="text-xs text-muted-foreground">勝</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{ats.losses}</p>
                <p className="text-xs text-muted-foreground">負</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{ats.pushes}</p>
                <p className="text-xs text-muted-foreground">平</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Against the Spread 本季紀錄
            </p>
          </CardContent>
        </Card>
      )}

      {/* Roster */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">球員名單</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {roster.length === 0 ? (
            <p className="p-6 text-muted-foreground text-center">暫無球員資料</p>
          ) : (
            <MemberGate
              message="登入查看完整球員名單與數據"
              fallback={
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left py-2 px-3">#</th>
                        <th className="text-left py-2 px-3">球員</th>
                        <th className="text-center py-2 px-3">位置</th>
                        <th className="text-center py-2 px-3">年齡</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.slice(0, 5).map((p) => (
                        <tr key={p.id} className="border-b">
                          <td className="py-2 px-3 text-muted-foreground">{p.jersey}</td>
                          <td className="py-2 px-3 font-medium">{p.displayName}</td>
                          <td className="text-center py-2 px-3">{p.position}</td>
                          <td className="text-center py-2 px-3">{p.age}</td>
                        </tr>
                      ))}
                      {roster.slice(5, 8).map((p) => (
                        <tr key={p.id} className="border-b blur-sm">
                          <td className="py-2 px-3">{p.jersey}</td>
                          <td className="py-2 px-3">{p.displayName}</td>
                          <td className="text-center py-2 px-3">{p.position}</td>
                          <td className="text-center py-2 px-3">{p.age}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-2 px-3">#</th>
                      <th className="text-left py-2 px-3">球員</th>
                      <th className="text-center py-2 px-3">位置</th>
                      <th className="text-center py-2 px-3">年齡</th>
                      <th className="text-center py-2 px-3">身高</th>
                      <th className="text-center py-2 px-3">體重</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2 px-3 text-muted-foreground">{p.jersey}</td>
                        <td className="py-2 px-3">
                          <Link
                            href={`/player/${sport}/${p.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {p.displayName}
                          </Link>
                        </td>
                        <td className="text-center py-2 px-3">{p.position}</td>
                        <td className="text-center py-2 px-3">{p.age}</td>
                        <td className="text-center py-2 px-3">{p.height}</td>
                        <td className="text-center py-2 px-3">{p.weight}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MemberGate>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
