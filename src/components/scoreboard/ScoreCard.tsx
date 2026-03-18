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
      <div className="text-sm font-medium text-muted-foreground">
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
      <span className="text-sm font-medium text-foreground w-10">{team.abbreviation}</span>
      <span className={`text-sm flex-1 min-w-0 truncate ${isWinner ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
        {team.name}
      </span>
      <span className={`text-lg tabular-nums ${isWinner ? "font-bold text-foreground" : "text-muted-foreground"}`}>
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
    <div className={`bg-card border border-border rounded-xl shadow-sm overflow-hidden ${borderClass} ${league ? "hover:shadow-md transition-all duration-150 active:scale-[0.98] cursor-pointer" : ""}`}>
      {/* Status */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <StatusBadge game={game} />
        {game.broadcast && (
          <span className="text-xs text-muted-foreground">
            {game.broadcast}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="px-4 pb-2">
        <TeamRow team={game.awayTeam} isWinner={awayWins} />
        <div className="border-t border-border/50" />
        <TeamRow team={game.homeTeam} isWinner={homeWins} />
      </div>

      {/* Linescores */}
      {isFinishedOrLive && game.homeTeam.linescores && game.awayTeam.linescores && (
        <div className="px-4 pb-2">
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className="text-muted-foreground">
                <th className="text-left font-normal py-0.5 w-10"></th>
                {game.homeTeam.linescores.map((ls) => (
                  <th key={ls.period} className="text-center font-normal py-0.5 w-7">
                    {ls.period}
                  </th>
                ))}
                <th className="text-center font-medium py-0.5 w-7 text-muted-foreground">T</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-muted-foreground">
                <td className="text-left font-medium py-0.5">{game.awayTeam.abbreviation}</td>
                {game.awayTeam.linescores.map((ls) => (
                  <td key={ls.period} className="text-center py-0.5">{ls.value}</td>
                ))}
                <td className={`text-center py-0.5 font-medium ${awayWins ? "text-foreground" : ""}`}>{game.awayTeam.score}</td>
              </tr>
              <tr className="text-muted-foreground">
                <td className="text-left font-medium py-0.5">{game.homeTeam.abbreviation}</td>
                {game.homeTeam.linescores.map((ls) => (
                  <td key={ls.period} className="text-center py-0.5">{ls.value}</td>
                ))}
                <td className={`text-center py-0.5 font-medium ${homeWins ? "text-foreground" : ""}`}>{game.homeTeam.score}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Odds summary */}
      {game.odds && (
        <div className="px-4 pb-2 text-xs text-muted-foreground text-center tabular-nums">
          {game.odds.details} | O/U {game.odds.overUnder}
        </div>
      )}

      {/* Records */}
      {(game.homeTeam.record || game.awayTeam.record) && (
        <div className="px-4 pb-3 text-xs text-muted-foreground text-center">
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
