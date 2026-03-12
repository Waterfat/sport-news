"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CHANNEL_TYPE_LABELS } from "@/lib/constants";

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

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (!stats) {
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
