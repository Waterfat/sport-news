import { describe, expect, it } from "vitest";
import { TEAM_SLUG_MAP, getTeamIdBySlug } from "@/lib/constants";

describe("TEAM_SLUG_MAP", () => {
  it("contains NBA teams with correct ESPN IDs", () => {
    // Verified from ESPN API: https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams
    expect(TEAM_SLUG_MAP["nba:los-angeles-lakers"]).toBe("13");
    expect(TEAM_SLUG_MAP["nba:boston-celtics"]).toBe("2");
    expect(TEAM_SLUG_MAP["nba:golden-state-warriors"]).toBe("9");
    expect(TEAM_SLUG_MAP["nba:brooklyn-nets"]).toBe("17");
    expect(TEAM_SLUG_MAP["nba:oklahoma-city-thunder"]).toBe("25");
  });

  it("contains MLB teams with correct ESPN IDs", () => {
    // Verified from ESPN API: https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/teams
    expect(TEAM_SLUG_MAP["mlb:new-york-yankees"]).toBe("10");
    expect(TEAM_SLUG_MAP["mlb:los-angeles-dodgers"]).toBe("19");
    expect(TEAM_SLUG_MAP["mlb:boston-red-sox"]).toBe("2");
    expect(TEAM_SLUG_MAP["mlb:chicago-cubs"]).toBe("16");
    expect(TEAM_SLUG_MAP["mlb:athletics"]).toBe("11");
  });

  it("has 30 NBA teams", () => {
    const nbaCount = Object.keys(TEAM_SLUG_MAP).filter((k) =>
      k.startsWith("nba:")
    ).length;
    expect(nbaCount).toBe(30);
  });

  it("has 30 MLB teams", () => {
    const mlbCount = Object.keys(TEAM_SLUG_MAP).filter((k) =>
      k.startsWith("mlb:")
    ).length;
    expect(mlbCount).toBe(30);
  });

  it("all values are non-empty strings", () => {
    for (const [key, value] of Object.entries(TEAM_SLUG_MAP)) {
      expect(value, `${key} should have a non-empty value`).toBeTruthy();
      expect(typeof value).toBe("string");
    }
  });
});

describe("getTeamIdBySlug", () => {
  it("returns ESPN ID for valid NBA slug", () => {
    expect(getTeamIdBySlug("nba", "los-angeles-lakers")).toBe("13");
  });

  it("returns ESPN ID for valid MLB slug", () => {
    expect(getTeamIdBySlug("mlb", "new-york-yankees")).toBe("10");
  });

  it("returns null for invalid slug", () => {
    expect(getTeamIdBySlug("nba", "nonexistent-team")).toBeNull();
  });

  it("returns null for invalid sport", () => {
    expect(getTeamIdBySlug("cricket", "los-angeles-lakers")).toBeNull();
  });

  it("returns null for empty slug", () => {
    expect(getTeamIdBySlug("nba", "")).toBeNull();
  });
});
