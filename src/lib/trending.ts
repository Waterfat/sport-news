/**
 * 熱門趨勢分析模組
 *
 * 從 raw_articles 的標題與內容中，以文字頻率分析方式提取：
 * - 熱門關鍵字（人名、隊名、事件名）
 * - 熱門球員
 * - 熱門賽事 / 事件
 * - 按分類統計數量
 */

import { RawArticle } from "@/types/database";

// ---------------------------------------------------------------------------
// 預定義關鍵字清單
// ---------------------------------------------------------------------------

/** NBA 球員 */
const NBA_PLAYERS: string[] = [
  // 現役球星
  "LeBron James", "Stephen Curry", "Kevin Durant", "Giannis Antetokounmpo",
  "Luka Doncic", "Nikola Jokic", "Joel Embiid", "Jayson Tatum",
  "Jimmy Butler", "Anthony Davis", "Damian Lillard", "Devin Booker",
  "Ja Morant", "Donovan Mitchell", "Kyrie Irving", "Paul George",
  "Kawhi Leonard", "Anthony Edwards", "Shai Gilgeous-Alexander",
  "Trae Young", "Zion Williamson", "Bam Adebayo", "De'Aaron Fox",
  "Tyrese Haliburton", "Lauri Markkanen", "Victor Wembanyama",
  "Chet Holmgren", "Paolo Banchero", "Jalen Brunson", "Domantas Sabonis",
  // 中文名
  "乔丹", "乔治", "詹姆斯", "柯瑞", "乔丹", "杜兰特",
  "乔丹", "约基奇", "乔治", "恩比德", "塔图姆",
  "字母哥", "东契奇", "唐西奇", "巴乔", "戴维斯",
  "布朗尼", "厄乔洛", "吉爾伯特",
  // 繁體中文名
  "乔丹", "詹姆斯", "乔治", "杜蘭特", "乔丹", "柯瑞",
  "乔丹", "乔基奇", "恩乔德", "塔圖姆", "巴乔",
  "乔丹", "里拉德", "厄文", "乔治", "里朗", "巴乔",
  "柯瑞", "乔丹", "哈乔登", "乔佛", "利拉德",
  "乔丹", "勇乔", "乔丹", "乔乔", "乔乔", "乔乔",
  "大谷翔平", "鈴木一朗",
  "詹皇", "柯瑞", "杜蘭特", "乔基奇", "乔比德",
  "西亞乔姆", "乔奇", "乔德爾", "乔敦", "乔奇",
  "文乔雅馬", "布乔尼", "泰坦",
  // MLB
  "Shohei Ohtani", "Mike Trout", "Mookie Betts", "Aaron Judge",
  "Freddie Freeman", "Juan Soto", "Ronald Acuna Jr", "Corey Seager",
  "Manny Machado", "Bryce Harper", "Fernando Tatis Jr",
  // MLB 中文
  "大谷翔平", "乔特勞", "貝茲", "乔吉", "乔里曼",
  "索托", "乔古尼亞", "乔格", "乔查多", "乔柏",
  // 足球
  "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappe", "Erling Haaland",
  "Vinicius Junior", "Mohamed Salah", "Kevin De Bruyne", "Jude Bellingham",
  "Bukayo Saka", "Harry Kane", "Neymar", "Robert Lewandowski",
  // 足球 中文
  "梅西", "C羅", "乔巴佩", "哈蘭德", "乔乔", "乔乔",
  "乔拉赫", "乔布魯因", "貝林漢姆", "乔卡", "凱恩", "乔馬爾",
  // 網球
  "Novak Djokovic", "Carlos Alcaraz", "Jannik Sinner", "Daniil Medvedev",
  "Alexander Zverev", "Iga Swiatek", "Aryna Sabalenka", "Coco Gauff",
  // 中華職棒 / 台灣球員
  "林昀儒", "戴資穎", "郭婞淳", "王柏融", "林子偉",
  "陳偉殷", "王建民", "曾仁和", "張育成", "林哲瑄",
  "陳金鋒", "郭泓志", "潘威倫", "高國輝", "林智勝",
  "彭政閔", "周思齊", "陳禹勳", "吳昇桓",
];

