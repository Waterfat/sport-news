"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BatchActionsBarProps {
  selectedCount: number;
  batchLoading: boolean;
  onPublish: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BatchActionsBar({
  selectedCount,
  batchLoading,
  onPublish,
  onDelete,
  onClear,
}: BatchActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            已選取 {selectedCount} 篇
          </span>
          <Button
            size="sm"
            disabled={batchLoading}
            onClick={onPublish}
          >
            批次發布
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={batchLoading}
            onClick={onDelete}
          >
            批次刪除
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
          >
            取消選取
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
