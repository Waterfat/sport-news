import { Card, CardContent } from "@/components/ui/card";
import { MemberGate } from "@/components/auth/MemberGate";
import type { Play } from "@/types/game";

interface GamePlayByPlayTabProps {
  plays: Play[];
  totalPlays: number;
  isMember: boolean;
}

export function GamePlayByPlayTab({ plays, totalPlays, isMember }: GamePlayByPlayTabProps) {
  if (plays.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          暫無逐球紀錄
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}
