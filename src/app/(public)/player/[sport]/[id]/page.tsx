import { PlayerDetailClient } from "@/components/player/PlayerDetailClient";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { sport, id } = await params;
  return { title: `${sport.toUpperCase()} 球員 #${id}` };
}

export default async function PlayerPage({ params }: Props) {
  const { sport, id } = await params;
  return <PlayerDetailClient sport={sport} playerId={id} />;
}
