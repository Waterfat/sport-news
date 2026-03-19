"use client";

import { useQueryState, parseAsString } from "nuqs";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { teamUrl } from "@/lib/routes";
import { useGameDetail } from "@/hooks/useGameDetail";
import { GameSummaryTab } from "./GameSummaryTab";
import { GameBoxScoreTab } from "./GameBoxScoreTab";
import { GamePlayByPlayTab } from "./GamePlayByPlayTab";
import { GameOddsTab } from "./GameOddsTab";
import { GameInjuriesTab } from "./GameInjuriesTab";

export function GameDetailClient({
  sport,
  eventId,
}: {
  sport: string;
  eventId: string;
}) {
  const [tab, setTab] = useQueryState("tab", parseAsString.withDefault("summary"));

  const {
    game,
    isLoading,
    isMember,
    leaders,
    winProb,
    seasonSeries,
    pickCenter,
    plays,
    totalPlays,
    boxScore,
    injuries,
  } = useGameDetail(sport, eventId, tab);

  if (isLoading) {
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
            <Link href={teamUrl(sport, game.awayTeam.id)} className="text-center hover:opacity-80">
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
            <Link href={teamUrl(sport, game.homeTeam.id)} className="text-center hover:opacity-80">
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

        <TabsContent value="summary">
          <GameSummaryTab
            game={game}
            leaders={leaders}
            winProb={winProb}
            seasonSeries={seasonSeries}
            pickCenter={pickCenter}
          />
        </TabsContent>

        <TabsContent value="boxscore">
          <GameBoxScoreTab boxScore={boxScore} />
        </TabsContent>

        <TabsContent value="pbp">
          <GamePlayByPlayTab plays={plays} totalPlays={totalPlays} isMember={isMember} />
        </TabsContent>

        <TabsContent value="odds">
          <GameOddsTab odds={game.odds} />
        </TabsContent>

        <TabsContent value="injuries">
          <GameInjuriesTab injuries={injuries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
