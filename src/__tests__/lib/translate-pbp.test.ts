import { describe, it, expect } from "vitest";
import { translatePbpText } from "@/lib/espn/translate-pbp";
import { getTeamNameZh } from "@/lib/constants";

describe("translatePbpText", () => {
  it("翻譯三分球命中", () => {
    expect(translatePbpText("LeBron James makes three point jumper")).toContain("三分球命中");
    expect(translatePbpText("LeBron James makes three point jumper")).toContain("LeBron James");
  });

  it("翻譯罰球", () => {
    expect(translatePbpText("Stephen Curry makes free throw 1 of 2")).toContain("罰球命中");
  });

  it("翻譯籃板", () => {
    expect(translatePbpText("Defensive rebound by Anthony Davis")).toContain("防守籃板");
  });

  it("翻譯棒球事件", () => {
    expect(translatePbpText("Shohei Ohtani home run")).toContain("全壘打");
    expect(translatePbpText("Juan Soto strikeout")).toContain("三振");
  });

  it("翻譯足球事件", () => {
    expect(translatePbpText("Goal by Erling Haaland")).toContain("進球");
    expect(translatePbpText("Yellow card")).toContain("黃牌");
  });

  it("無匹配時保留原文", () => {
    const text = "Some unknown play description";
    expect(translatePbpText(text)).toBe(text);
  });
});

describe("getTeamNameZh", () => {
  it("NBA 隊名翻譯", () => {
    expect(getTeamNameZh("Los Angeles Lakers")).toBe("洛杉磯湖人");
    expect(getTeamNameZh("Boston Celtics")).toBe("波士頓塞爾提克");
  });

  it("MLB 隊名翻譯", () => {
    expect(getTeamNameZh("New York Yankees")).toBe("紐約洋基");
  });

  it("足球隊名翻譯", () => {
    expect(getTeamNameZh("Manchester United")).toBe("曼聯");
    expect(getTeamNameZh("Real Madrid")).toBe("皇家馬德里");
  });

  it("找不到時回傳原文", () => {
    expect(getTeamNameZh("Unknown Team FC")).toBe("Unknown Team FC");
  });
});
