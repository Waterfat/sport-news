import { describe, expect, it } from "vitest";
import {
  teamSlugUrl,
  absoluteTeamUrl,
  absolutePlayerUrl,
  absoluteGameUrl,
} from "@/lib/routes";

describe("extended route helpers", () => {
  it("teamSlugUrl generates /team/:sport/:slug", () => {
    expect(teamSlugUrl("nba", "lakers")).toBe("/team/nba/lakers");
  });

  it("teamSlugUrl handles different sports", () => {
    expect(teamSlugUrl("mlb", "yankees")).toBe("/team/mlb/yankees");
  });

  it("absoluteTeamUrl generates full team URL", () => {
    expect(absoluteTeamUrl("https://example.com", "nba", "13")).toBe(
      "https://example.com/team/nba/13"
    );
  });

  it("absoluteTeamUrl strips trailing slash from baseUrl", () => {
    expect(absoluteTeamUrl("https://example.com/", "nba", "13")).toBe(
      "https://example.com/team/nba/13"
    );
  });

  it("absolutePlayerUrl generates full player URL", () => {
    expect(absolutePlayerUrl("https://example.com", "nba", "3112335")).toBe(
      "https://example.com/player/nba/3112335"
    );
  });

  it("absolutePlayerUrl strips trailing slash from baseUrl", () => {
    expect(absolutePlayerUrl("https://example.com/", "nba", "3112335")).toBe(
      "https://example.com/player/nba/3112335"
    );
  });

  it("absoluteGameUrl generates full game URL", () => {
    expect(absoluteGameUrl("https://example.com", "nba", "401584793")).toBe(
      "https://example.com/game/nba/401584793"
    );
  });

  it("absoluteGameUrl strips trailing slash from baseUrl", () => {
    expect(absoluteGameUrl("https://example.com/", "nba", "401584793")).toBe(
      "https://example.com/game/nba/401584793"
    );
  });
});
