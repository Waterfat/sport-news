"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface AnalyticsData {
  top_articles: TopArticle[];
  views_by_day: DayStats[];
  views_by_category: Record<string, { articles: number; views: number }>;
  totals: { total_views: number; total_articles: number };
  quality?: QualityStats;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-gray-500">載入中...</div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-red-500">無法載入分析資料</div>;
  }

  const maxViews = Math.max(...data.views_by_day.map((d) => d.views), 1);
  const categoryEntries = Object.entries(data.views_by_category).sort(
    (a, b) => b[1].views - a[1].views
  );
  const maxCatViews = Math.max(
    ...categoryEntries.map(([, s]) => s.views),
    1
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">成效分析</h1>

      {/* 總覽 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">總瀏覽次數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {data.totals.total_views.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">已發布文章</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data.totals.total_articles}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">平均瀏覽數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {data.totals.total_articles > 0
                ? Math.round(data.totals.total_views / data.totals.total_articles)
                : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">分類數</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {categoryEntries.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 每日瀏覽趨勢 */}
      <Card>
        <CardHeader>
          <CardTitle>每日瀏覽趨勢（近 30 天）</CardTitle>
        </CardHeader>
        <CardContent>
          {data.views_by_day.length === 0 ? (
            <p className="text-gray-400 text-sm">尚無瀏覽資料</p>
          ) : (
            <div className="flex items-end gap-1 h-48 overflow-x-auto min-w-0">
              {data.views_by_day.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">
                    {day.views > 0 ? day.views : ""}
                  </span>
                  <div
                    className="w-full bg-blue-500 rounded-t min-h-[2px]"
                    style={{ height: `${(day.views / maxViews) * 160}px` }}
                  />
                  <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">
                    {day.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 熱門文章 TOP 10 */}
        <Card>
          <CardHeader>
            <CardTitle>熱門文章 TOP 10</CardTitle>
          </CardHeader>
          <CardContent>
            {data.top_articles.length === 0 ? (
              <p className="text-gray-400 text-sm">尚無已發布文章</p>
            ) : (
              <div className="space-y-3">
                {data.top_articles.map((article, i) => (
                  <div
                    key={article.id}
                    className="flex items-start gap-3 p-2 rounded hover:bg-gray-50"
                  >
                    <span className="text-lg font-bold text-gray-300 w-6 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/admin/articles/${article.id}`}
                        className="text-sm font-medium hover:underline line-clamp-1"
                      >
                        {article.title}
                      </a>
                      {article.category && (
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {article.category}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-blue-600 shrink-0">
                      {article.view_count.toLocaleString()} 次
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分類瀏覽統計 */}
        <Card>
          <CardHeader>
            <CardTitle>分類瀏覽統計</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryEntries.length === 0 ? (
              <p className="text-gray-400 text-sm">尚無分類資料</p>
            ) : (
              <div className="space-y-4">
                {categoryEntries.map(([category, stats]) => (
                  <div key={category} className="space-y-1">
                    <div className="flex flex-wrap justify-between gap-1 text-sm">
                      <span className="font-medium break-all">{category}</span>
                      <span className="text-gray-500 whitespace-nowrap">
                        {stats.views} 次 / {stats.articles} 篇
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${(stats.views / maxCatViews) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 文章品質監控 */}
      {data.quality && (
        <>
          <h2 className="text-xl font-bold mt-4">文章品質監控</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">平均文章長度</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {data.quality.avg_length.toLocaleString()} 字
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">平均按讚數</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">
                  {data.quality.avg_likes.toFixed(1)}
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-2 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">分類數量最多</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">
                  {data.quality.category_distribution[0]?.category || "-"}
                </div>
                <div className="text-xs text-gray-400">
                  {data.quality.category_distribution[0]?.count || 0} 篇
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 分類分佈長條圖 */}
          {data.quality.category_distribution.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>文章分類分佈</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const maxCount = Math.max(
                      ...data.quality!.category_distribution.map((d) => d.count),
                      1
                    );
                    return data.quality!.category_distribution.map((item) => (
                      <div key={item.category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{item.category}</span>
                          <span className="text-gray-500">{item.count} 篇</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{
                              width: `${(item.count / maxCount) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
