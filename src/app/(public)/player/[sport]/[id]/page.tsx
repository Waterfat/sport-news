import { Metadata } from "next";
import { PlayerDetailClient } from "@/components/player/PlayerDetailClient";
import { SPORT_KEY_LABELS, SITE_URL } from "@/lib/constants";
import { PlayerJsonLd } from "./PlayerJsonLd";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, id } = await params;
  const sportLabel = SPORT_KEY_LABELS[sport] || sport.toUpperCase();
  const title = `${sportLabel} 球員 #${id}`;
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

export default async function PlayerPage({ params }: Props) {
  const { sport, id } = await params;
  return (
    <>
      <PlayerJsonLd sport={sport} playerId={id} />
      <PlayerDetailClient sport={sport} playerId={id} />
    </>
  );
}
