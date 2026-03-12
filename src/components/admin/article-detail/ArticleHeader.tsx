"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ARTICLE_STATUS_LABELS } from "@/lib/constants";
import type { ArticleDetail } from "./article-detail-types";

interface ArticleHeaderProps {
  article: ArticleDetail;
  isEditing: boolean;
  saving: boolean;
  onBack: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
}

export function ArticleHeader({
  article,
  isEditing,
  saving,
  onBack,
  onEdit,
  onCancelEdit,
  onSave,
}: ArticleHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          返回
        </Button>
        <Badge variant="secondary">{ARTICLE_STATUS_LABELS[article.status]}</Badge>
        {article.writer_personas && (
          <span className="text-sm text-gray-500">
            寫手：{article.writer_personas.name}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {!isEditing && article.status === "draft" && (
          <Button variant="outline" size="sm" onClick={onEdit}>
            編輯
          </Button>
        )}
        {isEditing && (
          <>
            <Button variant="outline" size="sm" onClick={onCancelEdit}>
              取消
            </Button>
            <Button size="sm" disabled={saving} onClick={onSave}>
              儲存修改
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
