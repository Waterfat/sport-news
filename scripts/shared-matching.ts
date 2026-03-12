/**
 * Shared matching logic for sport/league keyword detection.
 * Canonical source — used by both local-rewriter.ts and plan-generator.ts.
 */

export interface Specialties {
  sports: string[];
  leagues: string[];
  teams: string[];
}

export interface RawArticleBase {
  id: string;
  source: string;
  title: string;
  content: string;
  category: string | null;
}

export const sportKeywords: Record<string, RegExp[]> = {
  籃球: [/\bnba\b/i, /\bbasketball\b/i, /籃球/, /\bncaam\b/i, /\bncaaw\b/i, /\bwnba\b/i, /\bmarch madness\b/i],
  棒球: [/\bmlb\b/i, /\bbaseball\b/i, /棒球/, /大聯盟/, /中職/, /日職/, /\bwbc\b/i, /\bcpbl\b/i, /\bnpb\b/i],
  美式足球: [/\bnfl\b/i, /美式足球/, /超級盃/, /\bsuper bowl\b/i, /\bfootball\b/i, /\btouchdown\b/i, /\bquarterback\b/i],
  足球: [/\bsoccer\b/i, /足球/, /英超/, /西甲/, /德甲/, /義甲/, /法甲/, /歐冠/, /世界盃/, /\bmls\b/i, /\bpremier league\b/i, /\bla liga\b/i, /\bbundesliga\b/i, /\bserie a\b/i, /\bligue 1\b/i, /\buchampions league\b/i],
  冰球: [/\bnhl\b/i, /\bhockey\b/i, /冰球/],
  網球: [/\btennis\b/i, /網球/, /大滿貫/],
  綜合: [],
};

export const leagueKeywords: Record<string, RegExp[]> = {
  NBA: [/\bnba\b/i],
  MLB: [/\bmlb\b/i, /大聯盟/],
  NFL: [/\bnfl\b/i],
  MLS: [/\bmls\b/i],
  英超: [/英超/, /\bpremier league\b/i, /\bepl\b/i],
  西甲: [/西甲/, /\bla liga\b/i],
  德甲: [/德甲/, /\bbundesliga\b/i],
  義甲: [/義甲/, /\bserie a\b/i],
  法甲: [/法甲/, /\bligue 1\b/i],
  歐冠: [/歐冠/, /\buchampions league\b/i, /\bucl\b/i],
  NHL: [/\bnhl\b/i],
  中職: [/中職/, /\bcpbl\b/i],
  日職: [/日職/, /\bnpb\b/i],
};

/**
 * 判斷文章是否匹配寫手專長
 */
export function matchesSpecialties(article: RawArticleBase, spec: Specialties): boolean {
  // 如果寫手沒有設定任何專長，視為全能
  if (
    spec.sports.length === 0 &&
    spec.leagues.length === 0 &&
    spec.teams.length === 0
  ) {
    return true;
  }

  const fullText = article.title + " " + article.content;

  // 加權計數：計算文章中各球種的關鍵字命中次數，判斷文章的主分類
  const articleSportCounts: Record<string, number> = {};
  for (const [sport, patterns] of Object.entries(sportKeywords)) {
    if (sport === "綜合") continue;
    let count = 0;
    for (const re of patterns) {
      const matches = fullText.match(new RegExp(re.source, re.flags + (re.flags.includes("g") ? "" : "g")));
      if (matches) count += matches.length;
    }
    if (count > 0) articleSportCounts[sport] = count;
  }

  // 找出命中次數最高的球種作為文章主分類
  const dominantSport = Object.entries(articleSportCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  for (const sport of spec.sports) {
    if (sport === "綜合") return true;
    // 文章主分類必須是寫手擅長的球種
    if (dominantSport === sport) return true;
  }

  // 匹配聯盟（使用 RegExp 精確比對）
  for (const league of spec.leagues) {
    const patterns = leagueKeywords[league] || [new RegExp(`\\b${league}\\b`, "i")];
    if (patterns.some((re) => re.test(fullText))) return true;
  }

  // 匹配球隊
  for (const team of spec.teams) {
    if (fullText.toLowerCase().includes(team.toLowerCase())) return true;
  }

  return false;
}
