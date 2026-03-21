import { Skeleton } from "@/components/ui/skeleton";

export function ArticleCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Skeleton className="w-full h-40" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export function ArticleCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ArticleCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function QuickNewsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-lg border border-border bg-card divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-2.5">
          <Skeleton className="h-4 flex-1 mr-3" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}
