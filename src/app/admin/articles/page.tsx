"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useQueryState, parseAsInteger, parseAsString } from "nuqs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_SIZE_OPTIONS, CATEGORY_COLORS } from "@/lib/constants";

import { PaginationBar } from "@/components/admin/PaginationBar";
import { PlansTable } from "@/components/admin/PlansTable";
import { ProductionPanel, PlanLoadingCard } from "@/components/admin/ProductionPanel";
import { ArticlesTable } from "@/components/admin/ArticlesTable";
import type { Article } from "@/components/admin/ArticlesTable";
import { BatchActionsBar } from "@/components/admin/BatchActionsBar";

import { useRewritePolling } from "@/hooks/useRewritePolling";
import { usePlanManager } from "@/hooks/usePlanManager";

export default function ArticlesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [pageSize, setPageSize] = useQueryState("pageSize", parseAsInteger.withDefault(20));
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("all"));
  const [category, setCategory] = useQueryState("category", parseAsString.withDefault("all"));
  const [jumpInput, setJumpInput] = useState("");

  // 批次選取
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 單篇發布 loading
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());

  const { data, isLoading: loading } = useQuery<{ articles: Article[]; total: number }>({
    queryKey: ["articles", status, category, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (status !== "all") params.set("status", status);
      if (category !== "all") params.set("category", category);
      const res = await fetch(`/api/articles/generated?${params}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
  });

  const articles = data?.articles || [];
  const total = data?.total || 0;

  const invalidateArticles = () => {
    queryClient.invalidateQueries({ queryKey: ["articles"] });
  };

  const planManager = usePlanManager({
    onProduceSuccess: () => {
      // reset runningMode on failure is handled inside triggerProduce
    },
  });

  const rewritePolling = useRewritePolling({
    onPollComplete: invalidateArticles,
    onPlanPollComplete: () => {
      planManager.fetchPlans();
      invalidateArticles();
    },
    onProducePollComplete: () => {
      planManager.fetchPlans();
      invalidateArticles();
    },
  });

  // --- Batch mutations ---
  const batchMutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "publish" | "delete" }) => {
      const res = await fetch("/api/articles/generated/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "操作失敗");
      }
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      invalidateArticles();
    },
    onError: (err) => {
      alert(err.message);
    },
  });

  const publishOneMutation = useMutation({
    mutationFn: async (articleId: string) => {
      setPublishingIds((prev) => new Set(prev).add(articleId));
      const res = await fetch("/api/articles/generated/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [articleId], action: "publish" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "發布失敗");
      }
      return articleId;
    },
    onSuccess: () => {
      invalidateArticles();
    },
    onError: (err) => {
      alert(err.message);
    },
    onSettled: (_data, _error, articleId) => {
      setPublishingIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    },
  });

  const scheduleOneMutation = useMutation({
    mutationFn: async ({ articleId, datetime }: { articleId: string; datetime: string }) => {
      const res = await fetch(`/api/articles/generated/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduled_at: new Date(datetime).toISOString(),
        }),
      });
      if (!res.ok) throw new Error("排程設定失敗");
    },
    onSuccess: () => {
      invalidateArticles();
    },
    onError: (err) => {
      alert(err.message);
    },
  });

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

    batchMutation.mutate({ ids, action });
  };

  const handlePublishOne = async (articleId: string) => {
    publishOneMutation.mutate(articleId);
  };

  const handleScheduleOne = async (articleId: string, datetime: string) => {
    scheduleOneMutation.mutate({ articleId, datetime });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleTriggerPlan = () => {
    rewritePolling.triggerPlan(planManager.clearPlans);
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

      {/* 狀態 + 分類篩選 */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={status} onValueChange={handleStatusChange}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="draft">未發布</TabsTrigger>
            <TabsTrigger value="scheduled">排程中</TabsTrigger>
            <TabsTrigger value="published">已發布</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select
          value={category}
          onValueChange={(v) => {
            setCategory(v);
            setPage(1);
            setSelectedIds(new Set());
          }}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="所有分類" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">所有分類</SelectItem>
            {Object.keys(CATEGORY_COLORS).filter((k) => k.length <= 3 || k === "綜合").map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 批次操作列 */}
      <BatchActionsBar
        selectedCount={selectedIds.size}
        batchLoading={batchMutation.isPending}
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
