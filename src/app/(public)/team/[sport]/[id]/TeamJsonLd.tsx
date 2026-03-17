"use client";

import { useEffect, useState } from "react";
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
  const [team, setTeam] = useState<TeamInfo | null>(null);

  useEffect(() => {
    fetch(`/api/public/team?sport=${sport}&id=${teamId}`)
      .then((r) => r.json())
      .then((d) => setTeam(d.team ?? null))
      .catch(() => {});
  }, [sport, teamId]);

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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
