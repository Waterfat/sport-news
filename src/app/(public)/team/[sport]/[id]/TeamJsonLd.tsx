"use client";

import { useQuery } from "@tanstack/react-query";
import { SPORT_KEY_LABELS } from "@/lib/constants";

interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  record: string;
  standingSummary: string;
}

export function TeamJsonLd({ sport, teamId }: { sport: string; teamId: string }) {
  const { data: team } = useQuery({
    queryKey: ["team-jsonld", sport, teamId],
    queryFn: async () => {
      const res = await fetch(`/api/public/team?sport=${sport}&id=${teamId}`);
      const d = await res.json();
      return (d.team as TeamInfo) ?? null;
    },
  });

  if (!team) return null;

  const sportLabel = SPORT_KEY_LABELS[sport] || sport;

  // Content sourced from our ESPN API proxy, not user-generated input
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    sport: sportLabel,
  };

  return (
    <script
      type="application/ld+json"
      // Safe: content is from our own ESPN API proxy, not user input
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
