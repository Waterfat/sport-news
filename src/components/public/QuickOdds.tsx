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
        // Prefer scheduled or in-progress games
        const upcoming = allGames.filter((g) => g.status !== "final");
        const display = upcoming.length > 0 ? upcoming.slice(0, 3) : allGames.slice(0, 3);
        setGames(display);
      })
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">今日賽事</h3>
        <Link href="/odds" className="text-xs text-blue-600 hover:underline">
          查看更多賠率
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 rounded bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">今日無賽事</p>
      ) : (
        <div className="space-y-2">
          {games.map((game) => {
            const isLive = game.status === "in_progress";
            const isFinal = game.status === "final";

            return (
              <Link
                key={game.id}
                href={`/game/nba/${game.id}`}
                className="block rounded-lg border border-slate-100 p-2.5 hover:border-blue-200 hover:bg-blue-50/30 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  {isLive ? (
                    <span className="text-red-600 font-semibold text-[10px]">LIVE</span>
                  ) : isFinal ? (
                    <span className="text-slate-400 text-[10px]">終場</span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">
                      {new Date(game.date).toLocaleTimeString("zh-TW", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                  {game.odds && (
                    <span className="text-[10px] text-slate-400">
                      O/U {game.odds.overUnder}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    {game.awayTeam.logo && (
                      <img src={game.awayTeam.logo} alt="" className="w-3.5 h-3.5" />
                    )}
                    <span className="text-slate-700">{game.awayTeam.abbreviation}</span>
                  </div>
                  <span className={`font-bold tabular-nums ${isLive ? "text-red-600" : "text-slate-900"}`}>
                    {game.awayTeam.score}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs mt-0.5">
                  <div className="flex items-center gap-1.5">
                    {game.homeTeam.logo && (
                      <img src={game.homeTeam.logo} alt="" className="w-3.5 h-3.5" />
                    )}
                    <span className="text-slate-700">{game.homeTeam.abbreviation}</span>
                  </div>
                  <span className={`font-bold tabular-nums ${isLive ? "text-red-600" : "text-slate-900"}`}>
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
