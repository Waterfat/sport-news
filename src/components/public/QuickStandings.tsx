"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getTeamNameZh } from "@/lib/constants";

interface StandingsEntry {
  teamName: string;
  abbreviation: string;
  logo: string;
  stats: Record<string, string>;
}

interface StandingsGroup {
  name: string;
  entries: StandingsEntry[];
}

export function QuickStandings() {
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["standings", "nba"],
    queryFn: async () => {
      const res = await fetch("/api/public/standings?league=nba");
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      const groups: StandingsGroup[] = d.standings ?? [];
      const all = groups.flatMap((g) => g.entries);
      all.sort((a, b) => {
        const aWins = parseInt(a.stats?.wins ?? "0", 10) || 0;
        const bWins = parseInt(b.stats?.wins ?? "0", 10) || 0;
        return bWins - aWins;
      });
      return all.slice(0, 5);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
        <h3 className="font-serif text-[15px] font-bold text-card-foreground">NBA 排名</h3>
        <Link href="/standings/nba" className="text-xs text-brand hover:underline">
          完整排名
        </Link>
      </div>
      <div className="p-4">
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-muted animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">暫無排名資料</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1.5 font-medium">#</th>
              <th className="text-left py-1.5 font-medium">球隊</th>
              <th className="text-center py-1.5 font-medium">勝</th>
              <th className="text-center py-1.5 font-medium">負</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.abbreviation} className={`border-b border-border/50 last:border-0 ${i < 3 ? "font-semibold" : ""}`}>
                <td className={`py-1.5 tabular-nums ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground"} font-medium`}>
                  {i + 1}
                </td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    {entry.logo && (
                      <img src={entry.logo} alt="" className="w-4 h-4" />
                    )}
                    <span className="font-medium text-card-foreground truncate">
                      {getTeamNameZh(entry.teamName)}
                    </span>
                  </div>
                </td>
                <td className="text-center text-card-foreground font-medium tabular-nums">{entry.stats?.wins ?? "-"}</td>
                <td className="text-center text-card-foreground font-medium tabular-nums">{entry.stats?.losses ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </div>
  );
}
