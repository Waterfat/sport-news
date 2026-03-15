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
      <StandingsClient defaultLeague={sport} />
    </div>
  );
}
