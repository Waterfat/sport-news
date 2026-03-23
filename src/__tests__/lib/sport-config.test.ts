import { describe, it, expect } from "vitest";
import { SPORTS, type SportKey } from "@/lib/sport-config";

describe("SPORTS 常數", () => {
  it("包含四個球種 key", () => {
    const keys = Object.keys(SPORTS);
    expect(keys).toHaveLength(4);
    expect(keys).toContain("basketball");
    expect(keys).toContain("baseball");
    expect(keys).toContain("football");
    expect(keys).toContain("soccer");
  });

  it("basketball 預設 enabled = true", () => {
    expect(SPORTS.basketball.enabled).toBe(true);
  });

  it("baseball 預設 enabled = false", () => {
    expect(SPORTS.baseball.enabled).toBe(false);
  });

  it("football 預設 enabled = false", () => {
    expect(SPORTS.football.enabled).toBe(false);
  });

  it("soccer 預設 enabled = false", () => {
    expect(SPORTS.soccer.enabled).toBe(false);
  });

  it("每個球種都有 label 欄位", () => {
    for (const [, config] of Object.entries(SPORTS)) {
      expect(typeof config.label).toBe("string");
      expect(config.label.length).toBeGreaterThan(0);
    }
  });

  it("每個球種都有 keywords 非空陣列", () => {
    for (const [, config] of Object.entries(SPORTS)) {
      expect(Array.isArray(config.keywords)).toBe(true);
      expect(config.keywords.length).toBeGreaterThan(0);
    }
  });

  it("basketball label 為 籃球", () => {
    expect(SPORTS.basketball.label).toBe("籃球");
  });

  it("basketball keywords 包含 NBA", () => {
    expect(SPORTS.basketball.keywords).toContain("NBA");
  });

  it("baseball keywords 包含 MLB", () => {
    expect(SPORTS.baseball.keywords).toContain("MLB");
  });

  it("football keywords 包含 NFL", () => {
    expect(SPORTS.football.keywords).toContain("NFL");
  });

  it("soccer keywords 包含 FIFA", () => {
    expect(SPORTS.soccer.keywords).toContain("FIFA");
  });
});

describe("SportKey 型別", () => {
  it("合法 key 可以指派給 SportKey 型別", () => {
    const validKeys: SportKey[] = ["basketball", "baseball", "football", "soccer"];
    expect(validKeys).toHaveLength(4);
  });

  it("SPORTS 的 key 與 SportKey 完全對應", () => {
    const sportsKeys = Object.keys(SPORTS) as SportKey[];
    const expectedKeys: SportKey[] = ["basketball", "baseball", "football", "soccer"];
    expect(sportsKeys.sort()).toEqual(expectedKeys.sort());
  });
});
