"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ARTICLE_STATUS_LABELS } from "@/lib/constants";

const PAGE_SIZE_OPTIONS = [20, 50, 100, 300];

interface Article {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  published_at: string | null;
  scheduled_at: string | null;
  images: string[];
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
  url: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  published: "default",
};

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [jumpInput, setJumpInput] = useState("");

  // 批次選取
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // 單篇發布 loading
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());

  // 排程彈出
  const [scheduleOpenId, setScheduleOpenId] = useState<string | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState("");

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
    } catch (err) {
      console.error("Failed to fetch rewrite status:", err);
    }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/rewrite/plan");
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setRawArticleMap(data.rawArticleMap || {});
      }
    } catch (err) {
      console.error("Failed to fetch plans:", err);
    }
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
        try {
          const r = await fetch("/api/rewrite");
          if (r.ok) {
            const d = await r.json();
            setRewriteStatus(d);
            if (!d.currentTask) {
              clearInterval(interval);
              clearTimeout(timeout);
              setRunningMode(null);
              fetchPlans();
            }
          }
        } catch (err) {
          console.error("Failed to poll rewrite status during plan:", err);
        }
      }, 3000);
      const timeout = setTimeout(() => clearInterval(interval), 600000);
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
        try {
          const r = await fetch("/api/rewrite");
          if (r.ok) {
            const d = await r.json();
            setRewriteStatus(d);
            if (!d.currentTask) {
              clearInterval(interval);
              clearTimeout(timeout);
              setRunningMode(null);
              fetchPlans();
              fetchArticles();
            }
          }
        } catch (err) {
          console.error("Failed to poll rewrite status during produce:", err);
        }
      }, 3000);
      const timeout = setTimeout(() => clearInterval(interval), 600000);
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
      alert("觸發失敗，請確認監聽器是否正在運行");
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
            clearTimeout(timeout);
            setRunningMode(null);
            fetchArticles();
          }
        }
      } catch (err) {
        console.error("Failed to poll rewrite status:", err);
      }
    }, 3000);

    // 最多輪詢 10 分鐘
    const timeout = setTimeout(() => clearInterval(interval), 600000);
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

  const handleBatchAction = async (action: "publish" | "delete") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const labels = { publish: "發布", delete: "刪除" };
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

  const handlePublishOne = async (articleId: string) => {
    setPublishingIds((prev) => new Set(prev).add(articleId));
    try {
      const res = await fetch("/api/articles/generated/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [articleId], action: "publish" }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, status: "published", published_at: new Date().toISOString() }
              : a
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "發布失敗");
      }
    } catch {
      alert("發布失敗");
    } finally {
      setPublishingIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  };

  const handleScheduleOne = async (articleId: string) => {
    if (!scheduleDateTime) return;
    try {
      const res = await fetch(`/api/articles/generated/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: new Date(scheduleDateTime).toISOString(),
        }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, scheduled_at: new Date(scheduleDateTime).toISOString() }
              : a
          )
        );
        setScheduleOpenId(null);
        setScheduleDateTime("");
      }
    } catch {
      alert("排程設定失敗");
    }
  };

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
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
  }, [page, pageSize, status]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const totalPages = Math.ceil(total / pageSize);

  const handleJump = () => {
    const target = parseInt(jumpInput, 10);
    if (target >= 1 && target <= totalPages) {
      setPage(target);
      setJumpInput("");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">共 {total} 篇文章</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  每頁 {size} 篇
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              <div>
                <h2 className="text-lg font-semibold">規劃列表 ({plans.length} 項)</h2>
                {plans.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    最後規劃時間：{new Date(plans[plans.length - 1].created_at).toLocaleString("zh-TW")}
                  </p>
                )}
              </div>
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
                              <a
                                key={rawId}
                                href={info.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-xs text-blue-600 hover:text-blue-800 hover:underline truncate"
                                title={info.title}
                              >
                                <span className="text-gray-400">[{info.source}]</span> {info.title}
                              </a>
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
          <TabsTrigger value="draft">未發布</TabsTrigger>
          <TabsTrigger value="scheduled">排程中</TabsTrigger>
          <TabsTrigger value="published">已發布</TabsTrigger>
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
                onClick={() => handleBatchAction("publish")}
              >
                批次發布
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
        <div className="border rounded-lg overflow-x-auto">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={articles.length > 0 && selectedIds.size === articles.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[40%]">標題</TableHead>
                <TableHead className="w-[100px]">寫手</TableHead>
                <TableHead className="w-[80px]">狀態</TableHead>
                <TableHead className="w-[140px]">建立時間</TableHead>
                <TableHead className="w-[200px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.map((article) => {
                const statusLabel = ARTICLE_STATUS_LABELS[article.status] || ARTICLE_STATUS_LABELS.draft;
                const statusVariant = STATUS_VARIANT[article.status] || STATUS_VARIANT.draft;
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
                    <TableCell className="font-medium overflow-hidden">
                      <div className="flex items-start gap-3">
                        {article.images?.[0] && (
                          <Image
                            src={article.images[0]}
                            alt=""
                            width={48}
                            height={48}
                            className="w-12 h-12 object-cover rounded flex-shrink-0 mt-0.5"
                            unoptimized
                          />
                        )}
                        <div className="min-w-0 overflow-hidden">
                          <Link
                            href={`/admin/articles/${article.id}`}
                            className="hover:underline line-clamp-1"
                          >
                            {article.title}
                          </Link>
                          {article.content && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                              {article.content.substring(0, 100)}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="truncate">
                      {article.writer_personas?.name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant}>
                        {statusLabel}
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
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {article.status === "draft" && !article.scheduled_at && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={publishingIds.has(article.id)}
                              onClick={() => handlePublishOne(article.id)}
                            >
                              {publishingIds.has(article.id) ? (
                                <span className="flex items-center gap-1">
                                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                  發布中
                                </span>
                              ) : (
                                "發布"
                              )}
                            </Button>
                            <div className="relative">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setScheduleOpenId(
                                    scheduleOpenId === article.id ? null : article.id
                                  )
                                }
                              >
                                排程
                              </Button>
                              {scheduleOpenId === article.id && (
                                <div className="absolute right-0 top-full mt-1 z-50 bg-white border rounded-lg shadow-lg p-3 space-y-2 w-[260px]">
                                  <Input
                                    type="datetime-local"
                                    value={scheduleDateTime}
                                    onChange={(e) => setScheduleDateTime(e.target.value)}
                                    min={new Date().toISOString().slice(0, 16)}
                                    className="text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      disabled={!scheduleDateTime}
                                      onClick={() => handleScheduleOne(article.id)}
                                      className="flex-1"
                                    >
                                      確認排程
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setScheduleOpenId(null);
                                        setScheduleDateTime("");
                                      }}
                                    >
                                      取消
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        <Link href={`/admin/articles/${article.id}`}>
                          <Button variant="outline" size="sm">
                            查看
                          </Button>
                        </Link>
                      </div>
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
          <span className="text-gray-300">|</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleJump()}
            placeholder="頁碼"
            className="w-[70px] h-8 px-2 text-sm border rounded-md text-center"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleJump}
            disabled={!jumpInput}
          >
            前往
          </Button>
        </div>
      )}
    </div>
  );
}