/** 球隊名稱 */
const TEAMS: string[] = [
  // NBA
  "Lakers", "Celtics", "Warriors", "Nuggets", "76ers", "Sixers",
  "Bucks", "Heat", "Suns", "Mavericks", "Clippers", "Knicks",
  "Nets", "Bulls", "Cavaliers", "Grizzlies", "Timberwolves",
  "Kings", "Pelicans", "Hawks", "Thunder", "Pacers", "Raptors",
  "Trail Blazers", "Spurs", "Magic", "Hornets", "Wizards",
  "Pistons", "Rockets",
  // NBA 中文
  "湖人", "塞爾提克", "勇士", "金塊", "76人",
  "公鹿", "熱火", "太陽", "獨行俠", "小牛",
  "快艇", "尼克", "籃網", "公牛", "騎士",
  "灰熊", "灰狼", "國王", "鵜鶘", "老鷹",
  "雷霆", "乔溜馬", "暴龍", "拓荒者", "馬刺",
  "魔術", "黃蜂", "巫師", "活塞", "火箭",
  // MLB
  "Yankees", "Dodgers", "Red Sox", "Cubs", "Astros",
  "Braves", "Mets", "Phillies", "Padres", "Rangers",
  "Angels", "Mariners", "Giants", "Cardinals", "Twins",
  // MLB 中文
  "洋基", "道奇", "紅襪", "小熊", "太空人",
  "勇士隊", "大都會", "費城人", "教士", "遊騎兵",
  "天使", "水手", "巨人", "紅雀", "雙城",
  // 足球
  "Real Madrid", "Barcelona", "Manchester United", "Manchester City",
  "Liverpool", "Arsenal", "Chelsea", "Bayern Munich", "PSG",
  "Paris Saint-Germain", "Juventus", "Inter Milan", "AC Milan",
  "Borussia Dortmund", "Atletico Madrid", "Tottenham",
  // 足球 中文
  "皇馬", "巴薩", "巴塞隆納", "曼聯", "曼城",
  "利物浦", "阿森納", "兵工廠", "切爾西", "拜仁",
  "巴黎聖日耳曼", "尤文", "國際米蘭", "AC米蘭",
  "多特蒙德", "馬競", "熱刺",
  // 中華職棒
  "統一獅", "兄弟象", "中信兄弟", "Lamigo桃猿", "樂天桃猿",
  "富邦悍將", "味全龍", "台鋼雄鷹",
];

/** 賽事 / 事件 */
const EVENTS: string[] = [
  // NBA
  "NBA", "NBA Finals", "All-Star", "Playoffs", "Draft",
  "NBA季後賽", "總冠軍", "明星賽", "選秀", "交易",
  "NBA總冠軍賽", "例行賽", "季後賽", "附加賽",
  // MLB
  "MLB", "World Series", "Spring Training", "Home Run Derby",
  "世界大賽", "春訓", "全壘打大賽",
  // 足球
  "Champions League", "Europa League", "World Cup", "Euro",
  "Premier League", "La Liga", "Bundesliga", "Serie A", "Ligue 1",
  "Copa America", "歐冠", "歐聯", "世界盃", "歐洲杯",
  "英超", "西甲", "德甲", "義甲", "法甲", "美洲盃",
  // 網球
  "Australian Open", "Roland Garros", "French Open", "Wimbledon",
  "US Open", "ATP", "WTA",
  "澳網", "法網", "溫網", "美網",
  // 奧運
  "Olympics", "Olympic Games", "奧運", "奧運會", "冬奧",
  // 中華職棒
  "中華職棒", "CPBL", "台灣大賽", "季冠軍",
  // 其他
  "F1", "Formula 1", "一級方程式",
  "UFC", "Super Bowl", "超級盃",
  "轉會", "傷病", "受傷", "禁賽", "退休",
  "破紀錄", "三連霸", "MVP", "FMVP",
];

// ---------------------------------------------------------------------------
// 停用詞（不計入通用關鍵字）
// ---------------------------------------------------------------------------
const STOP_WORDS = new Set([
  // 英文
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "out",
  "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "each", "every",
  "both", "few", "more", "most", "other", "some", "such", "no", "nor",
  "not", "only", "own", "same", "so", "than", "too", "very", "just",
  "because", "but", "and", "or", "if", "while", "about", "up", "it",
  "its", "he", "she", "they", "them", "his", "her", "this", "that",
  "these", "those", "i", "we", "you", "my", "your", "their", "our",
  "me", "him", "us", "what", "which", "who", "whom", "whose",
  "also", "said", "says", "new", "first", "last", "get", "got",
  "one", "two", "three", "four", "five", "year", "years", "time",
  "game", "games", "season", "team", "teams", "player", "players",
  "via", "per", "vs", "like", "s", "t", "don", "re", "ve", "ll",
  "amp", "didn", "doesn", "won",
  // 中文常見停用詞
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人",
  "都", "一", "一個", "上", "也", "很", "到", "說", "要", "去",
  "你", "會", "著", "沒有", "看", "好", "自己", "這", "他", "她",
  "來", "們", "為", "中", "對", "與", "被", "從", "那", "但",
  "又", "把", "能", "將", "已", "已經", "而", "還", "以", "之",
  "讓", "等", "可以", "下", "過", "用", "後", "想", "出", "做",
  "只", "更", "最", "因為", "所以", "如果", "或", "地", "得",
  "個", "年", "月", "日", "時", "分", "秒", "今天", "昨天",
  "明天", "現在", "裡", "點", "次", "多", "大", "小", "長",
  "比賽", "球員", "球隊", "表示", "認為", "進行", "報導",
  "新聞", "記者", "消息", "根據", "透過", "相關", "目前",
  "今日", "據", "稱", "前", "起", "每", "場",
]);

