"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ArticleDetail } from "./article-detail-types";

interface PublishStatusCardProps {
  article: ArticleDetail;
  publishing: boolean;
  onCancelSchedule: () => void;
}

export function PublishStatusCard({
  article,
  publishing,
  onCancelSchedule,
}: PublishStatusCardProps) {
  // 已發布資訊
  if (article.status === "published" && article.published_at) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              已發布
            </Badge>
            <span className="text-gray-600">
              發布時間：{new Date(article.published_at).toLocaleString("zh-TW")}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 排程資訊
  if (article.status === "draft" && article.scheduled_at) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                排程中
              </Badge>
              <span className="text-gray-600">
                預定發布時間：{new Date(article.scheduled_at).toLocaleString("zh-TW")}
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              disabled={publishing}
              onClick={onCancelSchedule}
            >
              取消排程
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
