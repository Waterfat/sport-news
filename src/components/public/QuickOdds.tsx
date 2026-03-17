"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Game } from "@/lib/scoreboard";

export function QuickOdds() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/scoreboard?league=nba")
      .then((r) => r.json())
      .then((d) => {
        const allGames: Game[] = d.games ?? [];
        const upcoming = allGames.filter((g) => g.status !== "final");
        const display = upcoming.length > 0 ? upcoming.slice(0, 3) : allGames.slice(0, 3);
        setGames(display);
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-card-foreground">今日賽事</h3>
        <Link href="/odds" className="text-xs text-brand hover:underline">
          查看更多賠率
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">今日無賽事</p>
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const isLive = game.status === "in_progress";
            const isFinal = game.status === "final";

            return (
              <Link
                key={game.id}
                href={`/game/nba/${game.id}`}
                className={`block rounded-lg border p-2.5 hover:shadow-md transition-all duration-200 ${
                  isLive
                    ? "border-live/30 bg-live-muted/30 hover:border-live/50"
                    : "border-border hover:border-brand/30 hover:bg-accent"
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  {isLive ? (
                    <span className="flex items-center gap-1 text-live font-bold text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-live animate-live-blink" />
                      LIVE
                    </span>
                  ) : isFinal ? (
                    <span className="text-muted-foreground text-[10px]">終場</span>
                  ) : (
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(game.date).toLocaleTimeString("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {game.odds && (
                    <span className="text-[10px] text-muted-foreground">
                      O/U {game.odds.overUnder}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {game.awayTeam.logo && (
                      <img src={game.awayTeam.logo} alt="" className="w-3.5 h-3.5" />
                    )}
                    <span className="text-card-foreground">{game.awayTeam.abbreviation}</span>
                  </div>
                  <span className={`font-bold tabular-nums ${isLive ? "text-live" : "text-card-foreground"}`}>
                    {game.awayTeam.score}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-0.5">
                  <div className="flex items-center gap-1.5">
                    {game.homeTeam.logo && (
                      <img src={game.homeTeam.logo} alt="" className="w-3.5 h-3.5" />
                    )}
                    <span className="text-card-foreground">{game.homeTeam.abbreviation}</span>
                  </div>
                  <span className={`font-bold tabular-nums ${isLive ? "text-live" : "text-card-foreground"}`}>
                    {game.homeTeam.score}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
