import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the ESPN client
vi.mock("@/lib/espn/client", () => ({
  espnFetch: vi.fn(),
  getSportPath: vi.fn((league: string) => {
    if (league === "nba") return "basketball/nba";
    return league;
  }),
  CACHE_TTL: { LIVE: 10000, PBP_FINAL: 3600000 },
}));

// Mock translate-pbp
vi.mock("@/lib/espn/translate-pbp", () => ({
  translatePbpText: (text: string) => text,
}));

import {
  fetchSeasonSeries,
  fetchPickCenter,
  fetchWinProbability,
  fetchInjuries,
  fetchPlayByPlay,
  fetchPlayByPlayPreview,
} from "@/lib/espn/play-by-play";
import { espnFetch } from "@/lib/espn/client";

const mockEspnFetch = vi.mocked(espnFetch);

beforeEach(() => {
  mockEspnFetch.mockReset();
});

// ─── fetchSeasonSeries ────────────────────────────────────────────────────────

describe("fetchSeasonSeries", () => {
  it("正確解析 seasonseries 資料", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      seasonseries: [
        {
          summary: "MIA wins series 3-1",
          seriesScore: "3-1",
          events: [
            {
              date: "2025-10-28T23:30:00Z",
              competitors: [
                {
                  homeAway: "home",
                  score: "98",
                  team: { displayName: "Miami Heat" },
                },
                {
                  homeAway: "away",
                  score: "116",
                  team: { displayName: "Charlotte Hornets" },
                },
              ],
              statusType: { shortDetail: "Final" },
            },
          ],
        },
      ],
    });

    const result = await fetchSeasonSeries("nba", "401234567");
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("MIA wins series 3-1");
    expect(result!.seriesScore).toBe("3-1");
    expect(result!.games).toHaveLength(1);
    expect(result!.games[0].date).toBe("2025-10-28T23:30:00Z");
    expect(result!.games[0].homeScore).toBe("98");
    expect(result!.games[0].awayScore).toBe("116");
    expect(result!.games[0].status).toBe("Final");
  });

  it("seasonseries 為空陣列時回傳 null", async () => {
    mockEspnFetch.mockResolvedValueOnce({ seasonseries: [] });

    const result = await fetchSeasonSeries("nba", "401234567");
    expect(result).toBeNull();
  });

  it("缺少 seasonseries 欄位時回傳 null", async () => {
    mockEspnFetch.mockResolvedValueOnce({});

    const result = await fetchSeasonSeries("nba", "401234567");
    expect(result).toBeNull();
  });

  it("espnFetch 拋出例外時回傳 null", async () => {
    mockEspnFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchSeasonSeries("nba", "401234567");
    expect(result).toBeNull();
  });
});

// ─── fetchPickCenter ──────────────────────────────────────────────────────────

describe("fetchPickCenter", () => {
  it("正確解析 pickcenter 資料，並由 moneyLine 計算 homeWinPct / awayWinPct（0-1 區間）", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      pickcenter: [
        {
          provider: { name: "Draft Kings" },
          details: "CHA -5.5",
          homeTeamOdds: { moneyLine: -205, favorite: true },
          awayTeamOdds: { moneyLine: 170, favorite: false },
        },
      ],
    });

    const result = await fetchPickCenter("nba", "401234567");
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("Draft Kings");
    expect(result[0].details).toBe("CHA -5.5");
    // moneyLine -205 → rawHome = 205/305 ≈ 0.672；moneyLine 170 → rawAway = 100/270 ≈ 0.370
    // 回傳值必須在 0-1 區間（API 契約）
    expect(result[0].homeWinPct).toBeGreaterThan(0);
    expect(result[0].homeWinPct).toBeLessThanOrEqual(1);
    expect(result[0].awayWinPct).toBeGreaterThan(0);
    expect(result[0].awayWinPct).toBeLessThanOrEqual(1);
    // 加總應約等於 1
    expect(result[0].homeWinPct + result[0].awayWinPct).toBeCloseTo(1, 2);
  });

  it("pickcenter 為空陣列時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({ pickcenter: [] });

    const result = await fetchPickCenter("nba", "401234567");
    expect(result).toEqual([]);
  });

  it("缺少 pickcenter 欄位時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({});

    const result = await fetchPickCenter("nba", "401234567");
    expect(result).toEqual([]);
  });

  it("winPercentage 已存在時直接使用（0-1 區間），不從 moneyLine 計算", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      pickcenter: [
        {
          provider: { name: "ESPN BET" },
          details: "BOS -3",
          homeTeamOdds: { moneyLine: -150, winPercentage: 0.6 },
          awayTeamOdds: { moneyLine: 130, winPercentage: 0.4 },
        },
      ],
    });

    const result = await fetchPickCenter("nba", "401234567");
    expect(result[0].homeWinPct).toBe(0.6);
    expect(result[0].awayWinPct).toBe(0.4);
  });

  it("espnFetch 拋出例外時回傳空陣列", async () => {
    mockEspnFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchPickCenter("nba", "401234567");
    expect(result).toEqual([]);
  });
});

