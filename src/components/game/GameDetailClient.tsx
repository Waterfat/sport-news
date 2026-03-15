"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MemberGate } from "@/components/auth/MemberGate";
import { ArrowLeft } from "lucide-react";

interface Play {
  id: string;
  sequence: number;
  text: string;
  type: string;
  period: string;
  clock: string;
  teamName: string | null;
  scoringPlay: boolean;
  homeScore: string;
  awayScore: string;
}

interface OddsLine {
  provider: string;
  details: string;
  overUnder: number;
  spread: number;
  homeMoneyLine: number;
  awayMoneyLine: number;
}

interface GameInfo {
  id: string;
  date: string;
  status: "in_progress" | "final" | "scheduled";
  statusDetail: string;
  homeTeam: { name: string; abbreviation: string; logo: string; score: string };
  awayTeam: { name: string; abbreviation: string; logo: string; score: string };
}

export function GameDetailClient({
  sport,
  eventId,
}: {
  sport: string;
  eventId: string;
}) {
  const { data: session } = useSession();
  const [game, setGame] = useState<GameInfo | null>(null);
  const [plays, setPlays] = useState<Play[]>([]);
  const [totalPlays, setTotalPlays] = useState(0);
  const [odds, setOdds] = useState<OddsLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");

  const isMember = !!session?.user;

  // 取得比賽基本資料
  useEffect(() => {
    fetch(`/api/public/scoreboard?league=${sport}`)
      .then((r) => r.json())
      .then((d) => {
        const g = (d.games ?? []).find(
          (g: GameInfo) => g.id === eventId
        );
        if (g) setGame(g);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport, eventId]);

  // 取得 PBP
  useEffect(() => {
    if (tab !== "pbp") return;

    const endpoint = isMember
      ? `/api/member/game?eventId=${eventId}&league=${sport}&type=plays`
      : `/api/public/game?eventId=${eventId}&league=${sport}&type=plays`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => {
        setPlays(d.plays ?? []);
        setTotalPlays(d.totalCount ?? 0);
      })
      .catch(() => {});
  }, [tab, eventId, sport, isMember]);

  // 取得賠率
  useEffect(() => {
    if (tab !== "odds") return;

    const endpoint = isMember
      ? `/api/member/game?eventId=${eventId}&league=${sport}&type=odds`
      : `/api/public/game?eventId=${eventId}&league=${sport}&type=odds`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => setOdds(d.odds ?? []))
      .catch(() => {});
  }, [tab, eventId, sport, isMember]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">找不到此比賽</p>
        <Link href="/scores" className="text-blue-600 text-sm mt-2 inline-block">
          返回比分頁
        </Link>
      </div>
    );
  }

  const statusColor =
    game.status === "in_progress"
      ? "bg-green-100 text-green-700"
      : game.status === "final"
        ? "bg-slate-100 text-slate-700"
        : "bg-blue-100 text-blue-700";

  return (
    <div className="space-y-6">
      {/* 返回 */}
      <Link
        href="/scores"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        返回比分
      </Link>

      {/* 比賽標題 */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                {game.awayTeam.logo && (
                  <img
                    src={game.awayTeam.logo}
                    alt=""
                    className="w-12 h-12 mx-auto"
                  />
                )}
                <p className="text-sm font-medium mt-1">
                  {game.awayTeam.name}
                </p>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {game.awayTeam.score}
              </div>
              <div className="text-slate-400 text-lg">-</div>
              <div className="text-3xl font-bold text-slate-900">
                {game.homeTeam.score}
              </div>
              <div className="text-center">
                {game.homeTeam.logo && (
                  <img
                    src={game.homeTeam.logo}
                    alt=""
                    className="w-12 h-12 mx-auto"
                  />
                )}
                <p className="text-sm font-medium mt-1">
                  {game.homeTeam.name}
                </p>
              </div>
            </div>
            <Badge className={statusColor}>{game.statusDetail}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary">摘要</TabsTrigger>
          <TabsTrigger value="pbp">逐球紀錄</TabsTrigger>
          <TabsTrigger value="odds">賠率</TabsTrigger>
        </TabsList>

        {/* 摘要 */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">比賽摘要</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 text-center text-sm">
                <div>
                  <p className="text-2xl font-bold">{game.awayTeam.score}</p>
                  <p className="text-slate-500">{game.awayTeam.abbreviation}</p>
                </div>
                <div className="flex items-center justify-center text-slate-400">
                  VS
                </div>
                <div>
                  <p className="text-2xl font-bold">{game.homeTeam.score}</p>
                  <p className="text-slate-500">{game.homeTeam.abbreviation}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PBP */}
        <TabsContent value="pbp">
          {plays.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-slate-500">
                暫無逐球紀錄
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {plays.map((play) => (
                  <Card key={play.id}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="text-xs text-slate-400 whitespace-nowrap pt-0.5">
                        {play.period} {play.clock}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm ${play.scoringPlay ? "font-medium text-green-700" : "text-slate-700"}`}
                        >
                          {play.text}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {play.awayScore} - {play.homeScore}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 未登入且還有更多 → 顯示 MemberGate */}
              {!isMember && totalPlays > plays.length && (
                <div className="mt-4">
                  <MemberGate
                    message={`登入查看完整逐球紀錄（共 ${totalPlays} 筆）`}
                  >
                    <span />
                  </MemberGate>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* 賠率 */}
        <TabsContent value="odds">
          {odds.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-slate-500">
                暫無賠率資料
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2 px-3">來源</th>
                      <th className="text-center py-2 px-3">Spread</th>
                      <th className="text-center py-2 px-3">O/U</th>
                      {isMember && (
                        <th className="text-center py-2 px-3">ML</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {odds.map((o, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 px-3">{o.provider}</td>
                        <td className="text-center py-2 px-3">{o.details}</td>
                        <td className="text-center py-2 px-3">
                          {o.overUnder}
                        </td>
                        {isMember && (
                          <td className="text-center py-2 px-3 text-xs">
                            {o.awayMoneyLine > 0
                              ? `+${o.awayMoneyLine}`
                              : o.awayMoneyLine}{" "}
                            /{" "}
                            {o.homeMoneyLine > 0
                              ? `+${o.homeMoneyLine}`
                              : o.homeMoneyLine}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {!isMember && (
            <div className="mt-4">
              <MemberGate message="登入查看完整賠率分析">
                <span />
              </MemberGate>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
