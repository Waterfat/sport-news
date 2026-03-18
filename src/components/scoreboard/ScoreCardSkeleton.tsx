"use client";

export default function ScoreCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden border-l-4 border-l-muted animate-pulse">
      <div className="px-4 pt-3 pb-2">
        <div className="h-5 w-24 bg-muted rounded" />
      </div>
      <div className="px-4 pb-2 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="h-4 w-10 bg-muted rounded" />
          <div className="h-4 flex-1 bg-muted rounded" />
          <div className="h-5 w-8 bg-muted rounded" />
        </div>
        <div className="border-t border-border" />
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-muted" />
          <div className="h-4 w-10 bg-muted rounded" />
          <div className="h-4 flex-1 bg-muted rounded" />
          <div className="h-5 w-8 bg-muted rounded" />
        </div>
      </div>
      <div className="px-4 pb-3 flex justify-center">
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    </div>
  );
}
