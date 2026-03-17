import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fetch before importing module
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

let fetchOdds: typeof import("@/lib/espn/odds").fetchOdds;
let fetchOddsPreview: typeof import("@/lib/espn/odds").fetchOddsPreview;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  const mod = await import("@/lib/espn/odds");
  fetchOdds = mod.fetchOdds;
  fetchOddsPreview = mod.fetchOddsPreview;
});

const MOCK_SUMMARY_WITH_ODDS = {
  odds: [
    {
      provider: { id: "45", name: "ESPN BET" },
      details: "LAL -5.5",
      overUnder: 220.5,
      spread: -5.5,
      overOdds: -110,
      underOdds: -110,
      homeTeamOdds: {
        moneyLine: -220,
        spreadOdds: -110,
        favorite: true,
        underdog: false,
      },
      awayTeamOdds: {
        moneyLine: 180,
        spreadOdds: -110,
        favorite: false,
        underdog: true,
      },
    },
  ],
};

const MOCK_SUMMARY_EMPTY_ODDS = {
  odds: [],
};

const MOCK_SUMMARY_NO_ODDS = {};

describe("fetchOdds", () => {
  it("parses summary odds correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUMMARY_WITH_ODDS,
    });

    const odds = await fetchOdds("nba", "401633205");
    expect(odds).toHaveLength(1);

    const line = odds[0];
    expect(line.provider).toBe("ESPN BET");
    expect(line.details).toBe("LAL -5.5");
    expect(line.overUnder).toBe(220.5);
    expect(line.spread).toBe(-5.5);
    expect(line.homeMoneyLine).toBe(-220);
    expect(line.awayMoneyLine).toBe(180);
    expect(line.homeSpreadOdds).toBe(-110);
    expect(line.awaySpreadOdds).toBe(-110);
    expect(line.homeFavorite).toBe(true);
  });

  it("returns empty array for empty odds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUMMARY_EMPTY_ODDS,
    });

    const odds = await fetchOdds("nba", "401633205", true);
    expect(odds).toEqual([]);
  });

  it("returns empty array when no odds field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUMMARY_NO_ODDS,
    });

    const odds = await fetchOdds("nba", "401633205");
    expect(odds).toEqual([]);
  });

  it("calls summary endpoint with event param", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUMMARY_WITH_ODDS,
    });

    await fetchOdds("nba", "401633205");

    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).toContain("/basketball/nba/summary");
    expect(calledUrl).toContain("event=401633205");
  });
});

describe("fetchOddsPreview", () => {
  it("masks moneyLine values for preview", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUMMARY_WITH_ODDS,
    });

    const odds = await fetchOddsPreview("nba", "401633205");
    expect(odds).toHaveLength(1);
    expect(odds[0].homeMoneyLine).toBe(0);
    expect(odds[0].awayMoneyLine).toBe(0);
    // Other fields preserved
    expect(odds[0].details).toBe("LAL -5.5");
    expect(odds[0].spread).toBe(-5.5);
  });

  it("returns empty array when no odds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_SUMMARY_EMPTY_ODDS,
    });

    const odds = await fetchOddsPreview("nba", "401633205");
    expect(odds).toEqual([]);
  });
});
