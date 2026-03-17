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

import { fetchLeaders } from "@/lib/espn/play-by-play";
import { espnFetch } from "@/lib/espn/client";

const mockEspnFetch = vi.mocked(espnFetch);

beforeEach(() => {
  mockEspnFetch.mockReset();
});

const MOCK_SUMMARY_WITH_LEADERS = {
  header: {
    competitions: [
      {
        competitors: [
          {
            homeAway: "home",
            team: { id: "1", displayName: "Boston Celtics", logo: "https://bos.png" },
            leaders: [
              {
                name: "points",
                displayName: "Points",
                leaders: [
                  { displayValue: "32 PTS", athlete: { displayName: "Jayson Tatum" } },
                ],
              },
              {
                name: "rebounds",
                displayName: "Rebounds",
                leaders: [
                  { displayValue: "10 REB", athlete: { displayName: "Al Horford" } },
                ],
              },
              {
                name: "assists",
                displayName: "Assists",
                leaders: [
                  { displayValue: "8 AST", athlete: { displayName: "Derrick White" } },
                ],
              },
            ],
          },
          {
            homeAway: "away",
            team: { id: "2", displayName: "Brooklyn Nets", logo: "https://bkn.png" },
            leaders: [
              {
                name: "points",
                displayName: "Points",
                leaders: [
                  { displayValue: "24 PTS", athlete: { displayName: "Cam Thomas" } },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
};

describe("fetchLeaders", () => {
  it("parses leaders data correctly", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_SUMMARY_WITH_LEADERS);

    const leaders = await fetchLeaders("nba", "12345");
    expect(leaders).toHaveLength(2);

    const home = leaders[0];
    expect(home.teamName).toBe("波士頓塞爾提克");
    expect(home.logo).toBe("https://bos.png");
    expect(home.leaders).toHaveLength(3);
    expect(home.leaders[0]).toEqual({
      category: "points",
      displayName: "Jayson Tatum",
      displayValue: "32 PTS",
    });

    const away = leaders[1];
    expect(away.teamName).toBe("布魯克林籃網");
    expect(away.leaders).toHaveLength(1);
    expect(away.leaders[0].displayName).toBe("Cam Thomas");
  });

  it("handles missing leaders gracefully", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      header: {
        competitions: [
          {
            competitors: [
              { homeAway: "home", team: { id: "1", displayName: "Team A" } },
            ],
          },
        ],
      },
    });

    const leaders = await fetchLeaders("nba", "12345");
    expect(leaders).toHaveLength(1);
    expect(leaders[0].leaders).toEqual([]);
  });
});
