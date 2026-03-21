"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_TYPE_LABELS } from "@/lib/constants";
import { AutomationPanel } from "@/components/admin/AutomationPanel";

interface Channel {
  id: number;
  name: string;
  type: string;
  is_active: boolean;
}

interface Stats {
  raw_articles_total: number;
  today_raw: number;
  today_generated: number;
  draft: number;
  published: number;
  today_published: number;
  scheduled: number;
  total_views: number;
  personas: { id: string; name: string; is_active: boolean }[];
  channels: Channel[];
}

interface CrawlerStatus {
  source: string;
  count: number;
  lastCrawled: string;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  return `${days} 天前`;
}

function getStatusIndicator(dateStr: string): { color: string; label: string } {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = diff / 3600000;

  if (hours < 24) return { color: "bg-green-500", label: "正常" };
  if (hours < 48) return { color: "bg-yellow-500", label: "注意" };
  return { color: "bg-red-500", label: "異常" };
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<Stats>({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
  });

  const { data: crawlerStatus } = useQuery<CrawlerStatus[]>({
    queryKey: ["crawler-status"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/crawler-status");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12 text-red-500">
        無法載入統計資料，請確認 Supabase 連線設定
      </div>
    );
  }

  const cards = [
    { title: "原始新聞總數", value: stats.raw_articles_total, color: "text-blue-600" },
    { title: "今日爬取", value: stats.today_raw, color: "text-cyan-600" },
    { title: "今日產出", value: stats.today_generated, color: "text-purple-600" },
    { title: "未發布", value: stats.draft, color: "text-yellow-600" },
    { title: "已發布", value: stats.published, color: "text-emerald-600" },
    { title: "今日發布", value: stats.today_published, color: "text-indigo-600" },
    { title: "排程中", value: stats.scheduled, color: "text-orange-600" },
    { title: "總瀏覽數", value: stats.total_views.toLocaleString(), color: "text-pink-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">儀表板</h1>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 爬蟲狀態 */}
      {crawlerStatus && crawlerStatus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🕷️</span>
              爬蟲狀態
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">來源</th>
                    <th className="pb-2 font-medium text-right">文章數</th>
                    <th className="pb-2 font-medium text-right">最後爬取</th>
                    <th className="pb-2 font-medium text-center w-10">狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlerStatus.map((crawler) => {
                    const status = getStatusIndicator(crawler.lastCrawled);
                    return (
                      <tr key={crawler.source} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{crawler.source}</td>
                        <td className="py-2.5 text-right tabular-nums">
                          {crawler.count.toLocaleString()}
                        </td>
                        <td className="py-2.5 text-right text-gray-500">
                          {getRelativeTime(crawler.lastCrawled)}
                        </td>
                        <td className="py-2.5 text-center">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${status.color}`}
                            title={status.label}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 自動化設定 */}
      <AutomationPanel />

      <div className="grid md:grid-cols-2 gap-6">
        {/* 寫手列表 */}
        <Card>
          <CardHeader>
            <CardTitle>寫手陣容</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {stats.personas.map((persona) => (
                <div
                  key={persona.id}
                  className="flex items-center gap-3 p-3 rounded-lg border"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      persona.is_active ? "bg-green-500" : "bg-gray-300"
                    }`}
                  />
                  <div>
                    <div className="font-medium text-sm">{persona.name}</div>
                    <div className="text-xs text-gray-500">
                      {persona.is_active ? "啟用中" : "已停用"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 發布頻道 */}
        <Card>
          <CardHeader>
            <CardTitle>
              發布頻道
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({stats.channels.length} 個啟用中)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.channels.length === 0 ? (
              <p className="text-sm text-gray-400">尚未設定發布頻道</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {stats.channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="font-medium text-sm">{ch.name}</div>
                    <Badge variant="outline">
                      {CHANNEL_TYPE_LABELS[ch.type] || ch.type}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
