// ESPN Scoreboard API 封裝 + in-memory 快取 + 型別定義

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports";

// ---------- Types ----------

export interface TeamInfo {
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  record: string;
}

export interface Game {
  id: string;
  date: string;
  status: "in_progress" | "final" | "scheduled";
  statusDetail: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
}

export interface ScoreboardResponse {
  league: string;
  label: string;
  games: Game[];
}

export interface LeagueConfig {
  key: string;
  label: string;
  espn_endpoint: string;
}

// ---------- Cache ----------

interface CacheEntry {
  data: Game[];
  timestamp: number;
}

const CACHE_TTL_MS = 10_000;
const cache = new Map<string, CacheEntry>();

function getCached(key: string): Game[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: Game[]) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------- ESPN API ----------

function mapStatus(statusName: string): Game["status"] {
  if (statusName === "STATUS_FINAL") return "final";
  if (statusName === "STATUS_IN_PROGRESS") return "in_progress";
  return "scheduled";
}

function parseTeam(competitor: Record<string, unknown>): TeamInfo {
  const team = (competitor.team ?? {}) as Record<string, unknown>;
  const records = Array.isArray(competitor.records) ? competitor.records : [];
  const firstRecord = (records[0] ?? {}) as Record<string, unknown>;

  return {
    name: String(team.displayName ?? team.name ?? ""),
    abbreviation: String(team.abbreviation ?? ""),
    logo: String(team.logo ?? ""),
    score: String(competitor.score ?? "0"),
    record: String(firstRecord.summary ?? ""),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseGames(data: any): Game[] {
  const events: any[] = data?.events ?? [];
  return events.map((event) => {
    const competition = event.competitions?.[0] ?? {};
    const competitors: any[] = competition.competitors ?? [];
    const statusObj = event.status?.type ?? {};

    const home = competitors.find((c: any) => c.homeAway === "home") ?? competitors[0] ?? {};
    const away = competitors.find((c: any) => c.homeAway === "away") ?? competitors[1] ?? {};

    return {
      id: String(event.id ?? ""),
      date: String(event.date ?? ""),
      status: mapStatus(String(statusObj.name ?? "")),
      statusDetail: String(event.status?.type?.shortDetail ?? ""),
      homeTeam: parseTeam(home),
      awayTeam: parseTeam(away),
    };
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchScoreboard(espnEndpoint: string): Promise<Game[]> {
  const cached = getCached(espnEndpoint);
  if (cached) return cached;

  try {
    const url = `${ESPN_BASE}/${espnEndpoint}/scoreboard`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) {
      console.error(`ESPN API error: ${res.status} for ${espnEndpoint}`);
      return [];
    }
    const data = await res.json();
    const games = parseGames(data);
    setCache(espnEndpoint, games);
    return games;
  } catch (err) {
    console.error(`ESPN API fetch failed for ${espnEndpoint}:`, err);
    return [];
  }
}
