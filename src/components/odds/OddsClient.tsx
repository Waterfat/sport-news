"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock } from "lucide-react";

interface GameOdds {
  provider: string;
  details: string;
  overUnder: number;
  spread: number;
  homeMoneyLine: string;
  awayMoneyLine: string;
}

interface Game {
  id: string;
  date: string;
  status: "in_progress" | "final" | "scheduled";
  statusDetail: string;
  homeTeam: { name: string; abbreviation: string; logo: string; score: string };
  awayTeam: { name: string; abbreviation: string; logo: string; score: string };
  odds?: GameOdds;
}

const LEAGUE_OPTIONS = [
  { value: "nba", label: "NBA" },
  { value: "mlb", label: "MLB" },
];

/** 將 ESPN 時間格式（如 "3/17 - 7:00 PM EDT"）轉為台灣時間 */
function formatStatusDetail(detail: string): string {
  // 匹配 "M/D - H:MM PM EDT" 格式
  const match = detail.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*(E[DS]T)/i);
  if (!match) return detail;

  const [, month, day, hourStr, minute, ampm, tz] = match;
  let hour = parseInt(hourStr);
  if (ampm.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  // EDT = UTC-4, EST = UTC-5
  const utcOffset = tz.toUpperCase() === "EDT" ? -4 : -5;
  const now = new Date();
  const year = now.getFullYear();
  const utcDate = new Date(Date.UTC(year, parseInt(month) - 1, parseInt(day), hour - utcOffset, parseInt(minute)));

  // 轉台灣時間 (UTC+8)
  const twDate = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000);
  const twMonth = twDate.getUTCMonth() + 1;
  const twDay = twDate.getUTCDate();
  const twHour = twDate.getUTCHours();
  const twMin = twDate.getUTCMinutes().toString().padStart(2, "0");

  return `${twMonth}/${twDay} ${twHour}:${twMin}`;
}

export function OddsClient() {
  const { data: session } = useSession();
  const [league, setLeague] = useState("nba");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const isMember = !!session?.user;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/scoreboard?league=${league}`)
      .then((r) => r.json())
      .then((d) => setGames(d.games ?? []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [league]);

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
            <div className="space-y-3 mt-4">
              {games.map((game) => (
                <Card key={game.id}>
                  <CardContent className="p-4">
                    {/* Game header */}
                    <div className="flex items-center justify-between mb-3">
                      <Link
                        href={`/game/${league}/${game.id}`}
                        className="flex items-center gap-2 hover:opacity-80"
                      >
                        {game.awayTeam.logo && (
                          <img src={game.awayTeam.logo} alt="" className="w-6 h-6" />
                        )}
                        <span className="font-medium">{game.awayTeam.abbreviation}</span>
                        <span className="text-slate-400">@</span>
                        {game.homeTeam.logo && (
                          <img src={game.homeTeam.logo} alt="" className="w-6 h-6" />
                        )}
                        <span className="font-medium">{game.homeTeam.abbreviation}</span>
                      </Link>
                      <span className="text-xs text-slate-500">{formatStatusDetail(game.statusDetail)}</span>
                    </div>

                    {/* Odds table */}
                    {game.odds ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-500 border-b">
                              <th className="text-left py-1">來源</th>
                              <th className="text-center py-1">Spread</th>
                              <th className="text-center py-1">O/U</th>
                              {isMember && <th className="text-center py-1">ML</th>}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-b last:border-0">
                              <td className="py-1.5 text-slate-600">{game.odds.provider}</td>
                              <td className="text-center py-1.5">{game.odds.details}</td>
                              <td className="text-center py-1.5">{game.odds.overUnder}</td>
                              {isMember && (
                                <td className="text-center py-1.5 text-xs">
                                  {game.odds.awayMoneyLine} / {game.odds.homeMoneyLine}
                                </td>
                              )}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">暫無賠率資料</p>
                    )}

                    {/* Lock hint for non-members */}
                    {!isMember && game.odds && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                        <Lock className="w-3 h-3" />
                        <span>登入查看 Money Line 賠率</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
