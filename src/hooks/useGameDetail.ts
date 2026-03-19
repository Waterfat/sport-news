import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type {
  GameInfo,
  BoxScoreData,
  Play,
  TeamLeadersData,
  WinProbPoint,
  SeasonSeriesData,
  PickCenterItem,
  TeamInjuriesData,
} from "@/types/game";

function getGameApiBase(isMember: boolean) {
  return isMember ? "/api/member/game" : "/api/public/game";
}

export function useGameDetail(sport: string, eventId: string, tab: string) {
  const { data: session } = useSession();
  const isMember = !!session?.user;
  const apiBase = getGameApiBase(isMember);

  // Fetch game info from scoreboard
  const { data: game = null, isLoading } = useQuery({
    queryKey: ["game-info", sport, eventId],
    queryFn: async () => {
      const res = await fetch(`/api/public/scoreboard?league=${sport}`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      const g = (d.games ?? []).find((g: GameInfo) => g.id === eventId);
      return (g as GameInfo) ?? null;
    },
  });

  // Fetch leaders on mount
  const { data: leaders = [] } = useQuery({
    queryKey: ["game-leaders", eventId, sport, apiBase],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=leaders`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.leaders ?? []) as TeamLeadersData[];
    },
  });

  // Fetch win probability on summary tab
  const { data: winProb = [] } = useQuery({
    queryKey: ["game-winprob", eventId, sport, apiBase],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=winprobability`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.winprobability ?? []) as WinProbPoint[];
    },
    enabled: tab === "summary",
  });

  // Fetch season series on summary tab
  const { data: seasonSeries = null } = useQuery({
    queryKey: ["game-seasonseries", eventId, sport, apiBase],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=seasonseries`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.seasonseries ?? null) as SeasonSeriesData | null;
    },
    enabled: tab === "summary",
  });

  // Fetch pick center on summary tab
  const { data: pickCenter = [] } = useQuery({
    queryKey: ["game-pickcenter", eventId, sport, apiBase],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=pickcenter`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.pickcenter ?? []) as PickCenterItem[];
    },
    enabled: tab === "summary",
  });

  // Fetch PBP when tab switches
  const { data: pbpData } = useQuery({
    queryKey: ["game-pbp", eventId, sport, apiBase],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=plays`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return { plays: (d.plays ?? []) as Play[], totalCount: (d.totalCount ?? 0) as number };
    },
    enabled: tab === "pbp",
  });

  // Fetch boxscore when tab switches
  const { data: boxScore = null } = useQuery({
    queryKey: ["game-boxscore", eventId, sport, apiBase],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=boxscore`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.boxscore ?? null) as BoxScoreData | null;
    },
    enabled: tab === "boxscore",
  });

  // Fetch injuries when tab switches
  const { data: injuries = [] } = useQuery({
    queryKey: ["game-injuries", eventId, sport, apiBase],
    queryFn: async () => {
      const res = await fetch(`${apiBase}?eventId=${eventId}&league=${sport}&type=injuries`);
      if (!res.ok) throw new Error("fetch failed");
      const d = await res.json();
      return (d.injuries ?? []) as TeamInjuriesData[];
    },
    enabled: tab === "injuries",
  });

  return {
    game,
    isLoading,
    isMember,
    leaders,
    winProb,
    seasonSeries,
    pickCenter,
    plays: pbpData?.plays ?? [],
    totalPlays: pbpData?.totalCount ?? 0,
    boxScore,
    injuries,
  };
}
