"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useQueryState, parseAsString } from "nuqs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Users, BarChart3, Globe, Monitor, Smartphone, Tablet, ArrowRight, UserCheck } from "lucide-react";

// --- Content analytics types ---
interface TopArticle {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  category: string | null;
  published_at: string | null;
}

interface DayStats {
  date: string;
  articles: number;
  views: number;
}

interface QualityStats {
  avg_length: number;
  avg_likes: number;
  category_distribution: { category: string; count: number }[];
}

interface ContentData {
  top_articles: TopArticle[];
  views_by_day: DayStats[];
  views_by_category: Record<string, { articles: number; views: number }>;
  totals: { total_views: number; total_articles: number };
  quality?: QualityStats;
}

// --- Visitor analytics types ---
interface VisitorData {
  summary: {
    totalPV: number;
    totalUV: number;
    avgPagesPerVisitor: number;
    todayPV: number;
    todayUV: number;
    memberViews: number;
  };
  dailyTrend: { date: string; pv: number; uv: number }[];
  topPages: { path: string; name: string; pv: number; uv: number }[];
  referrerSources: { source: string; count: number }[];
  devices: { device: string; count: number }[];
  recentSessions: {
    sessionId: string;
    isMember: boolean;
    pageCount: number;
    firstSeen: string;
    lastPage: string;
    ua: string;
    pages: { path: string; name: string; time: string }[];
  }[];
}

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
};

