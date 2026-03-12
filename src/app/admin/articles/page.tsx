"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { POLLING_INTERVAL_MS, POLLING_TIMEOUT_MS, PAGE_SIZE_OPTIONS } from "@/lib/constants";

import { PaginationBar } from "@/components/admin/PaginationBar";
import { PlansTable } from "@/components/admin/PlansTable";
import type { PlanItem, RawArticleInfo } from "@/components/admin/PlansTable";
import { ProductionPanel, PlanLoadingCard } from "@/components/admin/ProductionPanel";
import { ArticlesTable } from "@/components/admin/ArticlesTable";
import type { Article } from "@/components/admin/ArticlesTable";
import { BatchActionsBar } from "@/components/admin/BatchActionsBar";
import type { RewriteStatus } from "@/types/rewrite";

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
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    fetchRewriteStatus();
  }, [fetchRewriteStatus]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const pollRewriteStatus = useCallback(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/rewrite");
        if (res.ok) {
          const data = await res.json();
          setRewriteStatus(data);
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
    }, POLLING_INTERVAL_MS);

    const timeout = setTimeout(() => clearInterval(interval), POLLING_TIMEOUT_MS);
  }, [fetchArticles]);

  // 如果頁面載入時已有進行中的任務，啟動輪詢
  useEffect(() => {
    if (rewriteStatus?.currentTask && !runningMode) {
      setRunningMode("rewrite");
      pollRewriteStatus();
    }
  }, [rewriteStatus?.currentTask?.status]);

  // --- Plan callbacks ---

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
      }, POLLING_INTERVAL_MS);
      const timeout = setTimeout(() => clearInterval(interval), POLLING_TIMEOUT_MS);
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
      setPlans((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelectedPlanIds(new Set());
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
      }, POLLING_INTERVAL_MS);
      const timeout = setTimeout(() => clearInterval(interval), POLLING_TIMEOUT_MS);
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

  // --- Article callbacks ---

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

  const handleScheduleOne = async (articleId: string, datetime: string) => {
    try {
      const res = await fetch(`/api/articles/generated/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: new Date(datetime).toISOString(),
        }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, scheduled_at: new Date(datetime).toISOString() }
              : a
          )
        );
      } else {
        alert("排程設定失敗");
      }
    } catch {
      alert("排程設定失敗");
    }
  };

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
      <ProductionPanel
        rewriteStatus={rewriteStatus}
        runningMode={runningMode}
        planTriggering={planTriggering}
        plansCount={plans.length}
        onTriggerPlan={() => triggerPlan()}
      />

      {/* 規劃列表 */}
      <PlansTable
        plans={plans}
        selectedPlanIds={selectedPlanIds}
        rawArticleMap={rawArticleMap}
        planLoading={planLoading}
        rewriteCurrentTask={!!rewriteStatus?.currentTask}
        onToggleSelect={togglePlanSelect}
        onToggleSelectAll={togglePlanSelectAll}
        onProduce={handlePlanProduce}
        onDelete={handlePlanDelete}
      />

      {runningMode === "plan" && plans.length === 0 && <PlanLoadingCard />}

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
      <BatchActionsBar
        selectedCount={selectedIds.size}
        batchLoading={batchLoading}
        onPublish={() => handleBatchAction("publish")}
        onDelete={() => handleBatchAction("delete")}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* 文章表格 */}
      <ArticlesTable
        articles={articles}
        loading={loading}
        selectedIds={selectedIds}
        publishingIds={publishingIds}
        onToggleSelect={toggleSelect}
        onToggleSelectAll={toggleSelectAll}
        onPublishOne={handlePublishOne}
        onScheduleConfirm={handleScheduleOne}
      />

      {/* 分頁 */}
      <PaginationBar
        page={page}
        totalPages={totalPages}
        jumpInput={jumpInput}
        onPageChange={setPage}
        onJumpInputChange={setJumpInput}
        onJump={handleJump}
      />
    </div>
  );
}
