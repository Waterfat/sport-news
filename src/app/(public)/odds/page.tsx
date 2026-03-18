import { Suspense } from "react";
import type { Metadata } from "next";
import { OddsClient } from "@/components/odds/OddsClient";

export const metadata: Metadata = {
  title: "賠率中心",
  description: "最新體育賽事賠率分析",
};

export default function OddsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">賠率中心</h1>
      <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
        <OddsClient />
      </Suspense>
    </div>
  );
}