// ─── fetchWinProbability ──────────────────────────────────────────────────────

describe("fetchWinProbability", () => {
  it("正確解析 winprobability 資料，homeWinPercentage 乘以 100", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      winprobability: [
        { homeWinPercentage: 0.5, playId: "1", secondsLeft: 2880 },
        { homeWinPercentage: 0.65, playId: "50", secondsLeft: 1440 },
      ],
    });

    const result = await fetchWinProbability("nba", "401234567");
    expect(result).toHaveLength(2);
    expect(result[0].homeWinPct).toBe(50);
    expect(result[0].playId).toBe("1");
    expect(result[0].secondsLeft).toBe(2880);
    expect(result[1].homeWinPct).toBe(65);
    expect(result[1].playId).toBe("50");
  });

  it("winprobability 為空陣列時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({ winprobability: [] });

    const result = await fetchWinProbability("nba", "401234567");
    expect(result).toEqual([]);
  });

  it("缺少 winprobability 欄位時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({});

    const result = await fetchWinProbability("nba", "401234567");
    expect(result).toEqual([]);
  });

  it("espnFetch 拋出例外時回傳空陣列", async () => {
    mockEspnFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchWinProbability("nba", "401234567");
    expect(result).toEqual([]);
  });
});

// ─── fetchInjuries ────────────────────────────────────────────────────────────

describe("fetchInjuries", () => {
  it("正確解析 injuries 資料，包含球員姓名和狀態", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      injuries: [
        {
          team: { displayName: "Miami Heat", logo: "https://heat.png" },
          injuries: [
            {
              athlete: { displayName: "Jimmy Butler" },
              status: "Out",
              type: { description: "Knee" },
              details: {},
            },
          ],
        },
      ],
    });

    const result = await fetchInjuries("nba", "401234567");
    expect(result).toHaveLength(1);
    expect(result[0].teamLogo).toBe("https://heat.png");
    expect(result[0].players).toHaveLength(1);
    expect(result[0].players[0].name).toBe("Jimmy Butler");
    expect(result[0].players[0].status).toBe("Out");
  });

  it("injuries 為空陣列時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({ injuries: [] });

    const result = await fetchInjuries("nba", "401234567");
    expect(result).toEqual([]);
  });

  it("缺少 injuries 欄位時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({});

    const result = await fetchInjuries("nba", "401234567");
    expect(result).toEqual([]);
  });

  it("同一隊有多位傷兵時全部正確解析", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      injuries: [
        {
          team: { displayName: "Boston Celtics", logo: "https://bos.png" },
          injuries: [
            {
              athlete: { displayName: "Jayson Tatum" },
              status: "Questionable",
              type: { description: "Ankle" },
              details: {},
            },
            {
              athlete: { displayName: "Jaylen Brown" },
              status: "Probable",
              type: { description: "Knee" },
              details: {},
            },
          ],
        },
      ],
    });

    const result = await fetchInjuries("nba", "401234567");
    expect(result[0].players).toHaveLength(2);
    expect(result[0].players[0].name).toBe("Jayson Tatum");
    expect(result[0].players[0].status).toBe("Questionable");
    expect(result[0].players[1].name).toBe("Jaylen Brown");
    expect(result[0].players[1].status).toBe("Probable");
  });

  it("espnFetch 拋出例外時回傳空陣列", async () => {
    mockEspnFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await fetchInjuries("nba", "401234567");
    expect(result).toEqual([]);
  });
});

// ─── fetchPlayByPlay ──────────────────────────────────────────────────────────

