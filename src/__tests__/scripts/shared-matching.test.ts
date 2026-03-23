import { describe, it, expect } from "vitest";
import {
  matchesSpecialties,
  type Specialties,
  type RawArticleBase,
} from "../../../scripts/shared-matching";

function makeArticle(
  title: string,
  content: string,
  category: string | null = null
): RawArticleBase {
  return { id: "test-1", source: "test", title, content, category };
}

function makeSpec(
  sports: string[] = [],
  leagues: string[] = [],
  teams: string[] = []
): Specialties {
  return { sports, leagues, teams };
}

describe("matchesSpecialties", () => {
  describe("全能寫手（無專長設定）", () => {
    it("匹配任何文章", () => {
      const article = makeArticle("NBA 季後賽", "Lakers vs Celtics");
      expect(matchesSpecialties(article, makeSpec())).toBe(true);
    });

    it("匹配空文章", () => {
      const article = makeArticle("", "");
      expect(matchesSpecialties(article, makeSpec())).toBe(true);
    });
  });

  describe("球種匹配", () => {
    it("籃球寫手匹配 NBA 文章", () => {
      const article = makeArticle("NBA 季後賽精彩對決", "Lakers 擊敗 Celtics");
      expect(matchesSpecialties(article, makeSpec(["籃球"]))).toBe(true);
    });

    it("棒球寫手不匹配 NBA 文章", () => {
      const article = makeArticle("NBA 季後賽精彩對決", "Lakers 擊敗 Celtics");
      expect(matchesSpecialties(article, makeSpec(["棒球"]))).toBe(false);
    });

    it("棒球寫手匹配 MLB 文章", () => {
      const article = makeArticle("MLB 大聯盟戰報", "道奇隊 baseball 精彩表現");
      expect(matchesSpecialties(article, makeSpec(["棒球"]))).toBe(true);
    });

    it("足球寫手匹配英超文章", () => {
      const article = makeArticle("英超聯賽報導", "Premier League soccer 精彩比賽");
      expect(matchesSpecialties(article, makeSpec(["足球"]))).toBe(true);
    });

    it("多球種寫手匹配任一球種", () => {
      const article = makeArticle("NBA 精彩對決", "basketball 籃球");
      expect(matchesSpecialties(article, makeSpec(["棒球", "籃球"]))).toBe(true);
    });

    it("綜合寫手匹配任何文章", () => {
      const article = makeArticle("隨意標題", "隨意內容");
      expect(matchesSpecialties(article, makeSpec(["綜合"]))).toBe(true);
    });
  });

  describe("聯盟匹配", () => {
    it("NBA 聯盟匹配含 NBA 的文章", () => {
      const article = makeArticle("今日 NBA 賽事", "精彩對決");
      expect(matchesSpecialties(article, makeSpec([], ["NBA"]))).toBe(true);
    });

    it("英超聯盟匹配含 Premier League 的文章", () => {
      const article = makeArticle("Premier League 比賽", "英超精彩");
      expect(matchesSpecialties(article, makeSpec([], ["英超"]))).toBe(true);
    });

    it("MLB 聯盟匹配含大聯盟的文章", () => {
      const article = makeArticle("大聯盟戰報", "今日比賽結果");
      expect(matchesSpecialties(article, makeSpec([], ["MLB"]))).toBe(true);
    });

    it("不匹配無關聯盟", () => {
      const article = makeArticle("NBA 新聞", "籃球比賽");
      expect(matchesSpecialties(article, makeSpec([], ["MLB"]))).toBe(false);
    });
  });

  describe("球隊匹配", () => {
    it("匹配包含指定球隊名的文章", () => {
      const article = makeArticle("Lakers 大勝", "湖人隊精彩表現");
      expect(matchesSpecialties(article, makeSpec([], [], ["Lakers"]))).toBe(true);
    });

    it("不區分大小寫匹配", () => {
      const article = makeArticle("lakers 獲勝", "比賽結果");
      expect(matchesSpecialties(article, makeSpec([], [], ["Lakers"]))).toBe(true);
    });

    it("不匹配無關球隊", () => {
      const article = makeArticle("Warriors 獲勝", "勇士精彩表現");
      expect(matchesSpecialties(article, makeSpec([], [], ["Lakers"]))).toBe(false);
    });
  });

  describe("加權分類", () => {
    it("混合文章取主分類 — NBA 關鍵字更多時歸為籃球", () => {
      const article = makeArticle(
        "NBA 與 MLB 新聞",
        "NBA basketball 籃球 NBA 今日 MLB 消息"
      );
      // NBA 出現 3 次, basketball 1 次, 籃球 1 次 → 籃球 = 5
      // MLB 出現 2 次 → 棒球 = 2
      // 主分類是籃球
      expect(matchesSpecialties(article, makeSpec(["籃球"]))).toBe(true);
      expect(matchesSpecialties(article, makeSpec(["棒球"]))).toBe(false);
    });

    it("空文章不匹配非全能寫手", () => {
      const article = makeArticle("", "");
      expect(matchesSpecialties(article, makeSpec(["籃球"]))).toBe(false);
    });
  });

  describe("複合條件", () => {
    it("球種不匹配但球隊匹配時仍通過", () => {
      const article = makeArticle("Lakers 新聞", "湖人隊消息");
      // 沒有 NBA/basketball 關鍵字，球種匹配失敗
      // 但 teams 包含 Lakers，球隊匹配通過
      expect(matchesSpecialties(article, makeSpec(["棒球"], [], ["Lakers"]))).toBe(true);
    });

    it("球種不匹配但聯盟匹配時仍通過", () => {
      const article = makeArticle("今日 NBA 新聞", "賽事報導");
      expect(matchesSpecialties(article, makeSpec(["棒球"], ["NBA"]))).toBe(true);
    });
  });
});
