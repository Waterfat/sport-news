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
