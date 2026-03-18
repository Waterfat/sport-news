"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Eye, Users, Monitor, Smartphone, Tablet, Globe, ArrowRight } from "lucide-react";

interface VisitorData {
  summary: {
    totalPV: number;
    totalUV: number;
    avgPagesPerVisitor: number;
    todayPV: number;
    todayUV: number;
  };
  dailyTrend: { date: string; pv: number; uv: number }[];
  topPages: { path: string; pv: number; uv: number }[];
  referrerSources: { source: string; count: number }[];
  devices: { device: string; count: number }[];
  recentSessions: {
    sessionId: string;
    pageCount: number;
    firstSeen: string;
    lastPage: string;
    ua: string;
    pages: { path: string; time: string }[];
  }[];
}

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

export default function VisitorsPage() {
  const [data, setData] = useState<VisitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("7d");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/visitors?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">訪客分析</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">訪客分析</h1>
        <p className="text-gray-500">無法載入訪客資料</p>
      </div>
    );
  }

  const { summary, dailyTrend, topPages, referrerSources, devices, recentSessions } = data;
  const maxDailyPV = Math.max(...dailyTrend.map((d) => d.pv), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">訪客分析</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "7d" ? "7 天" : p === "30d" ? "30 天" : "90 天"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Eye className="w-4 h-4" />
              今日 PV
            </div>
            <div className="text-2xl font-bold text-blue-600">{summary.todayPV}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              今日 UV
            </div>
            <div className="text-2xl font-bold text-green-600">{summary.todayUV}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <BarChart3 className="w-4 h-4" />
              總 PV
            </div>
            <div className="text-2xl font-bold">{summary.totalPV.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              總 UV
            </div>
            <div className="text-2xl font-bold">{summary.totalUV.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Globe className="w-4 h-4" />
              平均頁數/人
            </div>
            <div className="text-2xl font-bold">{summary.avgPagesPerVisitor}</div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trend - Simple bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">每日瀏覽趨勢</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyTrend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">尚無資料</p>
          ) : (
            <div className="space-y-1.5">
              {dailyTrend.map((d) => (
                <div key={d.date} className="flex items-center gap-3 text-xs">
                  <span className="w-20 text-gray-500 tabular-nums flex-shrink-0">
                    {new Date(d.date + "T00:00:00").toLocaleDateString("zh-TW", { month: "short", day: "numeric", weekday: "short" })}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div
                      className="h-5 bg-blue-500 rounded-sm transition-all"
                      style={{ width: `${Math.max((d.pv / maxDailyPV) * 100, 2)}%` }}
                    />
                    <span className="text-gray-600 tabular-nums">{d.pv} PV / {d.uv} UV</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">熱門頁面 TOP 20</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topPages.map((p, i) => (
                <div key={p.path} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-gray-400 text-right">{i + 1}</span>
                  <span className="flex-1 truncate text-gray-700" title={p.path}>
                    {p.path}
                  </span>
                  <span className="text-gray-500 tabular-nums">{p.pv} PV</span>
                  <span className="text-gray-400 tabular-nums">{p.uv} UV</span>
                </div>
              ))}
              {topPages.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">尚無資料</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Referrer Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">流量來源</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {referrerSources.map((r) => {
                  const pct = summary.totalPV > 0 ? Math.round((r.count / summary.totalPV) * 100) : 0;
                  return (
                    <div key={r.source} className="flex items-center gap-2 text-xs">
                      <span className="w-20 text-gray-700">{r.source}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-gray-500 tabular-nums w-16 text-right">{r.count} ({pct}%)</span>
                    </div>
                  );
                })}
                {referrerSources.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">尚無資料</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Device Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">裝置分佈</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                {devices.map((d) => {
                  const Icon = DEVICE_ICONS[d.device] || Monitor;
                  const pct = summary.totalPV > 0 ? Math.round((d.count / summary.totalPV) * 100) : 0;
                  return (
                    <div key={d.device} className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">{d.device}</div>
                        <div className="text-xs text-gray-500">{pct}% ({d.count})</div>
                      </div>
                    </div>
                  );
                })}
                {devices.length === 0 && (
                  <p className="text-sm text-gray-400">尚無資料</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">最近訪客（20 筆）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentSessions.map((s) => (
              <div key={s.sessionId} className="border-b border-gray-100 last:border-0">
                <button
                  onClick={() => setExpandedSession(expandedSession === s.sessionId ? null : s.sessionId)}
                  className="w-full flex items-center gap-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors text-left"
                >
                  <span className="font-mono text-gray-400 w-16">{s.sessionId}</span>
                  <span className="text-gray-600">{s.pageCount} 頁</span>
                  <span className="flex-1 truncate text-gray-500">{s.lastPage}</span>
                  <span className="text-gray-400 w-14 text-right">
                    {new Date(s.firstSeen).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </button>
                {expandedSession === s.sessionId && (
                  <div className="pl-8 pb-2 space-y-0.5">
                    {s.pages.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-gray-300">
                          {new Date(p.time).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                        {i < s.pages.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300" />}
                        <span className="text-gray-600">{p.path}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {recentSessions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">尚無訪客資料</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
