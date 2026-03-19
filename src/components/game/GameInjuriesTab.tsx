import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeamInjuriesData } from "@/types/game";

interface GameInjuriesTabProps {
  injuries: TeamInjuriesData[];
}

export function GameInjuriesTab({ injuries }: GameInjuriesTabProps) {
  if (injuries.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          暫無傷兵資料
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}
