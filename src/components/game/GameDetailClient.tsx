"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MemberGate } from "@/components/auth/MemberGate";
import { ArrowLeft } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

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

interface InjuryPlayer {
  name: string;
  status: string;
  description: string;
}

interface TeamInjuriesData {
  team: string;
  teamLogo: string;
  players: InjuryPlayer[];
}

interface WinProbPoint {
  homeWinPct: number;
  playId: string;
  secondsLeft: number;
}

interface SeasonSeriesGame {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
}

interface PickCenterItem {
  provider: string;
  details: string;
  homeWinPct: number;
  awayWinPct: number;
}

function getGameApiBase(isMember: boolean) {
  return isMember ? "/api/member/game" : "/api/public/game";
}

/** Convert secondsLeft to game progress label (Q1-Q4 for NBA) */
function formatGameProgress(secondsLeft: number, totalSeconds: number): string {
  const elapsed = totalSeconds - secondsLeft;
  const pct = (elapsed / totalSeconds) * 100;
  if (pct <= 25) return "Q1";
  if (pct <= 50) return "Q2";
  if (pct <= 75) return "Q3";
  return "Q4";
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
  const [injuries, setInjuries] = useState<TeamInjuriesData[]>([]);
  const [winProb, setWinProb] = useState<WinProbPoint[]>([]);
  const [seasonSeries, setSeasonSeries] = useState<SeasonSeriesGame[]>([]);
  const [pickCenter, setPickCenter] = useState<PickCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("summary");

  const isMember = !!session?.user;
  const apiBase = getGameApiBase(isMember);

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
    fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=leaders`)
      .then((r) => r.json())
      .then((d) => setLeaders(d.leaders ?? []))
      .catch(() => {});
  }, [eventId, sport, apiBase]);

  // Fetch win probability + season series + pick center on summary tab
  useEffect(() => {
    if (tab !== "summary") return;

    fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=winprobability`)
      .then((r) => r.json())
      .then((d) => setWinProb(d.winprobability ?? []))
      .catch(() => {});

    fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=seasonseries`)
      .then((r) => r.json())
      .then((d) => setSeasonSeries(d.seasonseries ?? []))
      .catch(() => {});

    fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=pickcenter`)
      .then((r) => r.json())
      .then((d) => setPickCenter(d.pickcenter ?? []))
      .catch(() => {});
  }, [tab, eventId, sport, apiBase]);

  // Fetch PBP when tab switches
  useEffect(() => {
    if (tab !== "pbp") return;

    fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=plays`)
      .then((r) => r.json())
      .then((d) => {
        setPlays(d.plays ?? []);
        setTotalPlays(d.totalCount ?? 0);
      })
      .catch(() => {});
  }, [tab, eventId, sport, apiBase]);

  // Fetch boxscore when tab switches
  useEffect(() => {
    if (tab !== "boxscore") return;

    fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=boxscore`)
      .then((r) => r.json())
      .then((d) => setBoxscore(d.boxscore ?? null))
      .catch(() => {});
  }, [tab, eventId, sport, apiBase]);

  // Fetch injuries when tab switches
  useEffect(() => {
    if (tab !== "injuries") return;

    fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=injuries`)
      .then((r) => r.json())
      .then((d) => setInjuries(d.injuries ?? []))
      .catch(() => {});
  }, [tab, eventId, sport, apiBase]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">找不到此比賽</p>
        <Link href="/scores" className="text-primary text-sm mt-2 inline-block">
          返回比分頁
        </Link>
      </div>
    );
  }

  const statusColor =
    game.status === "in_progress"
      ? "bg-green-100 text-green-700"
      : game.status === "final"
        ? "bg-muted text-muted-foreground"
        : "bg-blue-100 text-blue-700";

  // Prepare win probability chart data
  const maxSeconds = winProb.length > 0 ? Math.max(...winProb.map((p) => p.secondsLeft)) : 2880;
  const chartData = winProb.map((p) => ({
    ...p,
    progress: formatGameProgress(p.secondsLeft, maxSeconds),
    elapsed: maxSeconds - p.secondsLeft,
  }));

  return (
    <div className="space-y-6">
      <Link
        href="/scores"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
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
                <p className="text-xs text-muted-foreground">{game.awayTeam.record}</p>
              )}
            </Link>
            <div className="text-center">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-foreground tabular-nums">
                  {game.awayTeam.score}
                </span>
                <span className="text-muted-foreground text-lg">-</span>
                <span className="text-3xl font-bold text-foreground tabular-nums">
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
                <p className="text-xs text-muted-foreground">{game.homeTeam.record}</p>
              )}
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="summary">摘要</TabsTrigger>
          {game.status !== "scheduled" && (
            <TabsTrigger value="boxscore">數據</TabsTrigger>
          )}
          <TabsTrigger value="pbp">逐球紀錄</TabsTrigger>
          <TabsTrigger value="odds">賠率</TabsTrigger>
          <TabsTrigger value="injuries">傷兵</TabsTrigger>
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
                    <p className="text-3xl font-bold tabular-nums">{game.awayTeam.score}</p>
                    <p className="text-muted-foreground">{game.awayTeam.abbreviation}</p>
                  </div>
                  <div className="flex items-center justify-center text-muted-foreground text-lg">
                    VS
                  </div>
                  <div>
                    <p className="text-3xl font-bold tabular-nums">{game.homeTeam.score}</p>
                    <p className="text-muted-foreground">{game.homeTeam.abbreviation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Win Probability Chart */}
            {chartData.length > 0 && game.status !== "scheduled" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">勝率走勢</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-2">
                    主隊（{game.homeTeam.name}）勝率
                  </p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        dataKey="elapsed"
                        tickFormatter={(val: number) => {
                          const pct = (val / maxSeconds) * 100;
                          if (pct <= 1) return "開始";
                          if (Math.abs(pct - 25) < 3) return "Q1";
                          if (Math.abs(pct - 50) < 3) return "Q2";
                          if (Math.abs(pct - 75) < 3) return "Q3";
                          if (pct >= 97) return "Q4";
                          return "";
                        }}
                        tick={{ fontSize: 11 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        tickFormatter={(val: number) => `${val}%`}
                        className="text-muted-foreground"
                      />
                      <Tooltip
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(value: any) => [`${Number(value).toFixed(1)}%`, "主隊勝率"]}
                        labelFormatter={() => ""}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                      <Area
                        type="monotone"
                        dataKey="homeWinPct"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

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
                          <span className="text-sm font-medium text-foreground">{team.teamName}</span>
                        </div>
                        <div className="space-y-1">
                          {team.leaders.slice(0, 3).map((l) => (
                            <p key={l.category} className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{l.displayName}</span>
                              <span className="ml-1">{l.displayValue}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Season Series (Head-to-Head) */}
            {seasonSeries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">本季交手紀錄</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {seasonSeries.map((g, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2">
                        <span className="text-muted-foreground text-xs">
                          {g.date ? new Date(g.date).toLocaleDateString("zh-TW", { month: "short", day: "numeric" }) : "-"}
                        </span>
                        <span className="font-medium">
                          {g.awayTeam} <span className="tabular-nums">{g.awayScore}</span>
                        </span>
                        <span className="text-muted-foreground">@</span>
                        <span className="font-medium">
                          {g.homeTeam} <span className="tabular-nums">{g.homeScore}</span>
                        </span>
                        <span className="text-xs text-muted-foreground">{g.status}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pick Center */}
            {pickCenter.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">專家預測</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pickCenter.map((p, idx) => (
                      <div key={idx} className="text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted-foreground">{p.provider || "ESPN"}</span>
                          <span className="text-xs text-muted-foreground">{p.details}</span>
                        </div>
                        <div className="flex h-5 rounded-full overflow-hidden bg-muted">
                          <div
                            className="bg-red-500/80 flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${Math.max(p.awayWinPct * 100, 5)}%` }}
                          >
                            {(p.awayWinPct * 100).toFixed(0)}%
                          </div>
                          <div
                            className="bg-blue-500/80 flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${Math.max(p.homeWinPct * 100, 5)}%` }}
                          >
                            {(p.homeWinPct * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
                          <span>{game.awayTeam.abbreviation}</span>
                          <span>{game.homeTeam.abbreviation}</span>
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
                      <p className="font-medium text-muted-foreground">Spread</p>
                      <p className="text-lg tabular-nums">{game.odds.details || "-"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">O/U</p>
                      <p className="text-lg tabular-nums">{game.odds.overUnder || "-"}</p>
                    </div>
                    <MemberGate message="登入查看 Money Line">
                      <div>
                        <p className="font-medium text-muted-foreground">ML</p>
                        <p className="text-lg tabular-nums">
                          {game.odds.awayMoneyLine} / {game.odds.homeMoneyLine}
                        </p>
                      </div>
                    </MemberGate>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
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
              <CardContent className="p-6 text-center text-muted-foreground">
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
                        <tr className="border-b bg-muted">
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground w-1/4">
                            {boxscore.teams[0].teamName}
                          </th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground">項目</th>
                          <th className="text-center py-2 px-2 font-medium text-muted-foreground w-1/4">
                            {boxscore.teams[1].teamName}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {boxscore.teams[0].stats.map((stat, idx) => (
                          <tr key={stat.label} className={idx % 2 === 0 ? "bg-card" : "bg-muted/50"}>
                            <td className="text-center py-1.5 px-2 tabular-nums">{stat.value}</td>
                            <td className="text-center py-1.5 px-2 text-muted-foreground text-xs">{stat.label}</td>
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
                          <tr className="border-b bg-muted">
                            <th className="text-left py-2 px-2 font-medium text-muted-foreground sticky left-0 bg-muted min-w-[100px]">
                              球員
                            </th>
                            {group.labels.map((label) => (
                              <th key={label} className="text-center py-2 px-1.5 font-medium text-muted-foreground min-w-[36px]">
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Starters */}
                          {group.athletes.filter((a) => a.starter).length > 0 && (
                            <tr>
                              <td colSpan={group.labels.length + 1} className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/70">
                                先發
                              </td>
                            </tr>
                          )}
                          {group.athletes
                            .filter((a) => a.starter)
                            .map((athlete) => (
                              <tr key={athlete.name} className="border-b border-border">
                                <td className="py-1.5 px-2 sticky left-0 bg-card">
                                  <span className="font-medium">{athlete.name}</span>
                                  <span className="text-muted-foreground ml-1">{athlete.position}</span>
                                </td>
                                {athlete.stats.map((s, i) => (
                                  <td key={i} className="text-center py-1.5 px-1.5 tabular-nums">{s}</td>
                                ))}
                              </tr>
                            ))}
                          {/* Bench */}
                          {group.athletes.filter((a) => !a.starter).length > 0 && (
                            <tr>
                              <td colSpan={group.labels.length + 1} className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/70">
                                替補
                              </td>
                            </tr>
                          )}
                          {group.athletes
                            .filter((a) => !a.starter)
                            .map((athlete) => (
                              <tr key={athlete.name} className="border-b border-border">
                                <td className="py-1.5 px-2 sticky left-0 bg-card">
                                  <span className="font-medium">{athlete.name}</span>
                                  <span className="text-muted-foreground ml-1">{athlete.position}</span>
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
              <CardContent className="p-6 text-center text-muted-foreground">
                暫無逐球紀錄
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                {plays.map((play) => (
                  <Card key={play.id}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="text-xs text-muted-foreground whitespace-nowrap pt-0.5">
                        {play.period} {play.clock}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-sm ${play.scoringPlay ? "font-medium text-green-700" : "text-foreground"}`}
                        >
                          {play.text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
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
                    <tr className="border-b bg-muted">
                      <th className="text-left py-2 px-3 text-muted-foreground">項目</th>
                      <th className="text-center py-2 px-3 text-muted-foreground">數值</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">Spread</td>
                      <td className="text-center py-2 px-3 tabular-nums">{game.odds.details}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">Over/Under</td>
                      <td className="text-center py-2 px-3 tabular-nums">{game.odds.overUnder}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 px-3 text-muted-foreground">來源</td>
                      <td className="text-center py-2 px-3">{game.odds.provider}</td>
                    </tr>
                  </tbody>
                </table>
                <MemberGate message="登入查看完整 Money Line 賠率">
                  <table className="w-full text-sm mt-4">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="text-left py-2 px-3 text-muted-foreground">Money Line</th>
                        <th className="text-center py-2 px-3 text-muted-foreground">客隊</th>
                        <th className="text-center py-2 px-3 text-muted-foreground">主隊</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="py-2 px-3 text-muted-foreground">Close</td>
                        <td className="text-center py-2 px-3 font-medium tabular-nums">
                          {game.odds.awayMoneyLine}
                        </td>
                        <td className="text-center py-2 px-3 font-medium tabular-nums">
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
              <CardContent className="p-6 text-center text-muted-foreground">
                暫無賠率資料
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Injuries */}
        <TabsContent value="injuries">
          {injuries.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                暫無傷兵資料
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {injuries.map((team) => (
                <Card key={team.team}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {team.teamLogo && (
                        <img src={team.teamLogo} alt="" className="w-5 h-5" />
                      )}
                      {team.team}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {team.players.length === 0 ? (
                      <p className="text-sm text-muted-foreground">無傷兵</p>
                    ) : (
                      <div className="space-y-2">
                        {team.players.map((p, idx) => (
                          <div key={idx} className="flex items-start gap-3 border-b border-border last:border-0 pb-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">{p.name}</p>
                              {p.description && (
                                <p className="text-xs text-muted-foreground">{p.description}</p>
                              )}
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                p.status.toLowerCase().includes("out")
                                  ? "border-red-300 text-red-600"
                                  : p.status.toLowerCase().includes("day-to-day") || p.status.toLowerCase().includes("questionable")
                                    ? "border-yellow-300 text-yellow-700"
                                    : "border-border text-muted-foreground"
                              }
                            >
                              {p.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
