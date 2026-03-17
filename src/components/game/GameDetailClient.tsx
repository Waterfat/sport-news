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

interface GameOdds {
  provider: string;
  details: string;
  overUnder: number;
  spread: number;
  homeMoneyLine: string;
  awayMoneyLine: string;
}

interface TeamInfo {
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  record: string;
}

interface GameInfo {
  id: string;
  date: string;
  status: "in_progress" | "final" | "scheduled";
  statusDetail: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  odds?: GameOdds;
}

interface BoxScoreTeam {
  teamName: string;
  logo: string;
  stats: { label: string; value: string }[];
}

interface BoxScorePlayer {
  name: string;
  position: string;
  stats: string[];
  starter: boolean;
}

interface BoxScoreData {
  teams: BoxScoreTeam[];
  players: { teamName: string; labels: string[]; athletes: BoxScorePlayer[] }[];
}

interface GameLeader {
  category: string;
  displayName: string;
  displayValue: string;
}

interface TeamLeadersData {
  teamName: string;
  logo: string;
  leaders: GameLeader[];
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
  const [boxscore, setBoxscore] = useState<BoxScoreData | null>(null);
  const [leaders, setLeaders] = useState<TeamLeadersData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");

  const isMember = !!session?.user;

  // Fetch game info from scoreboard
  useEffect(() => {
    fetch(`/api/public/scoreboard?league=${sport}`)
      .then((r) => r.json())
      .then((d) => {
        const g = (d.games ?? []).find((g: GameInfo) => g.id === eventId);
        if (g) setGame(g);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sport, eventId]);

  // Fetch leaders on mount
  useEffect(() => {
    const endpoint = isMember
      ? `/api/member/game?eventId=${eventId}&league=${sport}&type=leaders`
      : `/api/public/game?eventId=${eventId}&league=${sport}&type=leaders`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => setLeaders(d.leaders ?? []))
      .catch(() => {});
  }, [eventId, sport, isMember]);

  // Fetch PBP when tab switches
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

  // Fetch boxscore when tab switches
  useEffect(() => {
    if (tab !== "boxscore") return;

    const endpoint = isMember
      ? `/api/member/game?eventId=${eventId}&league=${sport}&type=boxscore`
      : `/api/public/game?eventId=${eventId}&league=${sport}&type=boxscore`;

    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => setBoxscore(d.boxscore ?? null))
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
      <Link
        href="/scores"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600"
      >
        <ArrowLeft className="w-4 h-4" />
        返回比分
      </Link>

      {/* Game Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-6">
            <Link href={`/team/${sport}/${game.awayTeam.abbreviation}`} className="text-center hover:opacity-80">
              {game.awayTeam.logo && (
                <img src={game.awayTeam.logo} alt="" className="w-14 h-14 mx-auto" />
              )}
              <p className="text-sm font-medium mt-1">{game.awayTeam.name}</p>
              {game.awayTeam.record && (
                <p className="text-xs text-slate-400">{game.awayTeam.record}</p>
              )}
            </Link>
            <div className="text-center">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-slate-900">
                  {game.awayTeam.score}
                </span>
                <span className="text-slate-400 text-lg">-</span>
                <span className="text-3xl font-bold text-slate-900">
                  {game.homeTeam.score}
                </span>
              </div>
              <Badge className={`mt-2 ${statusColor}`}>
                {game.statusDetail}
              </Badge>
            </div>
            <Link href={`/team/${sport}/${game.homeTeam.abbreviation}`} className="text-center hover:opacity-80">
              {game.homeTeam.logo && (
                <img src={game.homeTeam.logo} alt="" className="w-14 h-14 mx-auto" />
              )}
              <p className="text-sm font-medium mt-1">{game.homeTeam.name}</p>
              {game.homeTeam.record && (
                <p className="text-xs text-slate-400">{game.homeTeam.record}</p>
              )}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="summary">摘要</TabsTrigger>
          {game.status !== "scheduled" && (
            <TabsTrigger value="boxscore">數據</TabsTrigger>
          )}
          <TabsTrigger value="pbp">逐球紀錄</TabsTrigger>
          <TabsTrigger value="odds">賠率</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">比分</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 text-center text-sm">
                  <div>
                    <p className="text-3xl font-bold">{game.awayTeam.score}</p>
                    <p className="text-slate-500">{game.awayTeam.abbreviation}</p>
                  </div>
                  <div className="flex items-center justify-center text-slate-400 text-lg">
                    VS
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{game.homeTeam.score}</p>
                    <p className="text-slate-500">{game.homeTeam.abbreviation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaders */}
            {leaders.length > 0 && game.status !== "scheduled" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">本場最佳</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {leaders.map((team) => (
                      <div key={team.teamName}>
                        <div className="flex items-center gap-2 mb-2">
                          {team.logo && (
                            <img src={team.logo} alt="" className="w-5 h-5" />
                          )}
                          <span className="text-sm font-medium text-slate-700">{team.teamName}</span>
                        </div>
                        <div className="space-y-1">
                          {team.leaders.slice(0, 3).map((l) => (
                            <p key={l.category} className="text-xs text-slate-600">
                              <span className="font-medium">{l.displayName}</span>
                              <span className="text-slate-400 ml-1">{l.displayValue}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Odds */}
            {game.odds && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">賽前賠率</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center text-sm">
                    <div>
                      <p className="font-medium text-slate-600">Spread</p>
                      <p className="text-lg">{game.odds.details || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-600">O/U</p>
                      <p className="text-lg">{game.odds.overUnder || "-"}</p>
                    </div>
                    <MemberGate message="登入查看 Money Line">
                      <div>
                        <p className="font-medium text-slate-600">ML</p>
                        <p className="text-lg">
                          {game.odds.awayMoneyLine} / {game.odds.homeMoneyLine}
                        </p>
                      </div>
                    </MemberGate>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    來源：{game.odds.provider}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Box Score */}
        <TabsContent value="boxscore">
          {!boxscore ? (
            <Card>
              <CardContent className="p-6 text-center text-slate-500">
                暫無數據
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Team Stats Comparison */}
              {boxscore.teams.length >= 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">球隊數據對比</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-center py-2 px-2 font-medium text-slate-600 w-1/4">
                            {boxscore.teams[0].teamName}
                          </th>
                          <th className="text-center py-2 px-2 font-medium text-slate-600">項目</th>
                          <th className="text-center py-2 px-2 font-medium text-slate-600 w-1/4">
                            {boxscore.teams[1].teamName}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {boxscore.teams[0].stats.map((stat, idx) => (
                          <tr key={stat.label} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                            <td className="text-center py-1.5 px-2 tabular-nums">{stat.value}</td>
                            <td className="text-center py-1.5 px-2 text-slate-500 text-xs">{stat.label}</td>
                            <td className="text-center py-1.5 px-2 tabular-nums">
                              {boxscore.teams[1].stats[idx]?.value ?? "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {/* Player Stats */}
              {boxscore.players.map((group) => (
                <Card key={group.teamName}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{group.teamName}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <th className="text-left py-2 px-2 font-medium text-slate-600 sticky left-0 bg-slate-50 min-w-[100px]">
                              球員
                            </th>
                            {group.labels.map((label) => (
                              <th key={label} className="text-center py-2 px-1.5 font-medium text-slate-600 min-w-[36px]">
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Starters */}
                          {group.athletes.filter((a) => a.starter).length > 0 && (
                            <tr>
                              <td colSpan={group.labels.length + 1} className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-100">
                                先發
                              </td>
                            </tr>
                          )}
                          {group.athletes
                            .filter((a) => a.starter)
                            .map((athlete) => (
                              <tr key={athlete.name} className="border-b border-slate-100">
                                <td className="py-1.5 px-2 sticky left-0 bg-white">
                                  <span className="font-medium">{athlete.name}</span>
                                  <span className="text-slate-400 ml-1">{athlete.position}</span>
                                </td>
                                {athlete.stats.map((s, i) => (
                                  <td key={i} className="text-center py-1.5 px-1.5 tabular-nums">{s}</td>
                                ))}
                              </tr>
                            ))}
                          {/* Bench */}
                          {group.athletes.filter((a) => !a.starter).length > 0 && (
                            <tr>
                              <td colSpan={group.labels.length + 1} className="text-xs text-slate-400 font-medium px-2 py-1 bg-slate-100">
                                替補
                              </td>
                            </tr>
                          )}
                          {group.athletes
                            .filter((a) => !a.starter)
                            .map((athlete) => (
                              <tr key={athlete.name} className="border-b border-slate-100">
                                <td className="py-1.5 px-2 sticky left-0 bg-white">
                                  <span className="font-medium">{athlete.name}</span>
                                  <span className="text-slate-400 ml-1">{athlete.position}</span>
                                </td>
                                {athlete.stats.map((s, i) => (
                                  <td key={i} className="text-center py-1.5 px-1.5 tabular-nums">{s}</td>
                                ))}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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

        {/* Odds */}
        <TabsContent value="odds">
          {game.odds ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">賠率詳情</CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left py-2 px-3">項目</th>
                      <th className="text-center py-2 px-3">數值</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-slate-600">Spread</td>
                      <td className="text-center py-2 px-3">{game.odds.details}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-slate-600">Over/Under</td>
                      <td className="text-center py-2 px-3">{game.odds.overUnder}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-slate-600">來源</td>
                      <td className="text-center py-2 px-3">{game.odds.provider}</td>
                    </tr>
                  </tbody>
                </table>
                <MemberGate message="登入查看完整 Money Line 賠率">
                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="border-b bg-slate-50">
                        <th className="text-left py-2 px-3">Money Line</th>
                        <th className="text-center py-2 px-3">客隊</th>
                        <th className="text-center py-2 px-3">主隊</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Close</td>
                        <td className="text-center py-2 px-3 font-medium">
                          {game.odds.awayMoneyLine}
                        </td>
                        <td className="text-center py-2 px-3 font-medium">
                          {game.odds.homeMoneyLine}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </MemberGate>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-slate-500">
                暫無賠率資料
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
