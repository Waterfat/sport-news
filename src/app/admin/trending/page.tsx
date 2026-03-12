"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TrendingKeyword {
  keyword: string;
  count: number;
}

interface TrendingResult {
  keywords: TrendingKeyword[];
  players: TrendingKeyword[];
  events: TrendingKeyword[];
  categoryStats: { category: string; count: number }[];
  totalArticles: number;
  analysisTimeRange: { from: string; to: string };
}

export default function TrendingPage() {
  const [data, setData] = useState<TrendingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/trending")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch trending data");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500">
        載入失敗：{error}
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-12 text-gray-500">無資料</div>;
  }

  const maxKeywordCount = data.keywords.length > 0 ? data.keywords[0].count : 1;

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold">趨勢分析</h1>
        <p className="text-gray-500 text-sm mt-1">
          分析近 24 小時內的 {data.totalArticles} 篇原始新聞
          <span className="ml-2 text-xs text-gray-400">
            ({formatTime(data.analysisTimeRange.from)} ~{" "}
            {formatTime(data.analysisTimeRange.to)})
          </span>
        </p>
      </div>

      {/* 分類統計 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">分類統計</CardTitle>
        </CardHeader>
        <CardContent>
          {data.categoryStats.length === 0 ? (
            <p className="text-gray-400 text-sm">暫無資料</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {data.categoryStats.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center gap-2 bg-gray-50 border rounded-lg px-4 py-3"
                >
                  <span className="font-medium">{cat.category}</span>
                  <Badge variant="secondary" className="text-sm">
                    {cat.count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 兩欄排版：球員 + 賽事 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 熱門球員 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">熱門球員排行</CardTitle>
          </CardHeader>
          <CardContent>
            {data.players.length === 0 ? (
              <p className="text-gray-400 text-sm">暫無資料</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">排名</TableHead>
                    <TableHead>球員</TableHead>
                    <TableHead className="text-right w-24">出現次數</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.players.slice(0, 15).map((player, index) => (
                    <TableRow key={player.keyword}>
                      <TableCell>
                        <RankBadge rank={index + 1} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {player.keyword}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{player.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* 熱門賽事 / 事件 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">熱門賽事 / 事件排行</CardTitle>
          </CardHeader>
          <CardContent>
            {data.events.length === 0 ? (
              <p className="text-gray-400 text-sm">暫無資料</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">排名</TableHead>
                    <TableHead>賽事 / 事件</TableHead>
                    <TableHead className="text-right w-24">出現次數</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.slice(0, 15).map((event, index) => (
                    <TableRow key={event.keyword}>
                      <TableCell>
                        <RankBadge rank={index + 1} />
                      </TableCell>
                      <TableCell className="font-medium">
                        {event.keyword}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">{event.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 熱門關鍵字雲（列表形式） */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">熱門關鍵字</CardTitle>
        </CardHeader>
        <CardContent>
          {data.keywords.length === 0 ? (
            <p className="text-gray-400 text-sm">暫無資料</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.keywords.map((kw) => {
                const ratio = kw.count / maxKeywordCount;
                const sizeClass = getSizeClass(ratio);
                const colorClass = getColorClass(ratio);
                return (
                  <span
                    key={kw.keyword}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full border ${colorClass} ${sizeClass} transition-colors`}
                    title={`出現 ${kw.count} 次`}
                  >
                    {kw.keyword}
                    <span className="text-xs opacity-70">({kw.count})</span>
                  </span>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper components & functions
// ---------------------------------------------------------------------------

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-800 text-xs font-bold">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 text-gray-700 text-xs font-bold">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
        3
      </span>
    );
  }
  return <span className="text-sm text-gray-500 pl-1.5">{rank}</span>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSizeClass(ratio: number): string {
  if (ratio > 0.8) return "text-lg font-bold";
  if (ratio > 0.5) return "text-base font-semibold";
  if (ratio > 0.3) return "text-sm font-medium";
  return "text-xs";
}

function getColorClass(ratio: number): string {
  if (ratio > 0.8) return "bg-blue-100 text-blue-800 border-blue-200";
  if (ratio > 0.5) return "bg-indigo-50 text-indigo-700 border-indigo-200";
  if (ratio > 0.3) return "bg-gray-100 text-gray-700 border-gray-200";
  return "bg-gray-50 text-gray-500 border-gray-100";
}
