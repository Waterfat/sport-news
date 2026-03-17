"use client";

import { useEffect, useState } from "react";

interface GameInfo {
  id: string;
  date: string;
  status: string;
  statusDetail: string;
  homeTeam: { name: string; abbreviation: string; logo: string; score: string; record: string };
  awayTeam: { name: string; abbreviation: string; logo: string; score: string; record: string };
}

export function GameJsonLd({ sport, eventId }: { sport: string; eventId: string }) {
  const [game, setGame] = useState<GameInfo | null>(null);

  useEffect(() => {
    fetch(`/api/public/scoreboard?league=${sport}`)
      .then((r) => r.json())
      .then((d) => {
        const g = (d.games ?? []).find((g: GameInfo) => g.id === eventId);
        if (g) setGame(g);
      })
      .catch(() => {});
  }, [sport, eventId]);

  if (!game) return null;

  // JSON-LD content is derived from our own API (ESPN data), not user input
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${game.awayTeam.name} vs ${game.homeTeam.name}`,
    startDate: game.date,
    location: {
      "@type": "Place",
      name: game.statusDetail || "TBD",
    },
    competitor: [
      { "@type": "SportsTeam", name: game.awayTeam.name },
      { "@type": "SportsTeam", name: game.homeTeam.name },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
