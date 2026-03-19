"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { SCOREBOARD_POLLING_MS } from "@/lib/constants";
import type { Game } from "@/lib/scoreboard";
import { gameUrl } from "@/lib/routes";

interface League {
  key: string;
  label: string;
}

function TickerGameCard({ game, league }: { game: Game; league: string }) {
  const isLive = game.status === "in_progress";
  const isFinal = game.status === "final";

  return (
    <Link
      href={gameUrl(league, game.id)}
      className={`flex-shrink-0 w-[150px] rounded-xl border bg-card p-2.5 hover:shadow-lg hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 ${
        isLive ? "border-live/40 ring-1 ring-live/20" : "border-border hover:border-brand/40"
      }`}
    >
      {/* Status badge */}
      <div className="flex items-center justify-between mb-1.5">
        {isLive ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-live">
            <span className="w-1.5 h-1.5 rounded-full bg-live animate-live-blink" />
            LIVE
          </span>
        ) : isFinal ? (
          <span className="text-[10px] font-medium text-muted-foreground">
            終場
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">
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
          <span className="truncate font-medium text-foreground">
            {game.awayTeam.abbreviation}
          </span>
        </div>
        <span className={`font-bold tabular-nums ${isLive ? "text-live" : "text-foreground"}`}>
          {game.awayTeam.score}
        </span>
      </div>

      {/* Home team */}
      <div className="flex items-center justify-between gap-1 text-xs mt-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {game.homeTeam.logo && (
            <img src={game.homeTeam.logo} alt="" className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="truncate font-medium text-foreground">
            {game.homeTeam.abbreviation}
          </span>
        </div>
        <span className={`font-bold tabular-nums ${isLive ? "text-live" : "text-foreground"}`}>
          {game.homeTeam.score}
        </span>
      </div>
    </Link>
  );
}

export function LiveScoreTicker({ leagues }: { leagues: League[] }) {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["live-ticker", leagues.map((l) => l.key)],
    queryFn: async () => {
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

      return allGames;
    },
    enabled: leagues.length > 0,
    refetchInterval: SCOREBOARD_POLLING_MS,
  });

  // Don't render if no games and not loading
  if (!isLoading && games.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-foreground">即時比分</span>
        <Link href="/scores" className="text-xs text-brand hover:underline">
          查看全部
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[150px] h-[82px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {games.map(({ game, league }) => (
              <TickerGameCard key={`${league}-${game.id}`} game={game} league={league} />
            ))}
          </div>
          {/* 右側漸層遮罩提示可滾動 */}
          <div className="absolute top-0 right-0 bottom-1 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
        </div>
      )}
    </section>
  );
}
