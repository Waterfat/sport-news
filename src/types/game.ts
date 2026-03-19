// Game Detail 頁面用型別定義
// 部分型別從 espn/types.ts re-export，避免重複

export {
  type BoxScoreTeam,
  type BoxScorePlayer,
  type BoxScorePlayerGroup,
  type BoxScore as BoxScoreData,
  type GameLeader,
  type TeamLeaders as TeamLeadersData,
} from "@/lib/espn/types";

export interface Play {
  id: string;
  sequence: number;
  text: string;
  type: string;
  period: string;
  clock: string;
  teamName: string | null;
  scoringPlay: boolean;
  homeScore: string;
  awayScore: string;
}

export interface GameOdds {
  provider: string;
  details: string;
  overUnder: number;
  spread: number;
  homeMoneyLine: string;
  awayMoneyLine: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  score: string;
  record: string;
}

export interface GameInfo {
  id: string;
  date: string;
  status: "in_progress" | "final" | "scheduled";
  statusDetail: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  odds?: GameOdds;
}

export interface InjuryPlayer {
  name: string;
  status: string;
  description: string;
}

export interface TeamInjuriesData {
  team: string;
  teamLogo: string;
  players: InjuryPlayer[];
}

export interface WinProbPoint {
  homeWinPct: number;
  playId: string;
  secondsLeft: number;
}

export interface SeasonSeriesGame {
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  status: string;
}

export interface SeasonSeriesData {
  summary: string;
  seriesScore: string;
  games: SeasonSeriesGame[];
}

export interface PickCenterItem {
  provider: string;
  details: string;
  homeWinPct: number;
  awayWinPct: number;
}
