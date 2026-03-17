/**
 * Play-by-Play 文字中文化
 * 將 ESPN PBP 文字中的事件描述翻譯為中文，球員名保持英文
 */

const PBP_PATTERNS: [RegExp, string][] = [
  // Basketball — scoring
  [/\bmakes\s+three\s+point/i, "三分球命中"],
  [/\bmakes\s+two\s+point/i, "兩分球命中"],
  [/\bmakes\s+free\s+throw/i, "罰球命中"],
  [/\bmisses\s+three\s+point/i, "三分球不進"],
  [/\bmisses\s+two\s+point/i, "兩分球不進"],
  [/\bmisses\s+free\s+throw/i, "罰球不進"],
  [/\bmakes\s+(\d+)-foot/i, "命中 $1 呎"],
  [/\bmisses\s+(\d+)-foot/i, "$1 呎投射不進"],
  [/\blayup\b/i, "上籃"],
  [/\bdunk\b/i, "灌籃"],
  [/\bjump\s*shot\b/i, "跳投"],
  [/\bpullup\s+jump\s*shot\b/i, "急停跳投"],
  [/\bfloating\s+jump\s*shot\b/i, "漂浮跳投"],
  [/\bdriving\s+layup\b/i, "切入上籃"],
  [/\balley\s*oop\b/i, "空中接力"],
  [/\bhook\s*shot\b/i, "勾射"],
  [/\bfinger\s*roll\b/i, "挑籃"],

  // Basketball — plays
  [/\boffensive\s+rebound\b/i, "進攻籃板"],
  [/\bdefensive\s+rebound\b/i, "防守籃板"],
  [/\brebound\b/i, "籃板"],
  [/\bassist\b/i, "助攻"],
  [/\bsteal\b/i, "抄截"],
  [/\bblock\b/i, "火鍋"],
  [/\bturnover\b/i, "失誤"],
  [/\btechnical\s+foul\b/i, "技術犯規"],
  [/\bflarant\s+foul\b/i, "惡意犯規"],
  [/\bpersonal\s+foul\b/i, "個人犯規"],
  [/\bshooting\s+foul\b/i, "投籃犯規"],
  [/\boffensive\s+foul\b/i, "進攻犯規"],
  [/\bfoul\b/i, "犯規"],
  [/\btimeout\b/i, "暫停"],
  [/\bjump\s+ball\b/i, "跳球"],
  [/\bviolation\b/i, "違例"],
  [/\bsubstitution\b/i, "換人"],
  [/\benters\s+the\s+game\b/i, "上場"],

  // Baseball — pitching/hitting
  [/\bstrikeout\b/i, "三振"],
  [/\bstruck\s+out\b/i, "被三振"],
  [/\bstrike\b/i, "好球"],
  [/\bball\b(?!\s*game)/i, "壞球"],
  [/\bsingle\b/i, "一壘安打"],
  [/\bdouble\b(?!\s+play)/i, "二壘安打"],
  [/\btriple\b/i, "三壘安打"],
  [/\bhome\s*run\b/i, "全壘打"],
  [/\bgrand\s+slam\b/i, "滿貫全壘打"],
  [/\bwalk\b/i, "四壞保送"],
  [/\bhit\s+by\s+pitch\b/i, "觸身球"],
  [/\bsacrifice\s+fly\b/i, "高飛犧牲打"],
  [/\bsacrifice\s+bunt\b/i, "犧牲觸擊"],
  [/\bgroundout\b/i, "滾地出局"],
  [/\bflyout\b/i, "飛球出局"],
  [/\blineout\b/i, "平飛球出局"],
  [/\bpopout\b/i, "內野高飛出局"],
  [/\bdouble\s+play\b/i, "雙殺"],
  [/\bstolen\s+base\b/i, "盜壘"],
  [/\bcaught\s+stealing\b/i, "盜壘失敗"],
  [/\bwild\s+pitch\b/i, "暴投"],
  [/\bpassed\s+ball\b/i, "捕逸"],
  [/\berror\b/i, "失誤"],
  [/\bfielder'?s?\s+choice\b/i, "野手選擇"],
  [/\bgrounds?\s+into/i, "打成滾地"],
  [/\bflies?\s+out/i, "飛球出局"],
  [/\blines?\s+out/i, "平飛出局"],
  [/\bpops?\s+out/i, "高飛出局"],

  // Soccer
  [/\bgoal\b/i, "進球"],
  [/\bpenalty\s+kick\b/i, "十二碼罰球"],
  [/\bpenalty\b/i, "罰球"],
  [/\byellow\s+card\b/i, "黃牌"],
  [/\bred\s+card\b/i, "紅牌"],
  [/\bown\s+goal\b/i, "烏龍球"],
  [/\boffside\b/i, "越位"],
  [/\bcorner\s+kick\b/i, "角球"],
  [/\bfree\s+kick\b/i, "自由球"],
  [/\bsubstitution\b/i, "換人"],

  // General
  [/\bend\s+of\s+(\w+)\s+quarter\b/i, "第$1節結束"],
  [/\bend\s+of\s+(\w+)\s+half\b/i, "$1半場結束"],
  [/\bend\s+of\s+(\w+)\s+period\b/i, "第$1節結束"],
  [/\bhalftime\b/i, "中場休息"],
  [/\bgame\s+over\b/i, "比賽結束"],
  [/\bovertime\b/i, "延長賽"],
];

/**
 * 翻譯 PBP 文字為中文
 * 保留球員名與數字，只翻譯事件描述
 */
export function translatePbpText(text: string): string {
  let result = text;
  for (const [pattern, replacement] of PBP_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}