export default function AnalyticsClient() {
  const [period, setPeriod] = useQueryState("period", parseAsString.withDefault("7d"));
  const [tab, setTab] = useState<"visitor" | "content">("visitor");
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  const { data: content, isLoading: contentLoading } = useQuery<ContentData>({
    queryKey: ["analytics-content"],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    enabled: tab === "content",
  });

  const { data: visitor, isLoading: visitorLoading } = useQuery<VisitorData>({
    queryKey: ["analytics-visitors", period],
    queryFn: async () => {
      const res = await fetch(`/api/admin/visitors?period=${period}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
    enabled: tab === "visitor",
  });

  const loading = (tab === "visitor" && visitorLoading) || (tab === "content" && contentLoading);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">數據分析</h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const maxDailyPV = Math.max(...(visitor?.dailyTrend ?? []).map((d) => d.pv), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">數據分析</h1>
        <div className="flex items-center gap-3">
          {/* Tab switch */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab("visitor")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "visitor" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              訪客分析
            </button>
            <button
              onClick={() => setTab("content")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === "content" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              內容成效
            </button>
          </div>
          {/* Period switch (visitor tab only) */}
          {tab === "visitor" && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {["7d", "30d", "90d"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                  }`}
                >
                  {p === "7d" ? "7 天" : p === "30d" ? "30 天" : "90 天"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tab === "visitor" && visitor && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Eye className="w-3.5 h-3.5" /> 今日 PV
                </div>
                <div className="text-2xl font-bold text-blue-600">{visitor.summary.todayPV}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Users className="w-3.5 h-3.5" /> 今日 UV
                </div>
                <div className="text-2xl font-bold text-green-600">{visitor.summary.todayUV}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <BarChart3 className="w-3.5 h-3.5" /> 總 PV
                </div>
                <div className="text-2xl font-bold">{visitor.summary.totalPV.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Users className="w-3.5 h-3.5" /> 總 UV
                </div>
                <div className="text-2xl font-bold">{visitor.summary.totalUV.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Globe className="w-3.5 h-3.5" /> 頁/人
                </div>
                <div className="text-2xl font-bold">{visitor.summary.avgPagesPerVisitor}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <UserCheck className="w-3.5 h-3.5" /> 會員瀏覽
                </div>
                <div className="text-2xl font-bold text-purple-600">{visitor.summary.memberViews}</div>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend */}
          <Card>
            <CardHeader><CardTitle className="text-base">每日 PV/UV 趨勢</CardTitle></CardHeader>
            <CardContent>
              {visitor.dailyTrend.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">尚無資料</p>
              ) : (
                <div className="space-y-1.5">
                  {visitor.dailyTrend.map((d) => (
                    <div key={d.date} className="flex items-center gap-3 text-xs">
                      <span className="w-20 text-gray-500 tabular-nums flex-shrink-0">
                        {new Date(d.date + "T00:00:00").toLocaleDateString("zh-TW", { month: "short", day: "numeric", weekday: "short" })}
                      </span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="h-5 bg-blue-500 rounded-sm" style={{ width: `${Math.max((d.pv / maxDailyPV) * 100, 2)}%` }} />
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
              <CardHeader><CardTitle className="text-base">熱門頁面 TOP 20</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {visitor.topPages.map((p, i) => (
                    <div key={p.path} className="flex items-center gap-2 text-xs">
                      <span className="w-5 text-gray-400 text-right">{i + 1}</span>
                      <span className="flex-1 truncate text-gray-700" title={p.path}>{p.name}</span>
                      <span className="text-gray-500 tabular-nums">{p.pv}</span>
                      <span className="text-gray-400 tabular-nums">{p.uv} UV</span>
                    </div>
                  ))}
                  {visitor.topPages.length === 0 && <p className="text-sm text-gray-400 text-center py-4">尚無資料</p>}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {/* Referrer */}
              <Card>
                <CardHeader><CardTitle className="text-base">流量來源</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {visitor.referrerSources.map((r) => {
                      const pct = visitor.summary.totalPV > 0 ? Math.round((r.count / visitor.summary.totalPV) * 100) : 0;
                      return (
                        <div key={r.source} className="flex items-center gap-2 text-xs">
                          <span className="w-20 text-gray-700">{r.source}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                          </div>
                          <span className="text-gray-500 tabular-nums w-16 text-right">{r.count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Devices */}
              <Card>
                <CardHeader><CardTitle className="text-base">裝置分佈</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    {visitor.devices.map((d) => {
                      const Icon = DEVICE_ICONS[d.device] || Monitor;
                      const pct = visitor.summary.totalPV > 0 ? Math.round((d.count / visitor.summary.totalPV) * 100) : 0;
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
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Sessions */}
          <Card>
            <CardHeader><CardTitle className="text-base">最近訪客</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1">
                {visitor.recentSessions.map((s) => (
                  <div key={s.sessionId} className="border-b border-gray-100 last:border-0">
                    <button
                      onClick={() => setExpandedSession(expandedSession === s.sessionId ? null : s.sessionId)}
                      className="w-full flex items-center gap-3 py-2 text-xs hover:bg-gray-50 rounded transition-colors text-left"
                    >
                      <span className={`font-mono w-20 ${s.isMember ? "text-purple-600 font-medium" : "text-gray-400"}`}>
                        {s.sessionId}
                      </span>
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
                            <span className="text-gray-600">{p.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {visitor.recentSessions.length === 0 && <p className="text-sm text-gray-400 text-center py-8">尚無訪客資料</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {tab === "content" && content && (
        <>
          {/* Content summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">總瀏覽次數</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-blue-600">{content.totals.total_views.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">已發布文章</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{content.totals.total_articles}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">平均瀏覽數</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {content.totals.total_articles > 0 ? Math.round(content.totals.total_views / content.totals.total_articles) : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">平均文章長度</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{content.quality?.avg_length.toLocaleString() ?? 0} 字</div>
              </CardContent>
            </Card>
          </div>

          {/* Daily article views trend */}
          <Card>
            <CardHeader><CardTitle>每日文章瀏覽趨勢（近 30 天）</CardTitle></CardHeader>
            <CardContent>
              {content.views_by_day.length === 0 ? (
                <p className="text-gray-400 text-sm">尚無瀏覽資料</p>
              ) : (
                <div className="flex items-end gap-1 h-48 overflow-x-auto min-w-0">
                  {content.views_by_day.map((day) => {
                    const maxV = Math.max(...content.views_by_day.map((d) => d.views), 1);
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-gray-500">{day.views > 0 ? day.views : ""}</span>
                        <div className="w-full bg-blue-500 rounded-t min-h-[2px]" style={{ height: `${(day.views / maxV) * 160}px` }} />
                        <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">{day.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Top articles */}
            <Card>
              <CardHeader><CardTitle>熱門文章 TOP 10</CardTitle></CardHeader>
              <CardContent>
                {content.top_articles.length === 0 ? (
                  <p className="text-gray-400 text-sm">尚無已發布文章</p>
                ) : (
                  <div className="space-y-3">
                    {content.top_articles.map((article, i) => (
                      <div key={article.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50">
                        <span className="text-lg font-bold text-gray-300 w-6 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <a href={`/admin/articles/${article.id}`} className="text-sm font-medium hover:underline line-clamp-1">{article.title}</a>
                          {article.category && <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">{article.category}</span>}
                        </div>
                        <span className="text-sm font-semibold text-blue-600 shrink-0">{article.view_count.toLocaleString()} 次</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category stats */}
            <Card>
              <CardHeader><CardTitle>分類瀏覽統計</CardTitle></CardHeader>
              <CardContent>
                {(() => {
                  const entries = Object.entries(content.views_by_category).sort((a, b) => b[1].views - a[1].views);
                  const maxV = Math.max(...entries.map(([, s]) => s.views), 1);
                  return entries.length === 0 ? (
                    <p className="text-gray-400 text-sm">尚無分類資料</p>
                  ) : (
                    <div className="space-y-4">
                      {entries.map(([category, stats]) => (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{category}</span>
                            <span className="text-gray-500">{stats.views} 次 / {stats.articles} 篇</span>
                          </div>
                          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(stats.views / maxV) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
