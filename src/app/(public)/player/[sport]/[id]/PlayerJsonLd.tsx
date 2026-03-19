"use client";

import { useQuery } from "@tanstack/react-query";

interface PlayerInfo {
  id: string;
  displayName: string;
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logo: string;
  };
}

export function PlayerJsonLd({ sport, playerId }: { sport: string; playerId: string }) {
  const { data: player } = useQuery({
    queryKey: ["player-jsonld", sport, playerId],
    queryFn: async () => {
      const res = await fetch(`/api/public/player?sport=${sport}&id=${playerId}`);
      const d = await res.json();
      return (d.player as PlayerInfo) ?? null;
    },
  });

  if (!player) return null;

  // Content sourced from our ESPN API proxy, trusted server data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.displayName,
    memberOf: {
      "@type": "SportsTeam",
      name: player.team?.displayName || "Unknown",
    },
  };

  return (
    <script
      type="application/ld+json"
      // Safe: content is from our own ESPN API proxy, not user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
