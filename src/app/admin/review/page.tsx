"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReviewArticle {
  id: string;
  title: string;
  status: string;
  review_status: string;
  reviewer_note?: string;
  created_at: string;
  updated_at?: string;
}

type Tab = "pending" | "history";

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("pending");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: articles = [], isLoading } = useQuery<ReviewArticle[]>({
    queryKey: ["review-queue", tab],
    queryFn: async () => {
      const res = await fetch(`/api/articles/generated/review?tab=${tab}`);
      if (!res.ok) throw new Error("fetch failed");
      return res.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, review_status, reason }: { id: string; review_status: "approved" | "rejected"; reason?: string }) => {
      const res = await fetch("/api/articles/generated/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, review_status, reason }),
      });
      const data = await res.json();
      if (!data.success) throw new Error("review failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-status"] });
    },
  });

  function handleApprove(id: string) {
    reviewMutation.mutate({ id, review_status: "approved" });
  }

  function handleRejectConfirm() {
    if (!rejectTarget) return;
    reviewMutation.mutate({ id: rejectTarget, review_status: "rejected", reason: rejectReason || undefined });
    setRejectTarget(null);
    setRejectReason("");
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">審稿佇列</h1>
        <p className="text-gray-500 mt-1">審核待發布的文章草稿</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button variant={tab === "pending" ? "default" : "outline"} size="sm" onClick={() => setTab("pending")}>
          待審稿 {tab === "pending" && articles.length > 0 && `(${articles.length})`}
        </Button>
        <Button variant={tab === "history" ? "default" : "outline"} size="sm" onClick={() => setTab("history")}>
          審稿歷史
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500">載入中...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-16 text-gray-400 border-2 border-dashed rounded-lg">
          {tab === "pending" ? "目前沒有待審稿的文章" : "尚無審稿紀錄"}
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm leading-snug">{article.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                      <span>{formatDate(article.created_at)}</span>
                      {article.review_status !== "pending" && (
                        <Badge variant={article.review_status === "approved" ? "default" : "destructive"} className="text-xs">
                          {article.review_status === "approved" ? "已核准" : "已退回"}
                        </Badge>
                      )}
                      {article.reviewer_note && (
                        <span className="text-gray-400">— {article.reviewer_note}</span>
                      )}
                    </div>
                  </div>
                  {tab === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" variant="default" onClick={() => handleApprove(article.id)} disabled={reviewMutation.isPending}>
                        核准
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRejectTarget(article.id)} disabled={reviewMutation.isPending}>
                        退回
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reject reason dialog */}
      <AlertDialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>退回文章</AlertDialogTitle>
            <AlertDialogDescription>
              請輸入退回理由（選填）
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="退回理由..."
            rows={3}
            className="w-full text-sm border rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm}>確認退回</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
