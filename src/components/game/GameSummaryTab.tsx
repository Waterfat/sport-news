import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberGate } from "@/components/auth/MemberGate";
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
import type {
  GameInfo,
  TeamLeadersData,
  WinProbPoint,
  SeasonSeriesData,
  SeasonSeriesGame,
  PickCenterItem,
} from "@/types/game";

/** Convert secondsLeft to game progress label (Q1-Q4 for NBA) */
function formatGameProgress(secondsLeft: number, totalSeconds: number): string {
  const elapsed = totalSeconds - secondsLeft;
  const pct = (elapsed / totalSeconds) * 100;
  if (pct <= 25) return "Q1";
  if (pct <= 50) return "Q2";
  if (pct <= 75) return "Q3";
  return "Q4";
}

interface GameSummaryTabProps {
  game: GameInfo;
  leaders: TeamLeadersData[];
  winProb: WinProbPoint[];
  seasonSeries: SeasonSeriesData | null;
  pickCenter: PickCenterItem[];
}

export function GameSummaryTab({
  game,
  leaders,
  winProb,
  seasonSeries,
  pickCenter,
}: GameSummaryTabProps) {
  // Prepare win probability chart data
  const maxSeconds = winProb.length > 0 ? Math.max(...winProb.map((p) => p.secondsLeft)) : 2880;
  const chartData = winProb.map((p) => ({
    ...p,
    progress: formatGameProgress(p.secondsLeft, maxSeconds),
    elapsed: maxSeconds - p.secondsLeft,
  }));

  return (
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
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span className="text-blue-600 font-medium">{game.homeTeam.name}（主）</span>
              <span className="text-red-500 font-medium">{game.awayTeam.name}（客）</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="homeWinGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.05} />
                    <stop offset="50%" stopColor="#ef4444" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
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
                  ticks={[0, 25, 50, 75, 100]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val: number) => {
                    if (val === 0) return "客隊";
                    if (val === 100) return "主隊";
                    return `${val}%`;
                  }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => {
                    const homeVal = Number(value).toFixed(1);
                    const awayVal = (100 - Number(value)).toFixed(1);
                    return [`主隊 ${homeVal}% / 客隊 ${awayVal}%`, "勝率"];
                  }}
                  labelFormatter={() => ""}
                  contentStyle={{ fontSize: 12 }}
                />
                <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: "50%", fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Area
                  type="monotone"
                  dataKey="homeWinPct"
                  stroke="#3b82f6"
                  fill="url(#homeWinGrad)"
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
                    {(team.leaders ?? []).slice(0, 3).map((l) => (
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
      {seasonSeries && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本季交手紀錄</CardTitle>
            {seasonSeries.summary && (
              <p className="text-sm text-muted-foreground">{seasonSeries.summary}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {seasonSeries.games.map((g: SeasonSeriesGame, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm border-b border-border last:border-0 pb-2">
                  <span className="text-muted-foreground text-xs w-16">
                    {g.date ? new Date(g.date).toLocaleDateString("zh-TW", { month: "short", day: "numeric" }) : "-"}
                  </span>
                  <span className="font-medium flex-1 text-right">
                    {g.awayTeam} <span className="tabular-nums">{g.awayScore}</span>
                  </span>
                  <span className="text-muted-foreground mx-2">@</span>
                  <span className="font-medium flex-1">
                    <span className="tabular-nums">{g.homeScore}</span> {g.homeTeam}
                  </span>
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
                    <span className="text-xs text-muted-foreground">{p.details}</span>
                  </div>
                  <div className="flex h-5 rounded-full overflow-hidden bg-muted">
                    {(() => {
                      const awayWidth = Math.max(p.awayWinPct * 100, 5);
                      const homeWidth = 100 - awayWidth;
                      return (
                        <>
                          <div
                            className="bg-red-500/80 flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${awayWidth}%` }}
                          >
                            {(p.awayWinPct * 100).toFixed(0)}%
                          </div>
                          <div
                            className="bg-blue-500/80 flex items-center justify-center text-xs text-white font-medium"
                            style={{ width: `${homeWidth}%` }}
                          >
                            {(p.homeWinPct * 100).toFixed(0)}%
                          </div>
                        </>
                      );
                    })()}
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
                <p className="font-medium text-muted-foreground">Spread (讓分)</p>
                <p className="text-lg tabular-nums">{game.odds.details || "-"}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">O/U (大小分)</p>
                <p className="text-lg tabular-nums">{game.odds.overUnder || "-"}</p>
              </div>
              <MemberGate message="登入查看 Money Line">
                <div>
                  <p className="font-medium text-muted-foreground">ML (勝負盤)</p>
                  <p className="text-lg tabular-nums">
                    {game.odds.awayMoneyLine} / {game.odds.homeMoneyLine}
                  </p>
                </div>
              </MemberGate>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