const MOCK_PLAYS_SUMMARY = {
  header: {
    competitions: [
      {
        competitors: [
          { homeAway: "home", team: { id: "14", displayName: "Miami Heat" } },
          { homeAway: "away", team: { id: "30", displayName: "Charlotte Hornets" } },
        ],
      },
    ],
  },
  plays: [
    {
      id: "p1",
      sequenceNumber: "1",
      type: { id: "1", text: "Jump Ball" },
      text: "Jump ball won by Miami",
      awayScore: 0,
      homeScore: 0,
      period: { number: 1, displayValue: "1st" },
      clock: { displayValue: "12:00" },
      scoringPlay: false,
      team: { id: "14" },
    },
    {
      id: "p2",
      sequenceNumber: "2",
      type: { id: "2", text: "Field Goal" },
      text: "Jimmy Butler made layup",
      awayScore: 0,
      homeScore: 2,
      period: { number: 1, displayValue: "1st" },
      clock: { displayValue: "11:45" },
      scoringPlay: true,
      team: { id: "14" },
    },
    {
      id: "p3",
      sequenceNumber: "3",
      type: { id: "2", text: "Field Goal" },
      text: "LaMelo Ball made 3-pointer",
      awayScore: 3,
      homeScore: 2,
      period: { number: 1, displayValue: "1st" },
      clock: { displayValue: "11:30" },
      scoringPlay: true,
      team: { id: "30" },
    },
    {
      id: "p4",
      sequenceNumber: "4",
      type: { id: "3", text: "Turnover" },
      text: "Bam Adebayo turnover",
      awayScore: 3,
      homeScore: 2,
      period: { number: 1, displayValue: "1st" },
      clock: { displayValue: "11:15" },
      scoringPlay: false,
      team: { id: "14" },
    },
    {
      id: "p5",
      sequenceNumber: "5",
      type: { id: "2", text: "Field Goal" },
      text: "Miles Bridges made dunk",
      awayScore: 5,
      homeScore: 2,
      period: { number: 1, displayValue: "1st" },
      clock: { displayValue: "11:00" },
      scoringPlay: true,
      team: { id: "30" },
    },
    {
      id: "p6",
      sequenceNumber: "6",
      type: { id: "2", text: "Field Goal" },
      text: "Tyler Herro made 3-pointer",
      awayScore: 5,
      homeScore: 5,
      period: { number: 1, displayValue: "1st" },
      clock: { displayValue: "10:45" },
      scoringPlay: true,
      team: { id: "14" },
    },
  ],
};

describe("fetchPlayByPlay", () => {
  it("正確解析全部 plays 資料", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYS_SUMMARY);

    const plays = await fetchPlayByPlay("nba", "401234567");
    expect(plays).toHaveLength(6);
    expect(plays[0].id).toBe("p1");
    expect(plays[0].sequence).toBe(1);
    expect(plays[0].text).toBe("Jump ball won by Miami");
    expect(plays[0].type).toBe("Jump Ball");
    expect(plays[0].period).toBe("1st");
    expect(plays[0].clock).toBe("12:00");
    expect(plays[0].scoringPlay).toBe(false);
    expect(plays[0].homeScore).toBe("0");
    expect(plays[0].awayScore).toBe("0");
  });

  it("plays 為空陣列時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      header: { competitions: [{ competitors: [] }] },
      plays: [],
    });

    const plays = await fetchPlayByPlay("nba", "401234567");
    expect(plays).toEqual([]);
  });

  it("缺少 plays 欄位時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      header: { competitions: [{ competitors: [] }] },
    });

    const plays = await fetchPlayByPlay("nba", "401234567");
    expect(plays).toEqual([]);
  });

  it("play 沒有 team 欄位時 teamName 為 null", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      header: { competitions: [{ competitors: [] }] },
      plays: [
        {
          id: "p1",
          sequenceNumber: "1",
          text: "End of period",
          awayScore: 30,
          homeScore: 28,
          period: { number: 1, displayValue: "1st" },
          clock: { displayValue: "0:00" },
          scoringPlay: false,
          // team 欄位缺少
        },
      ],
    });

    const plays = await fetchPlayByPlay("nba", "401234567");
    expect(plays[0].teamName).toBeNull();
  });
});

// ─── fetchPlayByPlayPreview ───────────────────────────────────────────────────

describe("fetchPlayByPlayPreview", () => {
  it("只回傳前 5 筆 plays 並附上 totalCount", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYS_SUMMARY);

    const result = await fetchPlayByPlayPreview("nba", "401234567");
    expect(result.plays).toHaveLength(5);
    expect(result.totalCount).toBe(6);
    expect(result.plays[0].id).toBe("p1");
    expect(result.plays[4].id).toBe("p5");
  });

  it("plays 總數不足 5 筆時全部回傳", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      header: {
        competitions: [
          {
            competitors: [
              { homeAway: "home", team: { id: "14", displayName: "Miami Heat" } },
            ],
          },
        ],
      },
      plays: [
        {
          id: "p1",
          sequenceNumber: "1",
          text: "Jump ball",
          awayScore: 0,
          homeScore: 0,
          period: { number: 1, displayValue: "1st" },
          clock: { displayValue: "12:00" },
          scoringPlay: false,
        },
        {
          id: "p2",
          sequenceNumber: "2",
          text: "Foul",
          awayScore: 0,
          homeScore: 0,
          period: { number: 1, displayValue: "1st" },
          clock: { displayValue: "11:55" },
          scoringPlay: false,
        },
      ],
    });

    const result = await fetchPlayByPlayPreview("nba", "401234567");
    expect(result.plays).toHaveLength(2);
    expect(result.totalCount).toBe(2);
  });

  it("plays 為空時回傳空陣列且 totalCount 為 0", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      header: { competitions: [{ competitors: [] }] },
      plays: [],
    });

    const result = await fetchPlayByPlayPreview("nba", "401234567");
    expect(result.plays).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
