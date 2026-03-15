"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MemberGate } from "@/components/auth/MemberGate";
import { Lock } from "lucide-react";

interface Game {
  id: string;
  date: string;
  status: "in_progress" | "final" | "scheduled";
  statusDetail: string;
  homeTeam: {
    name: string;
    abbreviation: string;
    logo: string;
    score: string;
  };
  awayTeam: {
    name: string;
    abbreviation: string;
    logo: string;
    score: string;
  };
}

interface OddsLine {
  provider: string;
  details: string;
  overUnder: number;
  spread: number;
  homeMoneyLine: number;
  awayMoneyLine: number;
  homeSpreadOdds: number;
  awaySpreadOdds: number;
  homeFavorite: boolean;
}

const LEAGUE_OPTIONS = [
  { value: "nba", label: "NBA" },
  { value: "mlb", label: "MLB" },
];

export function OddsClient() {
  const { data: session } = useSession();
  const [league, setLeague] = useState("nba");
  const [games, setGames] = useState<Game[]>([]);
  const [oddsMap, setOddsMap] = useState<Record<string, OddsLine[]>>({});
  const [loading, setLoading] = useState(true);

  const isMember = !!session?.user;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/scoreboard?league=${league}`)
      .then((r) => r.json())
      .then((d) => {
        const gameList = d.games ?? [];
        setGames(gameList);
        // 為每場比賽取得賠率
        return Promise.all(
          gameList.map(async (g: Game) => {
            const endpoint = isMember
              ? `/api/member/game?eventId=${g.id}&league=${league}&type=odds`
              : `/api/public/game?eventId=${g.id}&league=${league}&type=odds`;
            try {
              const r = await fetch(endpoint);
              const d = await r.json();
              return { id: g.id, odds: d.odds ?? [] };
            } catch {
              return { id: g.id, odds: [] };
            }
          })
        );
      })
      .then((results) => {
        const map: Record<string, OddsLine[]> = {};
        for (const r of results) {
          map[r.id] = r.odds;
        }
        setOddsMap(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [league, isMember]);

  return (
    <Tabs value={league} onValueChange={setLeague}>
      <TabsList>
        {LEAGUE_OPTIONS.map((opt) => (
          <TabsTrigger key={opt.value} value={opt.value}>
            {opt.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {LEAGUE_OPTIONS.map((opt) => (
        <TabsContent key={opt.value} value={opt.value}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : games.length === 0 ? (
            <p className="text-slate-500 text-center py-8">今日暫無賽事</p>
          ) : (
            <div className="space-y-4 mt-4">
              {games.map((game) => {
                const odds = oddsMap[game.id] ?? [];
                return (
                  <Card key={game.id}>
                    <CardContent className="p-4">
                      {/* 比賽基本資訊 */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {game.awayTeam.logo && (
                            <img
                              src={game.awayTeam.logo}
                              alt=""
                              className="w-6 h-6"
                            />
                          )}
                          <span className="font-medium">
                            {game.awayTeam.abbreviation}
                          </span>
                          <span className="text-slate-400">@</span>
                          {game.homeTeam.logo && (
                            <img
                              src={game.homeTeam.logo}
                              alt=""
                              className="w-6 h-6"
                            />
                          )}
                          <span className="font-medium">
                            {game.homeTeam.abbreviation}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {game.statusDetail}
                        </span>
                      </div>

                      {/* 賠率表格 */}
                      {odds.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-slate-500 border-b">
                                <th className="text-left py-1">來源</th>
                                <th className="text-center py-1">Spread</th>
                                {isMember && (
                                  <>
                                    <th className="text-center py-1">O/U</th>
                                    <th className="text-center py-1">ML</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {odds.map((o, i) => (
                                <tr key={i} className="border-b last:border-0">
                                  <td className="py-1.5 text-slate-600">
                                    {o.provider}
                                  </td>
                                  <td className="text-center py-1.5">
                                    {o.details}
                                  </td>
                                  {isMember && (
                                    <>
                                      <td className="text-center py-1.5">
                                        {o.overUnder}
                                      </td>
                                      <td className="text-center py-1.5 text-xs">
                                        {o.awayMoneyLine > 0
                                          ? `+${o.awayMoneyLine}`
                                          : o.awayMoneyLine}{" "}
                                        /{" "}
                                        {o.homeMoneyLine > 0
                                          ? `+${o.homeMoneyLine}`
                                          : o.homeMoneyLine}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400">暫無賠率資料</p>
                      )}

                      {/* 未登入：顯示鎖定提示 */}
                      {!isMember && odds.length > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                          <Lock className="w-3 h-3" />
                          <MemberGate message="登入查看完整賠率分析（O/U + ML）">
                            <span />
                          </MemberGate>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
