"use client";

import { useQuery } from "@tanstack/react-query";

interface GameInfo {
  id: string;
  date: string;
  status: string;
  statusDetail: string;
  homeTeam: { name: string; abbreviation: string; logo: string; score: string; record: string };
  awayTeam: { name: string; abbreviation: string; logo: string; score: string; record: string };
}

export function GameJsonLd({ sport, eventId }: { sport: string; eventId: string }) {
  const { data: game } = useQuery({
    queryKey: ["game-jsonld", sport, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/public/scoreboard?league=${sport}`);
      const d = await res.json();
      const g = (d.games ?? []).find((g: GameInfo) => g.id === eventId);
      return (g as GameInfo) ?? null;
    },
  });

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
      // Safe: content is from our own ESPN API proxy, not user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
