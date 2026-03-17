"use client";

import { useEffect, useState } from "react";
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
  const [entries, setEntries] = useState<StandingsEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/standings?league=nba")
      .then((r) => r.json())
      .then((d) => {
        const groups: StandingsGroup[] = d.standings ?? [];
        // Flatten all entries, sort by wins desc, take top 5
        const all = groups.flatMap((g) => g.entries);
        all.sort((a, b) => {
          const aWins = parseInt(a.stats.wins ?? "0", 10);
          const bWins = parseInt(b.stats.wins ?? "0", 10);
          return bWins - aWins;
        });
        setEntries(all.slice(0, 5));
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-900">NBA 排名</h3>
        <Link href="/standings" className="text-xs text-blue-600 hover:underline">
          完整排名
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 rounded bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">暫無排名資料</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 border-b border-slate-100">
              <th className="text-left py-1.5 font-medium">#</th>
              <th className="text-left py-1.5 font-medium">球隊</th>
              <th className="text-center py-1.5 font-medium">勝</th>
              <th className="text-center py-1.5 font-medium">負</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={entry.abbreviation} className="border-b border-slate-50 last:border-0">
                <td className="py-1.5 text-slate-400 font-medium">{i + 1}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    {entry.logo && (
                      <img src={entry.logo} alt="" className="w-4 h-4" />
                    )}
                    <span className="font-medium text-slate-700 truncate">
                      {getTeamNameZh(entry.teamName)}
                    </span>
                  </div>
                </td>
                <td className="text-center text-slate-700 font-medium">{entry.stats.wins ?? "-"}</td>
                <td className="text-center text-slate-700 font-medium">{entry.stats.losses ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
