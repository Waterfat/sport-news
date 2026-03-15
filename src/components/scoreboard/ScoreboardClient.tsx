"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [leagues] = useState<League[]>(initialLeagues);
  const [activeLeague, setActiveLeague] = useState<string>(
    initialLeagues[0]?.key ?? ""
  );
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [data, setData] = useState<ScoreboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isToday = selectedDate === getTodayStr();

  const fetchData = useCallback(
    async (league: string, date: string, showLoading = false) => {
      if (!league) return;
      if (showLoading) setLoading(true);
      try {
        const dateParam = date === getTodayStr() ? "" : `&date=${date}`;
        const res = await fetch(
          `/api/public/scoreboard?league=${league}${dateParam}`
        );
        if (res.ok) {
          const json: ScoreboardData = await res.json();
          setData(json);
          setLastUpdated(
            new Date().toLocaleTimeString("zh-TW", {
              hour: "2-digit",
              minute: "2-digit",
            })
          );
        }
      } catch (err) {
        console.error("Scoreboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Start/reset polling (only for today)
  const startPolling = useCallback(
    (league: string, date: string) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      fetchData(league, date, true);
      // Only poll for today's games
      if (date === getTodayStr()) {
        intervalRef.current = setInterval(
          () => fetchData(league, date),
          SCOREBOARD_POLLING_MS
        );
      }
    },
    [fetchData]
  );

  // Tab / date switch
  useEffect(() => {
    if (activeLeague) startPolling(activeLeague, selectedDate);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeLeague, selectedDate, startPolling]);

  // Visibility API: pause when hidden, resume when visible
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        startPolling(activeLeague, selectedDate);
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [activeLeague, selectedDate, startPolling]);

  if (leagues.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🏟️</div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">
          即時比分功能即將上線
        </h2>
        <p className="text-slate-500">敬請期待</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">
          {isToday ? "即時比分" : "歷史比分"}
        </h1>
        <div className="flex items-center gap-3">
          <DatePicker
            currentDate={selectedDate}
            onDateChange={setSelectedDate}
          />
          {lastUpdated && isToday && (
            <span className="text-xs text-slate-400">
              上次更新 {lastUpdated}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {leagues.map((league) => (
          <button
            key={league.key}
            onClick={() => setActiveLeague(league.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              activeLeague === league.key
                ? "bg-blue-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {league.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ScoreCardSkeleton key={i} />
          ))}
        </div>
      ) : !data || data.games.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-medium text-slate-600 mb-1">
            {isToday ? "今日暫無比賽" : "該日暫無比賽"}
          </h3>
          <p className="text-sm text-slate-400">
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
