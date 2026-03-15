import { TeamDetailClient } from "@/components/team/TeamDetailClient";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { sport, id } = await params;
  return { title: `${sport.toUpperCase()} 球隊 #${id}` };
}

export default async function TeamPage({ params }: Props) {
  const { sport, id } = await params;
  return <TeamDetailClient sport={sport} teamId={id} />;
}
