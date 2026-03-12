"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Article {
  id: string;
  title: string;
  status: string;
  created_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  writer_personas: {
    name: string;
  } | null;
}

interface RewriteStatus {
  lastCompleted: {
    completed_at: string;
    articles_generated: number;
  } | null;
  currentTask: {
    status: string;
    created_at: string;
  } | null;
  newArticleCount: number;
}

interface PlanItem {
  id: string;
  title: string;
  raw_article_ids: string[];
  league: string | null;
  plan_type: string;
  created_at: string;
  writer_personas: { name: string; writer_type: string } | null;
}

interface RawArticleInfo {
  title: string;
  source: string;
}

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "待審核", variant: "secondary" },
  approved: { label: "已通過", variant: "default" },
  published: { label: "已發布", variant: "outline" },
  rejected: { label: "已退回", variant: "destructive" },
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // 批次選取
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // 改寫任務狀態
  const [rewriteStatus, setRewriteStatus] = useState<RewriteStatus | null>(null);
  const [triggering, setTriggering] = useState(false);

  // 規劃相關
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [rawArticleMap, setRawArticleMap] = useState<Record<string, RawArticleInfo>>({});
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [planLoading, setPlanLoading] = useState(false);
  const [planTriggering, setPlanTriggering] = useState(false);

  // 追蹤目前正在執行的任務類型：'plan' | 'produce' | 'rewrite' | null
  const [runningMode, setRunningMode] = useState<string | null>(null);

  const fetchRewriteStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/rewrite");
      if (res.ok) {
        const data = await res.json();
        setRewriteStatus(data);
      }
    } catch {}
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/rewrite/plan");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setRawArticleMap(data.rawArticleMap || {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const triggerPlan = async (force = false) => {
    setPlanTriggering(true);
    setRunningMode("plan");
    if (force) {
      setPlans([]);
      setSelectedPlanIds(new Set());
    }
    try {
      const res = await fetch("/api/rewrite/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.hasExisting) {
          setRunningMode(null);
          setPlanTriggering(false);
          if (confirm("已有規劃存在，是否清除並重新產生？")) {
            triggerPlan(true);
          }
          return;
        }
        alert(data.error || "規劃產生失敗");
        setRunningMode(null);
        return;
      }
      // 輪詢等完成後刷新規劃列表
      const interval = setInterval(async () => {
        const r = await fetch("/api/rewrite");
        if (r.ok) {
          const d = await r.json();
          setRewriteStatus(d);
          if (!d.currentTask) {
            clearInterval(interval);
            setRunningMode(null);
            fetchPlans();
          }
        }
      }, 3000);
      setTimeout(() => clearInterval(interval), 600000);
    } catch {
      alert("規劃失敗，請確認監聽器是否正在運行");
      setRunningMode(null);
    } finally {
      setPlanTriggering(false);
    }
  };

  const handlePlanProduce = async () => {
    const ids = Array.from(selectedPlanIds);
    if (ids.length === 0) return;
    if (!confirm(`確定要產出 ${ids.length} 篇規劃文章？`)) return;

    setPlanLoading(true);
    setRunningMode("produce");
    try {
      const res = await fetch("/api/rewrite/plan/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "產出失敗");
        setRunningMode(null);
        return;
      }
      // 立刻從列表移除已送出產出的項目
      setPlans((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelectedPlanIds(new Set());
      // 輪詢等完成後刷新
      const interval = setInterval(async () => {
        const r = await fetch("/api/rewrite");
        if (r.ok) {
          const d = await r.json();
          setRewriteStatus(d);
          if (!d.currentTask) {
            clearInterval(interval);
            setRunningMode(null);
            fetchPlans();
            fetchArticles();
          }
        }
      }, 3000);
      setTimeout(() => clearInterval(interval), 600000);
    } catch {
      alert("產出失敗");
      setRunningMode(null);
    } finally {
      setPlanLoading(false);
    }
  };

  const handlePlanDelete = async () => {
    const ids = Array.from(selectedPlanIds);
    if (ids.length === 0) return;
    if (!confirm(`確定要移除 ${ids.length} 個規劃項目？`)) return;

    setPlanLoading(true);
    try {
      const res = await fetch("/api/rewrite/plan", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) {
        setSelectedPlanIds(new Set());
        fetchPlans();
      }
    } catch {
      alert("移除失敗");
    } finally {
      setPlanLoading(false);
    }
  };

  const togglePlanSelect = (id: string) => {
    setSelectedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePlanSelectAll = () => {
    if (selectedPlanIds.size === plans.length) {
      setSelectedPlanIds(new Set());
    } else {
      setSelectedPlanIds(new Set(plans.map((p) => p.id)));
    }
  };

  const triggerRewrite = async () => {
    setTriggering(true);
    setRunningMode("rewrite");
    try {
      const res = await fetch("/api/rewrite", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "觸發失敗");
        setRunningMode(null);
        return;
      }
      // 開始輪詢狀態
      pollRewriteStatus();
    } catch {
      alert("觸發失敗，請確認監聯器是否正在運行");
      setRunningMode(null);
    } finally {
      setTriggering(false);
    }
  };

  const pollRewriteStatus = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/rewrite");
        if (res.ok) {
          const data = await res.json();
          setRewriteStatus(data);
          // 沒有進行中的任務了，停止輪詢
          if (!data.currentTask) {
            clearInterval(interval);
            setRunningMode(null);
            fetchArticles();
          }
        }
      } catch {}
    }, 3000);

    // 最多輪詢 10 分鐘
    setTimeout(() => clearInterval(interval), 600000);
  }, []);

  useEffect(() => {
    fetchRewriteStatus();
  }, [fetchRewriteStatus]);

  // 如果頁面載入時已有進行中的任務，啟動輪詢
  useEffect(() => {
    if (rewriteStatus?.currentTask && !runningMode) {
      // 頁面重整時偵測到有任務在跑，設定一個通用模式
      setRunningMode("rewrite");
      pollRewriteStatus();
    }
  }, [rewriteStatus?.currentTask?.status]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === articles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(articles.map((a) => a.id)));
    }
  };

  const handleBatchAction = async (action: "approved" | "rejected" | "delete") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const labels = { approved: "通過審核", rejected: "退回", delete: "刪除" };
    if (!confirm(`確定要將 ${ids.length} 篇文章${labels[action]}？`)) return;

    setBatchLoading(true);
    try {
      const res = await fetch("/api/articles/generated/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchArticles();
      } else {
        const data = await res.json();
        alert(data.error || "操作失敗");
      }
    } catch {
      alert("操作失敗");
    } finally {
      setBatchLoading(false);
    }
  };

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "20",
    });
    if (status !== "all") params.set("status", status);

    try {
      const res = await fetch(`/api/articles/generated?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch articles:", err);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <span className="text-sm text-gray-500">共 {total} 篇文章</span>
      </div>

      {/* 產出文章控制面板 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                onClick={() => triggerPlan()}
                disabled={planTriggering || !!runningMode}
              >
                {runningMode === "plan" ? "規劃中..." : runningMode === "produce" ? "產出中..." : "規劃"}
              </Button>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div>
                  <span className="text-gray-400">最後執行：</span>
                  {rewriteStatus?.lastCompleted?.completed_at
                    ? new Date(rewriteStatus.lastCompleted.completed_at).toLocaleString("zh-TW")
                    : "尚未執行"}
                </div>
                <div className="border-l pl-4">
                  <span className="text-gray-400">上次產出：</span>
                  {rewriteStatus?.lastCompleted
                    ? `${rewriteStatus.lastCompleted.articles_generated} 篇`
                    : "-"}
                </div>
                <div className="border-l pl-4">
                  <span className="text-gray-400">待處理新文章：</span>
                  <span className="font-medium text-gray-700">
                    {rewriteStatus?.newArticleCount ?? "-"}
                  </span>
                </div>
              </div>
            </div>
            {runningMode && (
              <Badge variant="secondary" className="animate-pulse">
                {runningMode === "plan" ? "規劃產生中" : runningMode === "produce" ? "文章產出中" : "文章產出中"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 規劃列表 */}
      {plans.length > 0 && (
        <Card>
          <CardContent className="py-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">規劃列表 ({plans.length} 項)</h2>
              <div className="flex items-center gap-2">
                {selectedPlanIds.size > 0 && (
                  <>
                    <span className="text-sm text-gray-500">已選 {selectedPlanIds.size} 項</span>
                    <Button
                      size="sm"
                      disabled={planLoading || !!rewriteStatus?.currentTask}
                      onClick={handlePlanProduce}
                    >
                      產出文章
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={planLoading}
                      onClick={handlePlanDelete}
                    >
                      移除
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={plans.length > 0 && selectedPlanIds.size === plans.length}
                        onCheckedChange={togglePlanSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[40%]">預計標題</TableHead>
                    <TableHead>寫手</TableHead>
                    <TableHead>類型</TableHead>
                    <TableHead>引用原文</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow
                      key={plan.id}
                      className={selectedPlanIds.has(plan.id) ? "bg-blue-50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedPlanIds.has(plan.id)}
                          onCheckedChange={() => togglePlanSelect(plan.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{plan.title}</TableCell>
                      <TableCell>{plan.writer_personas?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={plan.plan_type === "official" ? "default" : "outline"}>
                          {plan.plan_type === "official" ? "官方戰報" : "專欄"}
                          {plan.league ? ` · ${plan.league}` : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-xs">
                          {(plan.raw_article_ids || []).slice(0, 3).map((rawId) => {
                            const info = rawArticleMap[rawId];
                            return info ? (
                              <div key={rawId} className="text-xs text-gray-500 truncate" title={info.title}>
                                <span className="text-gray-400">[{info.source}]</span> {info.title}
                              </div>
                            ) : null;
                          })}
                          {(plan.raw_article_ids || []).length > 3 && (
                            <div className="text-xs text-gray-400">
                              ...還有 {plan.raw_article_ids.length - 3} 篇
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {runningMode === "plan" && plans.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center text-gray-500 animate-pulse">
            規劃產生中...
          </CardContent>
        </Card>
      )}

      {/* 狀態篩選 */}
      <Tabs value={status} onValueChange={handleStatusChange}>
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="draft">待審核</TabsTrigger>
          <TabsTrigger value="approved">已通過</TabsTrigger>
          <TabsTrigger value="scheduled">排程中</TabsTrigger>
          <TabsTrigger value="published">已發布</TabsTrigger>
          <TabsTrigger value="rejected">已退回</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 批次操作列 */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                已選取 {selectedIds.size} 篇
              </span>
              <Button
                size="sm"
                disabled={batchLoading}
                onClick={() => handleBatchAction("approved")}
              >
                批次通過
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={batchLoading}
                onClick={() => handleBatchAction("rejected")}
              >
                批次退回
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={batchLoading}
                onClick={() => handleBatchAction("delete")}
              >
                批次刪除
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                取消選取
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 文章表格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">載入中...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暫無文章</div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={articles.length > 0 && selectedIds.size === articles.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[45%]">標題</TableHead>
                <TableHead>寫手</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>建立時間</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => {
                const statusInfo = STATUS_MAP[article.status] || STATUS_MAP.draft;
                return (
                  <TableRow
                    key={article.id}
                    className={selectedIds.has(article.id) ? "bg-blue-50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(article.id)}
                        onCheckedChange={() => toggleSelect(article.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/articles/${article.id}`}
                        className="hover:underline"
                      >
                        {article.title}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {article.writer_personas?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      <div>{new Date(article.created_at).toLocaleString("zh-TW")}</div>
                      {article.scheduled_at && (
                        <div className="text-blue-600 text-xs mt-1">
                          排程：{new Date(article.scheduled_at).toLocaleString("zh-TW")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/articles/${article.id}`}>
                        <Button variant="outline" size="sm">
                          查看
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一頁
          </Button>
          <span className="text-sm text-gray-500">
            第 {page} / {totalPages} 頁
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </Button>
        </div>
      )}
    </div>
  );
}
