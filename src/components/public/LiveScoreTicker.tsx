"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SCOREBOARD_POLLING_MS } from "@/lib/constants";
import type { Game } from "@/lib/scoreboard";

interface League {
  key: string;
  label: string;
}

function TickerGameCard({ game, league }: { game: Game; league: string }) {
  const isLive = game.status === "in_progress";
  const isFinal = game.status === "final";

  return (
    <Link
      href={`/game/${league}/${game.id}`}
      className="flex-shrink-0 w-[150px] rounded-lg border border-slate-200 bg-white p-2.5 hover:border-blue-300 hover:shadow-sm active:scale-[0.97] transition-all duration-150"
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-1.5">
        {isLive ? (
          <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded animate-pulse">
            LIVE
          </span>
        ) : isFinal ? (
          <span className="text-[10px] font-medium text-slate-500">
            終場
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">
            {new Date(game.date).toLocaleTimeString("zh-TW", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {game.awayTeam.logo && (
            <img src={game.awayTeam.logo} alt="" className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate font-medium text-slate-700">
            {game.awayTeam.abbreviation}
          </span>
        </div>
        <span className={`font-bold tabular-nums ${isLive ? "text-red-600" : "text-slate-900"}`}>
          {game.awayTeam.score}
        </span>
      </div>

      {/* Home team */}
      <div className="flex items-center justify-between gap-1 text-xs mt-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {game.homeTeam.logo && (
            <img src={game.homeTeam.logo} alt="" className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate font-medium text-slate-700">
            {game.homeTeam.abbreviation}
          </span>
        </div>
        <span className={`font-bold tabular-nums ${isLive ? "text-red-600" : "text-slate-900"}`}>
          {game.homeTeam.score}
        </span>
      </div>
    </Link>
  );
}

export function LiveScoreTicker({ leagues }: { leagues: League[] }) {
  const [games, setGames] = useState<{ game: Game; league: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAllGames = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const results = await Promise.allSettled(
        leagues.map(async (l) => {
          const res = await fetch(`/api/public/scoreboard?league=${l.key}`);
          if (!res.ok) return [];
          const json = await res.json();
          return (json.games as Game[]).map((g) => ({ game: g, league: l.key }));
        })
      );

      const allGames = results
        .filter((r): r is PromiseFulfilledResult<{ game: Game; league: string }[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);

      // Sort: in_progress first, then scheduled, then final
      const statusOrder: Record<string, number> = { in_progress: 0, scheduled: 1, final: 2 };
      allGames.sort((a, b) => (statusOrder[a.game.status] ?? 2) - (statusOrder[b.game.status] ?? 2));

      setGames(allGames);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [leagues]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    fetchAllGames(true);
    intervalRef.current = setInterval(() => fetchAllGames(), SCOREBOARD_POLLING_MS);
  }, [fetchAllGames]);

  useEffect(() => {
    if (leagues.length === 0) return;
    startPolling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [leagues, startPolling]);

  // Pause polling when hidden
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        startPolling();
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [startPolling]);

  // Don't render if no games and not loading
  if (!loading && games.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-slate-700">即時比分</span>
        <Link href="/scores" className="text-xs text-blue-600 hover:underline">
          查看全部
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] h-[82px] rounded-lg bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          {games.map(({ game, league }) => (
            <TickerGameCard key={`${league}-${game.id}`} game={game} league={league} />
          ))}
        </div>
      )}
    </section>
  );
}
