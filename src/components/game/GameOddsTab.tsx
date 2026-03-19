import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MemberGate } from "@/components/auth/MemberGate";
import type { GameOdds } from "@/types/game";

interface GameOddsTabProps {
  odds?: GameOdds;
}

export function GameOddsTab({ odds }: GameOddsTabProps) {
  if (!odds) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          暫無賠率資料
        </CardContent>
      </Card>
    );
  }

  return (
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
              <td className="py-2 px-3 text-muted-foreground">Spread (讓分)</td>
              <td className="text-center py-2 px-3 tabular-nums">{odds.details}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-3 text-muted-foreground">O/U (大小分)</td>
              <td className="text-center py-2 px-3 tabular-nums">{odds.overUnder}</td>
            </tr>
          </tbody>
        </table>
        <MemberGate message="登入查看完整 Money Line 賠率">
          <table className="w-full text-sm mt-4">
            <thead>
              <tr className="border-b bg-muted">
                <th className="text-left py-2 px-3 text-muted-foreground">ML (勝負盤)</th>
                <th className="text-center py-2 px-3 text-muted-foreground">客隊</th>
                <th className="text-center py-2 px-3 text-muted-foreground">主隊</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 px-3 text-muted-foreground">Close</td>
                <td className="text-center py-2 px-3 font-medium tabular-nums">
                  {odds.awayMoneyLine}
                </td>
                <td className="text-center py-2 px-3 font-medium tabular-nums">
                  {odds.homeMoneyLine}
                </td>
              </tr>
            </tbody>
          </table>
        </MemberGate>
      </CardContent>
    </Card>
  );
}
