import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BoxScoreData } from "@/types/game";

interface GameBoxScoreTabProps {
  boxScore: BoxScoreData | null;
}

export function GameBoxScoreTab({ boxScore }: GameBoxScoreTabProps) {
  if (!boxScore) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          暫無數據
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Team Stats Comparison */}
      {boxScore.teams.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">球隊數據對比</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground w-1/4">
                    {boxScore.teams[0].teamName}
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">項目</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground w-1/4">
                    {boxScore.teams[1].teamName}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(boxScore.teams[0].stats ?? []).map((stat, idx) => (
                  <tr key={stat.label} className={idx % 2 === 0 ? "bg-card" : "bg-muted/50"}>
                    <td className="text-center py-1.5 px-2 tabular-nums">{stat.value}</td>
                    <td className="text-center py-1.5 px-2 text-muted-foreground text-xs">{stat.label}</td>
                    <td className="text-center py-1.5 px-2 tabular-nums">
                      {(boxScore.teams[1].stats ?? [])[idx]?.value ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Player Stats */}
      {boxScore.players.map((group) => (
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
                    {(group.labels ?? []).map((label) => (
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
                      <td colSpan={(group.labels ?? []).length + 1} className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/70">
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
                        {(athlete.stats ?? []).map((s, i) => (
                          <td key={i} className="text-center py-1.5 px-1.5 tabular-nums">{s}</td>
                        ))}
                      </tr>
                    ))}
                  {/* Bench */}
                  {group.athletes.filter((a) => !a.starter).length > 0 && (
                    <tr>
                      <td colSpan={(group.labels ?? []).length + 1} className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted/70">
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
                        {(athlete.stats ?? []).map((s, i) => (
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
  );
}
