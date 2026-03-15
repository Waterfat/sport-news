"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const LEAGUE_OPTIONS = [
  { value: "nba", label: "NBA" },
  { value: "mlb", label: "MLB" },
  { value: "nfl", label: "NFL" },
];

export function StandingsClient({
  defaultLeague = "nba",
}: {
  defaultLeague?: string;
}) {
  const [league, setLeague] = useState(defaultLeague);
  const [groups, setGroups] = useState<StandingsGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/public/standings?league=${league}`)
      .then((r) => r.json())
      .then((d) => setGroups(d.standings ?? []))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [league]);

  // NBA/MLB 常見 stat keys
  const statKeys =
    league === "nba"
      ? ["wins", "losses", "winPercent", "gamesBehind", "streak"]
      : league === "mlb"
        ? ["wins", "losses", "winPercent", "gamesBehind"]
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
  };

  return (
    <div className="space-y-4">
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
            ) : groups.length === 0 ? (
              <p className="text-slate-500 text-center py-8">暫無排名數據</p>
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
                            <tr className="border-b bg-slate-50">
                              <th className="text-left py-2 px-3 font-medium text-slate-600">
                                球隊
                              </th>
                              {statKeys.map((key) => (
                                <th
                                  key={key}
                                  className="text-center py-2 px-2 font-medium text-slate-600"
                                >
                                  {statLabels[key] ?? key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {group.entries.map((entry, idx) => (
                              <tr
                                key={entry.teamId}
                                className={
                                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                                }
                              >
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    {entry.logo && (
                                      <img
                                        src={entry.logo}
                                        alt=""
                                        className="w-5 h-5"
                                      />
                                    )}
                                    <span className="font-medium">
                                      {entry.teamName}
                                    </span>
                                  </div>
                                </td>
                                {statKeys.map((key) => (
                                  <td
                                    key={key}
                                    className="text-center py-2 px-2 text-slate-600"
                                  >
                                    {entry.stats[key] ?? "-"}
                                  </td>
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
        ))}
      </Tabs>
    </div>
  );
}
