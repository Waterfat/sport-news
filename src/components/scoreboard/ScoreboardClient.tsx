"use client";

import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsString } from "nuqs";
import ScoreCard from "./ScoreCard";
import ScoreCardSkeleton from "./ScoreCardSkeleton";
import DatePicker, { getTodayStr } from "./DatePicker";
import { SCOREBOARD_POLLING_MS } from "@/lib/constants";
import type { Game } from "@/lib/scoreboard";

interface League {
  key: string;
  label: string;
}

interface ScoreboardData {
  league: string;
  label: string;
  games: Game[];
}

export default function ScoreboardClient({
  initialLeagues,
}: {
  initialLeagues: League[];
}) {
  const [activeLeague, setActiveLeague] = useQueryState(
    "league",
    parseAsString.withDefault(initialLeagues[0]?.key ?? "")
  );
  const [selectedDate, setSelectedDate] = useQueryState(
    "date",
    parseAsString.withDefault(getTodayStr())
  );

  const isToday = selectedDate === getTodayStr();

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ["scoreboard", activeLeague, selectedDate],
    queryFn: async () => {
      if (!activeLeague) return null;
      const dateParam = selectedDate === getTodayStr() ? "" : `&date=${selectedDate}`;
      const res = await fetch(
        `/api/public/scoreboard?league=${activeLeague}${dateParam}`
      );
      if (!res.ok) throw new Error("fetch failed");
      return (await res.json()) as ScoreboardData;
    },
    enabled: !!activeLeague,
    refetchInterval: isToday ? SCOREBOARD_POLLING_MS : false,
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("zh-TW", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  if (initialLeagues.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🏟️</div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          即時比分功能即將上線
        </h2>
        <p className="text-muted-foreground">敬請期待</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground truncate min-w-0">
          {isToday ? "即時比分" : "歷史比分"}
        </h1>
        <div className="flex items-center gap-3 flex-shrink-0">
          <DatePicker
            currentDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          {!isToday && (
            <button
              onClick={() => setSelectedDate(getTodayStr())}
              className="px-2 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              今天
            </button>
          )}
          {lastUpdated && isToday && (
            <span className="text-xs text-muted-foreground">
              上次更新 {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {initialLeagues.map((league) => (
          <button
            key={league.key}
            onClick={() => setActiveLeague(league.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeLeague === league.key
                ? "bg-brand text-brand-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent"
            }`}
          >
            {league.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScoreCardSkeleton key={i} />
          ))}
        </div>
      ) : !data || !data.games || data.games.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-muted-foreground mb-1">
            {isToday ? "今日暫無比賽" : "該日暫無比賽"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {data?.label ?? ""} 目前沒有進行中或已排定的比賽
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.games.map((game) => (
            <ScoreCard key={game.id} game={game} league={activeLeague} />
          ))}
        </div>
      )}
    </div>
  );
}
