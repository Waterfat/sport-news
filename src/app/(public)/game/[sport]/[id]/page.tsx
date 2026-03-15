import { GameDetailClient } from "@/components/game/GameDetailClient";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { sport, id } = await params;
  return {
    title: `${sport.toUpperCase()} 比賽 #${id}`,
  };
}

export default async function GameDetailPage({ params }: Props) {
  const { sport, id } = await params;

  return <GameDetailClient sport={sport} eventId={id} />;
}
