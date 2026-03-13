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
import { PAGE_SIZE_OPTIONS } from "@/lib/constants";

import { PaginationBar } from "@/components/admin/PaginationBar";
import { PlansTable } from "@/components/admin/PlansTable";
import { ProductionPanel, PlanLoadingCard } from "@/components/admin/ProductionPanel";
import { ArticlesTable } from "@/components/admin/ArticlesTable";
import type { Article } from "@/components/admin/ArticlesTable";
import { BatchActionsBar } from "@/components/admin/BatchActionsBar";

import { useRewritePolling } from "@/hooks/useRewritePolling";
import { usePlanManager } from "@/hooks/usePlanManager";

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

  const planManager = usePlanManager({
    onProduceSuccess: () => {
      // reset runningMode on failure is handled inside triggerProduce
    },
  });

  const rewritePolling = useRewritePolling({
    onPollComplete: () => {
      fetchArticles();
    },
    onPlanPollComplete: () => {
      planManager.fetchPlans();
    },
    onProducePollComplete: () => {
      planManager.fetchPlans();
      fetchArticles();
    },
  });

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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

  const handleTriggerPlan = () => {
    rewritePolling.triggerPlan(false, planManager.clearPlans);
  };

  const handlePlanProduce = () => {
    planManager.handlePlanProduce(() => {
      rewritePolling.triggerProduce();
    });
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">文章管理</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
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
        rewriteStatus={rewritePolling.rewriteStatus}
        runningMode={rewritePolling.runningMode}
        planTriggering={rewritePolling.planTriggering}
        plansCount={planManager.plans.length}
        onTriggerPlan={handleTriggerPlan}
      />

      {/* 規劃列表 */}
      <PlansTable
        plans={planManager.plans}
        selectedPlanIds={planManager.selectedPlanIds}
        rawArticleMap={planManager.rawArticleMap}
        earliestCrawledAt={planManager.earliestCrawledAt}
        planLoading={planManager.planLoading}
        rewriteCurrentTask={!!rewritePolling.rewriteStatus?.currentTask}
        onToggleSelect={planManager.togglePlanSelect}
        onToggleSelectAll={planManager.togglePlanSelectAll}
        onProduce={handlePlanProduce}
        onDelete={planManager.handlePlanDelete}
      />

      {rewritePolling.runningMode === "plan" && planManager.plans.length === 0 && <PlanLoadingCard />}

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
