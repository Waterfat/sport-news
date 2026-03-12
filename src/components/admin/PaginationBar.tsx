"use client";

import { Button } from "@/components/ui/button";

interface PaginationBarProps {
  page: number;
  totalPages: number;
  jumpInput: string;
  onPageChange: (page: number) => void;
  onJumpInputChange: (value: string) => void;
  onJump: () => void;
}

export function PaginationBar({
  page,
  totalPages,
  jumpInput,
  onPageChange,
  onJumpInputChange,
  onJump,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
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
        onClick={() => onPageChange(page + 1)}
      >
        下一頁
      </Button>
      <span className="text-gray-300">|</span>
      <input
        type="number"
        min={1}
        max={totalPages}
        value={jumpInput}
        onChange={(e) => onJumpInputChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onJump()}
        placeholder="頁碼"
        className="w-[70px] h-8 px-2 text-sm border rounded-md text-center"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={onJump}
        disabled={!jumpInput}
      >
        前往
      </Button>
    </div>
  );
}
