import { Suspense } from "react";
import { StandingsClient } from "@/components/standings/StandingsClient";

interface Props {
  params: Promise<{ sport: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { sport } = await params;
  const labels: Record<string, string> = {
    nba: "NBA",
    mlb: "MLB",
    nfl: "NFL",
  };
  return {
    title: `${labels[sport] ?? sport.toUpperCase()} 排名`,
  };
}

export default async function StandingsPage({ params }: Props) {
  const { sport } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">
        {sport.toUpperCase()} 排名
      </h1>
      <Suspense fallback={<div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" /></div>}>
        <StandingsClient defaultLeague={sport} />
      </Suspense>
    </div>
  );
}
