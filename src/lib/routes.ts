/**
 * 型別安全的路由 helper — 全站 Link href 必須使用這些函式，禁止手動拼接
 */

export function teamUrl(sport: string, teamId: string) {
  return `/team/${sport}/${teamId}`;
}

export function playerUrl(sport: string, playerId: string) {
  return `/player/${sport}/${playerId}`;
}

export function gameUrl(league: string, eventId: string) {
  return `/game/${league}/${eventId}`;
}

export function newsUrl(slugOrId: string) {
  return `/news/${slugOrId}`;
}

export function categoryUrl(slug: string) {
  return `/category/${slug}`;
}

export function standingsUrl(sport: string) {
  return `/standings/${sport}`;
}

export function writerUrl(writerId: string) {
  return `/writer/${writerId}`;
}

/** 產生完整 URL（含 domain），用於 SEO/RSS/社群分享 */
export function absoluteNewsUrl(baseUrl: string, slugOrId: string) {
  return `${baseUrl}/news/${slugOrId}`;
}

export function absoluteCategoryUrl(baseUrl: string, slug: string) {
  return `${baseUrl}/category/${slug}`;
}

export function absoluteWriterUrl(baseUrl: string, writerId: string) {
  return `${baseUrl}/writer/${writerId}`;
}

/** SEO 友善的球隊 slug URL（如 /team/nba/lakers），會被 redirect 到 canonical /team/nba/:id */
export function teamSlugUrl(sport: string, slug: string) {
  return `/team/${sport}/${slug}`;
}

/** 產生完整球隊 URL（含 domain），用於 sitemap/SEO */
export function absoluteTeamUrl(
  baseUrl: string,
  sport: string,
  teamId: string
) {
  return `${baseUrl.replace(/\/$/, "")}/team/${sport}/${teamId}`;
}

/** 產生完整球員 URL（含 domain），用於 sitemap/SEO */
export function absolutePlayerUrl(
  baseUrl: string,
  sport: string,
  playerId: string
) {
  return `${baseUrl.replace(/\/$/, "")}/player/${sport}/${playerId}`;
}

/** 產生完整比賽 URL（含 domain），用於 sitemap/SEO */
export function absoluteGameUrl(
  baseUrl: string,
  sport: string,
  gameId: string
) {
  return `${baseUrl.replace(/\/$/, "")}/game/${sport}/${gameId}`;
}
