// ESPN API 通用型別定義

// ---------- Scoreboard ----------

export interface ESPNScoreboardResponse {
  events: ESPNEvent[];
  leagues?: ESPNLeague[];
}

export interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    type: {
      name: string;
      shortDetail: string;
      completed: boolean;
    };
  };
  competitions: ESPNCompetition[];
}

export interface ESPNCompetition {
  id: string;
  competitors: ESPNCompetitor[];
  odds?: ESPNOdds[];
}

export interface ESPNCompetitor {
  homeAway: "home" | "away";
  score: string;
  team: {
    id: string;
    name: string;
    displayName: string;
    abbreviation: string;
    logo: string;
    color?: string;
  };
  records?: Array<{ summary: string }>;
}

export interface ESPNLeague {
  id: string;
  name: string;
  abbreviation: string;
}

// ---------- Odds ----------

export interface ESPNOdds {
  provider: {
    id: string;
    name: string;
  };
  details: string;
  overUnder: number;
  spread: number;
  overOdds: number;
  underOdds: number;
  awayTeamOdds: ESPNTeamOdds;
  homeTeamOdds: ESPNTeamOdds;
}

export interface ESPNTeamOdds {
  moneyLine: number;
  spreadOdds: number;
  favorite: boolean;
  underdog: boolean;
}

// ---------- Play-by-Play ----------

export interface ESPNPlay {
  id: string;
  sequenceNumber: string;
  text: string;
  type: {
    id: string;
    text: string;
  };
  period: {
    number: number;
    displayValue: string;
  };
  clock: {
    displayValue: string;
  };
  team?: {
    id: string;
    displayName: string;
  };
  scoringPlay: boolean;
  homeScore: string;
  awayScore: string;
  wallclock?: string;
}

export interface ESPNPlayByPlayResponse {
  items: ESPNPlay[];
}

// ---------- Standings ----------

export interface ESPNStandingsResponse {
  children: ESPNStandingsGroup[];
}

export interface ESPNStandingsGroup {
  name: string;
  abbreviation?: string;
  standings: {
    entries: ESPNStandingsEntry[];
  };
}

export interface ESPNStandingsEntry {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logos: Array<{ href: string }>;
  };
  stats: Array<{
    name: string;
    displayName: string;
    value: number;
    displayValue: string;
  }>;
}

// ---------- Win Probability ----------

export interface ESPNProbability {
  sequenceNumber: string;
  homeWinPercentage: number;
  playId: string;
  secondsLeft: number;
}

export interface ESPNProbabilitiesResponse {
  items: ESPNProbability[];
}

// ---------- Team ----------

export interface ESPNTeamResponse {
  team: {
    id: string;
    displayName: string;
    abbreviation: string;
    logos: Array<{ href: string }>;
    color: string;
    alternateColor: string;
    record: {
      items: Array<{
        summary: string;
        type: string;
      }>;
    };
    nextEvent?: ESPNEvent[];
    standingSummary?: string;
  };
}

// ---------- Player ----------

export interface ESPNPlayerResponse {
  athlete: {
    id: string;
    displayName: string;
    jersey: string;
    position: { abbreviation: string; displayName: string };
    team: {
      id: string;
      displayName: string;
      abbreviation: string;
      logos: Array<{ href: string }>;
    };
    headshot: { href: string };
    statistics?: Array<{
      name: string;
      type: string;
      categories: Array<{
        name: string;
        displayName: string;
        stats: Array<{
          name: string;
          displayName: string;
          value: number;
          displayValue: string;
        }>;
      }>;
    }>;
  };
}

// ---------- Futures ----------

export interface ESPNFuture {
  id: string;
  name: string;
  entries: Array<{
    athlete?: {
      id: string;
      displayName: string;
      team: { id: string; displayName: string };
    };
    team?: {
      id: string;
      displayName: string;
      logos: Array<{ href: string }>;
    };
    value: string;
  }>;
}

export interface ESPNFuturesResponse {
  futures: ESPNFuture[];
}
