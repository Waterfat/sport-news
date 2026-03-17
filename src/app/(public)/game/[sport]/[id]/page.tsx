import { Metadata } from "next";
import { GameDetailClient } from "@/components/game/GameDetailClient";
import { SPORT_KEY_LABELS, SITE_URL } from "@/lib/constants";
import { GameJsonLd } from "./GameJsonLd";

interface Props {
  params: Promise<{ sport: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sport, id } = await params;
  const sportLabel = SPORT_KEY_LABELS[sport] || sport.toUpperCase();
  const title = `${sportLabel} 比賽 #${id}`;
  const ogUrl = `${SITE_URL}/api/og?title=${encodeURIComponent(title)}&subtitle=${encodeURIComponent(sportLabel)}&type=game`;

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

export default async function GameDetailPage({ params }: Props) {
  const { sport, id } = await params;

  return (
    <>
      <GameJsonLd sport={sport} eventId={id} />
      <GameDetailClient sport={sport} eventId={id} />
    </>
  );
}
