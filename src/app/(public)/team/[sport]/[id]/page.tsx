import { Metadata } from "next";
import { TeamDetailClient } from "@/components/team/TeamDetailClient";
import { SPORT_KEY_LABELS, SITE_URL } from "@/lib/constants";
import { TeamJsonLd } from "./TeamJsonLd";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, id } = await params;
  const sportLabel = SPORT_KEY_LABELS[sport] || sport.toUpperCase();
  const title = `${sportLabel} 球隊 #${id}`;
  const ogUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(sportLabel)}&type=team`;

  return {
    title,
    openGraph: {
      title,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [ogUrl],
    },
  };
}

export default async function TeamPage({ params }: Props) {
  const { sport, id } = await params;
  return (
    <>
      <TeamJsonLd sport={sport} teamId={id} />
      <TeamDetailClient sport={sport} teamId={id} />
    </>
  );
}
