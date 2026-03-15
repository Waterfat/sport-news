// ESPN API 模組統一出口

export { espnFetch, CACHE_TTL, getSportPath, SPORT_PATHS } from "./client";
export type { ESPNApiError } from "./client";

export {
  fetchScoreboard,
  fetchScoreboardByLeague,
} from "./scoreboard";
export type { Game, TeamInfo, ScoreboardResponse, LeagueConfig } from "./scoreboard";

export { fetchPlayByPlay, fetchPlayByPlayPreview } from "./play-by-play";
export type { Play } from "./play-by-play";

export { fetchOdds, fetchOddsPreview } from "./odds";
export type { OddsLine } from "./odds";

export { fetchStandings } from "./standings";
export type { StandingsGroup, StandingsEntry } from "./standings";

export { fetchTeam, fetchTeamATS } from "./team";
export type { TeamDetail, TeamATS } from "./team";

export { fetchPlayer } from "./player";
export type { PlayerDetail, PlayerStatCategory } from "./player";
