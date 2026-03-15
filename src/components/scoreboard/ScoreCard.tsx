"use client";

import type { Game, TeamInfo } from "@/lib/scoreboard";

function formatTaiwanTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleTimeString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function StatusBadge({ game }: { game: Game }) {
  if (game.status === "in_progress") {
    return (
      <div className="flex items-center gap-1.5 text-sm font-medium text-red-600">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        進行中 · {game.statusDetail}
      </div>
    );
  }
  if (game.status === "final") {
    return (
      <div className="text-sm font-medium text-slate-500">
        已結束
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
      <span className="w-2 h-2 rounded-full bg-blue-500" />
      {formatTaiwanTime(game.date)}
    </div>
  );
}

function TeamRow({ team, isWinner }: { team: TeamInfo; isWinner: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={team.logo}
        alt={team.name}
        className="w-6 h-6 object-contain"
        loading="lazy"
      />
      <span className="text-sm font-medium text-slate-700 w-10">{team.abbreviation}</span>
      <span className={`text-sm flex-1 ${isWinner ? "font-semibold text-slate-900" : "text-slate-600"}`}>
        {team.name}
      </span>
      <span className={`text-lg tabular-nums ${isWinner ? "font-bold text-slate-900" : "text-slate-600"}`}>
        {team.score}
      </span>
    </div>
  );
}

export default function ScoreCard({ game }: { game: Game }) {
  const homeScore = parseInt(game.homeTeam.score) || 0;
  const awayScore = parseInt(game.awayTeam.score) || 0;
  const isFinishedOrLive = game.status !== "scheduled";
  const homeWins = isFinishedOrLive && homeScore > awayScore;
  const awayWins = isFinishedOrLive && awayScore > homeScore;

  const borderClass =
    game.status === "in_progress"
      ? "border-l-4 border-l-red-500"
      : game.status === "final"
        ? "border-l-4 border-l-slate-300"
        : "border-l-4 border-l-blue-400";

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${borderClass}`}>
      {/* Status */}
      <div className="px-4 pt-3 pb-2">
        <StatusBadge game={game} />
      </div>

      {/* Teams */}
      <div className="px-4 pb-2">
        <TeamRow team={game.awayTeam} isWinner={awayWins} />
        <div className="border-t border-slate-100" />
        <TeamRow team={game.homeTeam} isWinner={homeWins} />
      </div>

      {/* Records */}
      {(game.homeTeam.record || game.awayTeam.record) && (
        <div className="px-4 pb-3 text-xs text-slate-400 text-center">
          ({game.awayTeam.record}) vs ({game.homeTeam.record})
        </div>
      )}
    </div>
  );
}
