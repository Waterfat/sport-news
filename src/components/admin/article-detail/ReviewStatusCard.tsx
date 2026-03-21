"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReviewResult } from "./article-detail-types";

const reviewStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "待審",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  },
  approved: {
    label: "通過",
    className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  rejected: {
    label: "未通過",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  },
};

const writingStrategyLabels: Record<string, string> = {
  multi_source: "多源綜合",
  enriched: "內容增值",
  popular_digest: "熱門綜合",
};

interface ReviewStatusCardProps {
  reviewStatus: string | null;
  reviewResult: ReviewResult | null;
  reviewedAt: string | null;
  writingStrategy: string | null;
}

export function ReviewStatusCard({
  reviewStatus,
  reviewResult,
  reviewedAt,
  writingStrategy,
}: ReviewStatusCardProps) {
  if (!reviewStatus && !writingStrategy) return null;

  const statusConfig = reviewStatus
    ? reviewStatusConfig[reviewStatus] || { label: reviewStatus, className: "bg-gray-100 text-gray-800" }
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">審稿與寫作資訊</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 寫作策略 + 審稿狀態 */}
        <div className="flex flex-wrap items-center gap-3">
          {writingStrategy && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">寫作策略：</span>
              <Badge variant="secondary">
                {writingStrategyLabels[writingStrategy] || writingStrategy}
              </Badge>
            </div>
          )}
          {statusConfig && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">審稿狀態：</span>
              <Badge className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>
          )}
          {reviewedAt && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">審查時間：</span>
              <span className="text-sm">
                {new Date(reviewedAt).toISOString().replace("T", " ").substring(0, 19)}
              </span>
            </div>
          )}
        </div>

        {/* 審稿結果詳情 */}
        {reviewResult && (
          <div className="space-y-3 pt-2 border-t">
            {/* 評分項目 */}
            {reviewResult.scores && Object.keys(reviewResult.scores).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">評分項目</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(reviewResult.scores).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-2 rounded border bg-muted/20 text-sm"
                    >
                      <span className="text-muted-foreground truncate mr-2">{key}</span>
                      <span
                        className={`font-mono font-medium ${
                          typeof value === "number" && value < 4
                            ? "text-red-500"
                            : typeof value === "number" && value >= 7
                              ? "text-green-500"
                              : ""
                        }`}
                      >
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
                {reviewResult.average_score !== undefined && (
                  <p className="text-sm text-muted-foreground mt-2">
                    平均分數：<span className="font-medium text-foreground">{reviewResult.average_score}</span>
                  </p>
                )}
              </div>
            )}

            {/* Pass/Fail 項目 */}
            {reviewResult.checks && Object.keys(reviewResult.checks).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">通過/不通過項目</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(reviewResult.checks).map(([key, value]) => (
                    <Badge
                      key={key}
                      className={
                        value === "pass"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }
                    >
                      {key}: {value === "pass" ? "Pass" : "Fail"}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 原因 */}
            {reviewResult.reason && (
              <div>
                <p className="text-sm font-medium mb-1">審查意見</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/20 p-3 rounded">
                  {reviewResult.reason}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
