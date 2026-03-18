import { Suspense } from "react";
import AnalyticsClient from "./AnalyticsClient";

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">數據分析</h1>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <AnalyticsClient />
    </Suspense>
  );
}
