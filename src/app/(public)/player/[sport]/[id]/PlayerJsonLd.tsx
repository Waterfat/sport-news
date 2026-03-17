"use client";

import { useEffect, useState } from "react";

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
  const [player, setPlayer] = useState<PlayerInfo | null>(null);

  useEffect(() => {
    fetch(`/api/public/player?sport=${sport}&id=${playerId}`)
      .then((r) => r.json())
      .then((d) => setPlayer(d.player ?? null))
      .catch(() => {});
  }, [sport, playerId]);

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
