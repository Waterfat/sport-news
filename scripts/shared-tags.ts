/**
 * 共用標籤提取邏輯 — 從文章標題和內容中提取球隊名、聯盟名
 *
 * 供 local-rewriter.ts 和 backfill-tags.ts 使用
 */

/** 從文章標題和內容中提取標籤（球隊名、聯盟名） */
export function extractTagsFromContent(title: string, content: string): string[] {
  const text = `${title} ${content}`;
  const tags = new Set<string>();

  // 聯盟名稱
  const leagues = ["NBA", "MLB", "NFL", "NHL", "Premier League", "La Liga", "Serie A", "Bundesliga", "Ligue 1"];
  for (const league of leagues) {
    if (text.includes(league)) tags.add(league);
  }

  // 球隊簡短名稱 → 全名
  const teamShortNames: Record<string, string> = {
    // NBA
    "Hawks": "Atlanta Hawks", "Celtics": "Boston Celtics", "Nets": "Brooklyn Nets",
    "Hornets": "Charlotte Hornets", "Bulls": "Chicago Bulls", "Cavaliers": "Cleveland Cavaliers",
    "Cavs": "Cleveland Cavaliers", "Mavericks": "Dallas Mavericks", "Mavs": "Dallas Mavericks",
    "Nuggets": "Denver Nuggets", "Pistons": "Detroit Pistons", "Warriors": "Golden State Warriors",
    "Rockets": "Houston Rockets", "Pacers": "Indiana Pacers", "Clippers": "LA Clippers",
    "Lakers": "Los Angeles Lakers", "Grizzlies": "Memphis Grizzlies", "Heat": "Miami Heat",
    "Bucks": "Milwaukee Bucks", "Timberwolves": "Minnesota Timberwolves", "Wolves": "Minnesota Timberwolves",
    "Pelicans": "New Orleans Pelicans", "Knicks": "New York Knicks", "Thunder": "Oklahoma City Thunder",
    "Magic": "Orlando Magic", "76ers": "Philadelphia 76ers", "Sixers": "Philadelphia 76ers",
    "Suns": "Phoenix Suns", "Trail Blazers": "Portland Trail Blazers", "Blazers": "Portland Trail Blazers",
    "Kings": "Sacramento Kings", "Spurs": "San Antonio Spurs", "Raptors": "Toronto Raptors",
    "Jazz": "Utah Jazz", "Wizards": "Washington Wizards",
    // MLB
    "Diamondbacks": "Arizona Diamondbacks", "Braves": "Atlanta Braves", "Orioles": "Baltimore Orioles",
    "Red Sox": "Boston Red Sox", "Cubs": "Chicago Cubs", "White Sox": "Chicago White Sox",
    "Reds": "Cincinnati Reds", "Guardians": "Cleveland Guardians", "Rockies": "Colorado Rockies",
    "Tigers": "Detroit Tigers", "Astros": "Houston Astros", "Royals": "Kansas City Royals",
    "Angels": "Los Angeles Angels", "Dodgers": "Los Angeles Dodgers", "Marlins": "Miami Marlins",
    "Brewers": "Milwaukee Brewers", "Twins": "Minnesota Twins", "Mets": "New York Mets",
    "Yankees": "New York Yankees", "Athletics": "Oakland Athletics", "Phillies": "Philadelphia Phillies",
    "Pirates": "Pittsburgh Pirates", "Padres": "San Diego Padres", "Giants": "San Francisco Giants",
    "Mariners": "Seattle Mariners", "Cardinals": "St. Louis Cardinals", "Rays": "Tampa Bay Rays",
    "Rangers": "Texas Rangers", "Blue Jays": "Toronto Blue Jays", "Nationals": "Washington Nationals",
  };

  for (const [shortName, fullName] of Object.entries(teamShortNames)) {
    const regex = new RegExp(`\\b${shortName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
    if (regex.test(text)) tags.add(fullName);
  }

  return Array.from(tags);
}
