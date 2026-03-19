"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsString } from "nuqs";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { teamUrl } from "@/lib/routes";
import { LEAGUE_OPTIONS } from "@/lib/constants";

interface StandingsEntry {
  teamId: string;
  teamName: string;
  abbreviation: string;
  logo: string;
  stats: Record<string, string>;
}

interface StandingsGroup {
  name: string;
  entries: StandingsEntry[];
}

export function StandingsClient({
  defaultLeague = "nba",
}: {
  defaultLeague?: string;
}) {
  const [league, setLeague] = useQueryState(
    "league",
    parseAsString.withDefault(defaultLeague)
  );

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["standings", league],
    queryFn: async () => {
      const res = await fetch(`/api/public/standings?league=${league}`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.standings ?? []) as StandingsGroup[];
    },
  });

  // NBA/MLB 常見 stat keys
  const statKeys =
    league === "nba"
      ? ["wins", "losses", "winPercent", "gamesBehind", "Home", "Away", "L10", "streak", "PPG", "OPP PPG", "DIFF"]
      : league === "mlb"
        ? ["wins", "losses", "winPercent", "gamesBehind", "Home", "Away", "L10", "RS", "RA", "DIFF"]
        : ["wins", "losses", "ties", "pointsFor", "pointsAgainst"];

  const statLabels: Record<string, string> = {
    wins: "勝",
    losses: "負",
    ties: "平",
    winPercent: "勝率",
    gamesBehind: "勝差",
    streak: "連續",
    pointsFor: "得分",
    pointsAgainst: "失分",
    Home: "主場",
    Away: "客場",
    L10: "近10場",
    OTL: "加時負",
    PPG: "場均得分",
    "OPP PPG": "場均失分",
    DIFF: "分差",
    RS: "得分",
    RA: "失分",
  };

  /** Get background style for winPercent cell based on value */
  function getWinPercentStyle(value: string | undefined): React.CSSProperties | undefined {
    if (!value) return undefined;
    const num = parseFloat(value);
    if (isNaN(num)) return undefined;
    const intensity = Math.round(num * 100);
    const alpha = Math.min(0.25, num * 0.3);
    if (intensity > 50) {
      return { backgroundColor: `rgba(34, 197, 94, ${alpha})` };
    }
    if (intensity < 40) {
      return { backgroundColor: `rgba(239, 68, 68, ${alpha * 0.6})` };
    }
    return undefined;
  }

  /** Rank badge for top 3 */
  function getRankBadge(idx: number): React.ReactNode {
    if (idx === 0) return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400 text-yellow-900 text-xs font-bold">1</span>;
    if (idx === 1) return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-300 text-slate-700 text-xs font-bold">2</span>;
    if (idx === 2) return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-600 text-white text-xs font-bold">3</span>;
    return <span className="inline-flex items-center justify-center w-5 h-5 text-xs text-muted-foreground">{idx + 1}</span>;
  }

  return (
    <div className="space-y-4">
      <Tabs value={league} onValueChange={(v) => setLeague(v)}>
        <TabsList>
          {LEAGUE_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.value} value={opt.value}>
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {LEAGUE_OPTIONS.map((opt) => (
          <TabsContent key={opt.value} value={opt.value}>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
              </div>
            ) : groups.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">暫無排名數據</p>
            ) : (
              <div className="space-y-6">
                {groups.map((group) => (
                  <Card key={group.name}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {group.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted">
                              <th className="text-center py-2 px-1.5 font-medium text-muted-foreground w-8">
                                #
                              </th>
                              <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                                球隊
                              </th>
                              {statKeys.map((key) => (
                                <th
                                  key={key}
                                  className="text-center py-2 px-2 font-medium text-muted-foreground"
                                >
                                  {statLabels[key] ?? key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.entries.map((entry, idx) => {
                              const isTop3 = idx < 3;
                              return (
                                <tr
                                  key={entry.teamId}
                                  className={`${
                                    idx % 2 === 0 ? "bg-card" : "bg-muted/50"
                                  } ${isTop3 ? "font-semibold" : ""}`}
                                >
                                  <td className="text-center py-2 px-1.5">
                                    {getRankBadge(idx)}
                                  </td>
                                  <td className="py-2 px-3">
                                    <Link
                                      href={teamUrl(league, entry.teamId)}
                                      className="flex items-center gap-2 hover:text-primary transition-colors"
                                    >
                                      {entry.logo && (
                                        <img
                                          src={entry.logo}
                                          alt=""
                                          className="w-5 h-5"
                                        />
                                      )}
                                      <span className={`${isTop3 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                                        {entry.teamName}
                                      </span>
                                    </Link>
                                  </td>
                                  {statKeys.map((key) => (
                                    <td
                                      key={key}
                                      className="text-center py-2 px-2 text-muted-foreground tabular-nums"
                                      style={key === "winPercent" ? getWinPercentStyle(entry.stats[key]) : undefined}
                                    >
                                      {entry.stats[key] ?? "-"}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
