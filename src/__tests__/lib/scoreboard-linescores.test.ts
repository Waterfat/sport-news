import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let fetchScoreboard: typeof import("@/lib/scoreboard").fetchScoreboard;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  const mod = await import("@/lib/scoreboard");
  fetchScoreboard = mod.fetchScoreboard;
});

const MOCK_RESPONSE_WITH_LINESCORES = {
  events: [
    {
      id: "401633205",
      date: "2026-03-14T17:00Z",
      status: {
        type: {
          name: "STATUS_FINAL",
          shortDetail: "Final",
        },
      },
      competitions: [
        {
          competitors: [
            {
              homeAway: "home",
              score: "110",
              records: [{ summary: "35-40" }],
              linescores: [
                { value: 28 },
                { value: 25 },
                { value: 30 },
                { value: 27 },
              ],
              team: {
                displayName: "Boston Celtics",
                abbreviation: "BOS",
                logo: "https://a.espncdn.com/bos.png",
              },
            },
            {
              homeAway: "away",
              score: "105",
              records: [{ summary: "30-45" }],
              linescores: [
                { value: 22 },
                { value: 30 },
                { value: 28 },
                { value: 25 },
              ],
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
  ],
};

describe("fetchScoreboard with linescores", () => {
  it("parses linescores correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_RESPONSE_WITH_LINESCORES,
    });

    const games = await fetchScoreboard("basketball/nba");
    expect(games).toHaveLength(1);

    const game = games[0];
    expect(game.homeTeam.linescores).toBeDefined();
    expect(game.homeTeam.linescores).toHaveLength(4);
    expect(game.homeTeam.linescores![0]).toEqual({ period: 1, value: "28" });
    expect(game.homeTeam.linescores![3]).toEqual({ period: 4, value: "27" });

    expect(game.awayTeam.linescores).toBeDefined();
    expect(game.awayTeam.linescores).toHaveLength(4);
    expect(game.awayTeam.linescores![0]).toEqual({ period: 1, value: "22" });
  });

  it("handles missing linescores gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        events: [
          {
            id: "123",
            date: "2026-03-14T17:00Z",
            status: { type: { name: "STATUS_SCHEDULED", shortDetail: "7 PM" } },
            competitions: [
              {
                competitors: [
                  { homeAway: "home", score: "0", team: { displayName: "Team A" } },
                  { homeAway: "away", score: "0", team: { displayName: "Team B" } },
                ],
              },
            ],
          },
        ],
      }),
    });

    const games = await fetchScoreboard("basketball/nba");
    expect(games[0].homeTeam.linescores).toBeUndefined();
    expect(games[0].awayTeam.linescores).toBeUndefined();
  });
});
