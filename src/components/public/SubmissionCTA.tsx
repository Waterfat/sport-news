"use client";

import { useState } from "react";
import { PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmissionModal } from "@/components/public/SubmissionModal";

export function SubmissionCTA() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-3.5 border-b border-border">
          <h3 className="font-serif text-[15px] font-bold text-foreground flex items-center gap-1.5">
            <PenLine className="w-4 h-4 text-blue-500" />
            我要投稿
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            喜歡寫體育評論嗎？加入 Howger Sport 寫手團隊！
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setOpen(true)}
          >
            立即申請
          </Button>
        </div>
      </div>

      <SubmissionModal open={open} onOpenChange={setOpen} />
    </>
  );
}
