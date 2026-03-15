import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch before importing module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Dynamic import to reset module cache between tests
let fetchScoreboard: typeof import("@/lib/scoreboard").fetchScoreboard;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  const mod = await import("@/lib/scoreboard");
  fetchScoreboard = mod.fetchScoreboard;
});

const MOCK_ESPN_RESPONSE = {
  events: [
    {
      id: "401633205",
      date: "2026-03-14T17:00Z",
      status: {
        type: {
          name: "STATUS_IN_PROGRESS",
          shortDetail: "Q3 5:23",
        },
      },
      competitions: [
        {
          competitors: [
            {
              homeAway: "home",
              score: "104",
              records: [{ summary: "30-42" }],
              team: {
                displayName: "Philadelphia 76ers",
                abbreviation: "PHI",
                logo: "https://a.espncdn.com/phi.png",
              },
            },
            {
              homeAway: "away",
              score: "97",
              records: [{ summary: "25-47" }],
              team: {
                displayName: "Brooklyn Nets",
                abbreviation: "BKN",
                logo: "https://a.espncdn.com/bkn.png",
              },
            },
          ],
        },
      ],
    },
    {
      id: "401633206",
      date: "2026-03-14T23:30Z",
      status: {
        type: {
          name: "STATUS_SCHEDULED",
          shortDetail: "7:30 PM ET",
        },
      },
      competitions: [
        {
          competitors: [
            {
              homeAway: "home",
              score: "0",
              records: [{ summary: "50-22" }],
              team: {
                displayName: "Boston Celtics",
                abbreviation: "BOS",
                logo: "https://a.espncdn.com/bos.png",
              },
            },
            {
              homeAway: "away",
              score: "0",
              records: [{ summary: "45-27" }],
              team: {
                displayName: "Milwaukee Bucks",
                abbreviation: "MIL",
                logo: "https://a.espncdn.com/mil.png",
              },
            },
          ],
        },
      ],
    },
  ],
};

describe("fetchScoreboard", () => {
  it("parses ESPN response correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_ESPN_RESPONSE,
    });

    const games = await fetchScoreboard("basketball/nba");
    expect(games).toHaveLength(2);

    const game1 = games[0];
    expect(game1.id).toBe("401633205");
    expect(game1.status).toBe("in_progress");
    expect(game1.statusDetail).toBe("Q3 5:23");
    expect(game1.homeTeam.name).toBe("Philadelphia 76ers");
    expect(game1.homeTeam.abbreviation).toBe("PHI");
    expect(game1.homeTeam.score).toBe("104");
    expect(game1.homeTeam.record).toBe("30-42");
    expect(game1.awayTeam.name).toBe("Brooklyn Nets");
    expect(game1.awayTeam.abbreviation).toBe("BKN");
    expect(game1.awayTeam.score).toBe("97");

    const game2 = games[1];
    expect(game2.status).toBe("scheduled");
    expect(game2.statusDetail).toBe("7:30 PM ET");
  });

  it("returns empty array on API error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const games = await fetchScoreboard("basketball/nba");
    expect(games).toEqual([]);
  });

  it("returns empty array on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const games = await fetchScoreboard("basketball/nba");
    expect(games).toEqual([]);
  });

  it("handles empty events array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ events: [] }),
    });
    const games = await fetchScoreboard("baseball/mlb");
    expect(games).toEqual([]);
  });

  it("handles missing fields gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        events: [
          {
            id: "123",
            date: "",
            status: { type: { name: "STATUS_FINAL", shortDetail: "Final" } },
            competitions: [
              {
                competitors: [
                  { homeAway: "home", team: { displayName: "Team A" } },
                  { homeAway: "away", team: {} },
                ],
              },
            ],
          },
        ],
      }),
    });

    const games = await fetchScoreboard("test/endpoint");
    expect(games).toHaveLength(1);
    expect(games[0].status).toBe("final");
    expect(games[0].homeTeam.name).toBe("Team A");
    expect(games[0].awayTeam.score).toBe("0");
    expect(games[0].awayTeam.abbreviation).toBe("");
  });

  it("uses cache for repeated requests within TTL", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_ESPN_RESPONSE,
    });

    // First call hits API
    const games1 = await fetchScoreboard("basketball/nba");
    expect(games1).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should use cache (same module instance)
    const games2 = await fetchScoreboard("basketball/nba");
    expect(games2).toHaveLength(2);
    // Note: due to module reset in beforeEach, cache is fresh each test
    // But within the same test, cache should work
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
