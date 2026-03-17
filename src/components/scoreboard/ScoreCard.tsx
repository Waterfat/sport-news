"use client";

import Link from "next/link";
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
      <span className={`text-sm flex-1 min-w-0 truncate ${isWinner ? "font-semibold text-slate-900" : "text-slate-600"}`}>
        {team.name}
      </span>
      <span className={`text-lg tabular-nums ${isWinner ? "font-bold text-slate-900" : "text-slate-600"}`}>
        {team.score}
      </span>
    </div>
  );
}

export default function ScoreCard({ game, league }: { game: Game; league?: string }) {
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

  const content = (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ${borderClass} ${league ? "hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer" : ""}`}>
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

      {/* Linescores */}
      {isFinishedOrLive && game.homeTeam.linescores && game.awayTeam.linescores && (
        <div className="px-4 pb-2">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left font-normal py-0.5 w-10"></th>
                {game.homeTeam.linescores.map((ls) => (
                  <th key={ls.period} className="text-center font-normal py-0.5 w-7">
                    {ls.period}
                  </th>
                ))}
                <th className="text-center font-medium py-0.5 w-7 text-slate-600">T</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-600">
                <td className="text-left font-medium py-0.5">{game.awayTeam.abbreviation}</td>
                {game.awayTeam.linescores.map((ls) => (
                  <td key={ls.period} className="text-center py-0.5">{ls.value}</td>
                ))}
                <td className={`text-center py-0.5 font-medium ${awayWins ? "text-slate-900" : ""}`}>{game.awayTeam.score}</td>
              </tr>
              <tr className="text-slate-600">
                <td className="text-left font-medium py-0.5">{game.homeTeam.abbreviation}</td>
                {game.homeTeam.linescores.map((ls) => (
                  <td key={ls.period} className="text-center py-0.5">{ls.value}</td>
                ))}
                <td className={`text-center py-0.5 font-medium ${homeWins ? "text-slate-900" : ""}`}>{game.homeTeam.score}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Records */}
      {(game.homeTeam.record || game.awayTeam.record) && (
        <div className="px-4 pb-3 text-xs text-slate-400 text-center">
          ({game.awayTeam.record}) vs ({game.homeTeam.record})
        </div>
      )}
    </div>
  );

  if (league) {
    return (
      <Link href={`/game/${league}/${game.id}`}>
        {content}
      </Link>
    );
  }

  return content;
}