// ---------------------------------------------------------------------------
// 分析結果型別
// ---------------------------------------------------------------------------

export interface TrendingKeyword {
  keyword: string;
  count: number;
}

export interface TrendingResult {
  keywords: TrendingKeyword[];
  players: TrendingKeyword[];
  events: TrendingKeyword[];
  categoryStats: { category: string; count: number }[];
  totalArticles: number;
  analysisTimeRange: { from: string; to: string };
}

// ---------------------------------------------------------------------------
// 工具函式
// ---------------------------------------------------------------------------

/** 在文字中計算某個關鍵字出現的次數（大小寫不敏感） */
function countOccurrences(text: string, keyword: string): number {
  if (!text || !keyword) return 0;
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = lowerText.indexOf(lowerKeyword, pos)) !== -1) {
    count++;
    pos += lowerKeyword.length;
  }
  return count;
}

/**
 * 從文字中提取有意義的 token（英文單字 >= 3 字元，中文雙字以上）。
 * 回傳一個 Map<string, number>，key 是 token，value 是出現次數。
 */
function extractTokens(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  if (!text) return freq;

  // 英文單字
  const englishWords = text.match(/[A-Za-z]{3,}/g) || [];
  for (const w of englishWords) {
    const lower = w.toLowerCase();
    if (STOP_WORDS.has(lower)) continue;
    freq.set(lower, (freq.get(lower) || 0) + 1);
  }

  // 中文字 — 用 bigram 方式取雙字詞
  const chineseChars = text.match(/[\u4e00-\u9fff]+/g) || [];
  for (const segment of chineseChars) {
    if (segment.length < 2) continue;
    for (let i = 0; i < segment.length - 1; i++) {
      const bigram = segment.slice(i, i + 2);
      if (STOP_WORDS.has(bigram)) continue;
      freq.set(bigram, (freq.get(bigram) || 0) + 1);
    }
  }

  return freq;
}

// ---------------------------------------------------------------------------
// 主要分析函式
// ---------------------------------------------------------------------------

export function analyzeTrending(articles: RawArticle[]): TrendingResult {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // ---- 1. 按分類統計 ----
  const categoryMap = new Map<string, number>();
  for (const a of articles) {
    const cat = a.category || "未分類";
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
  }
  const categoryStats = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  // ---- 2. 合併所有文字 ----
  const allText = articles
    .map((a) => `${a.title} ${a.title} ${a.content}`) // 標題權重 x2
    .join(" ");

  // ---- 3. 預定義清單匹配 ——球員 ----
  const playerFreq = new Map<string, number>();
  const uniquePlayers = [...new Set(NBA_PLAYERS)];
  for (const player of uniquePlayers) {
    const c = countOccurrences(allText, player);
    if (c > 0) {
      playerFreq.set(player, c);
    }
  }
  const players: TrendingKeyword[] = Array.from(playerFreq.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // ---- 4. 預定義清單匹配 ——隊名（合併到 keywords） ----
  const teamFreq = new Map<string, number>();
  for (const team of TEAMS) {
    const c = countOccurrences(allText, team);
    if (c > 0) {
      teamFreq.set(team, c);
    }
  }

  // ---- 5. 預定義清單匹配 ——賽事/事件 ----
  const eventFreq = new Map<string, number>();
  for (const event of EVENTS) {
    const c = countOccurrences(allText, event);
    if (c > 0) {
      eventFreq.set(event, c);
    }
  }
  const events: TrendingKeyword[] = Array.from(eventFreq.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // ---- 6. 通用高頻詞 ----
  const globalFreq = new Map<string, number>();

  // 先加入隊名
  for (const [k, v] of teamFreq) {
    globalFreq.set(k, (globalFreq.get(k) || 0) + v);
  }

  // 再從自由文字 token 中取出高頻詞
  const tokenFreq = extractTokens(allText);
  for (const [k, v] of tokenFreq) {
    if (v >= 2) {
      // 至少出現 2 次才納入
      globalFreq.set(k, (globalFreq.get(k) || 0) + v);
    }
  }

  const keywords: TrendingKeyword[] = Array.from(globalFreq.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50);

  return {
    keywords,
    players,
    events,
    categoryStats,
    totalArticles: articles.length,
    analysisTimeRange: {
      from: twentyFourHoursAgo.toISOString(),
      to: now.toISOString(),
    },
  };
}
