import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ESPN client
vi.mock("@/lib/espn/client", () => ({
  espnFetch: vi.fn(),
  CACHE_TTL: { LIVE: 10_000, PBP_FINAL: 3_600_000 },
  getSportPath: (league: string) => `basketball/${league}`,
}));

// Mock translate-pbp
vi.mock("@/lib/espn/translate-pbp", () => ({
  translatePbpText: (text: string) => text,
}));

import { fetchBoxScore } from "@/lib/espn/play-by-play";
import { espnFetch } from "@/lib/espn/client";

const mockEspnFetch = vi.mocked(espnFetch);

beforeEach(() => {
  mockEspnFetch.mockReset();
});

const MOCK_SUMMARY_WITH_BOXSCORE = {
  header: {
    competitions: [
      {
        competitors: [
          { homeAway: "home", team: { id: "1", displayName: "Boston Celtics" } },
          { homeAway: "away", team: { id: "2", displayName: "Brooklyn Nets" } },
        ],
      },
    ],
  },
  boxscore: {
    teams: [
      {
        team: { displayName: "Boston Celtics", logo: "https://bos.png" },
        statistics: [
          { name: "fieldGoalPct", displayValue: ".485" },
          { name: "rebounds", displayValue: "45" },
        ],
      },
      {
        team: { displayName: "Brooklyn Nets", logo: "https://bkn.png" },
        statistics: [
          { name: "fieldGoalPct", displayValue: ".442" },
          { name: "rebounds", displayValue: "38" },
        ],
      },
    ],
    players: [
      {
        team: { displayName: "Boston Celtics" },
        statistics: [
          {
            labels: ["MIN", "PTS", "REB", "AST"],
            athletes: [
              {
                athlete: { displayName: "Jayson Tatum", position: { abbreviation: "SF" } },
                stats: ["36", "28", "8", "5"],
                starter: true,
              },
              {
                athlete: { displayName: "Bench Player", position: { abbreviation: "PG" } },
                stats: ["12", "6", "2", "3"],
                starter: false,
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("fetchBoxScore", () => {
  it("parses boxscore data correctly", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_SUMMARY_WITH_BOXSCORE);

    const boxscore = await fetchBoxScore("nba", "12345");
    expect(boxscore).not.toBeNull();
    expect(boxscore!.teams).toHaveLength(2);
    expect(boxscore!.teams[0].teamName).toBe("波士頓塞爾提克");
    expect(boxscore!.teams[0].stats[0]).toEqual({ label: "fieldGoalPct", value: ".485" });
    expect(boxscore!.teams[1].teamName).toBe("布魯克林籃網");

    expect(boxscore!.players).toHaveLength(1);
    expect(boxscore!.players[0].teamName).toBe("波士頓塞爾提克");
    expect(boxscore!.players[0].labels).toEqual(["MIN", "PTS", "REB", "AST"]);
    expect(boxscore!.players[0].athletes).toHaveLength(2);

    const starter = boxscore!.players[0].athletes[0];
    expect(starter.name).toBe("Jayson Tatum");
    expect(starter.position).toBe("SF");
    expect(starter.starter).toBe(true);
    expect(starter.stats).toEqual(["36", "28", "8", "5"]);

    const bench = boxscore!.players[0].athletes[1];
    expect(bench.starter).toBe(false);
  });

  it("returns null when no boxscore data", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      header: { competitions: [{ competitors: [] }] },
    });

    const boxscore = await fetchBoxScore("nba", "12345");
    expect(boxscore).toBeNull();
  });
});
