import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock play-by-play 模組
vi.mock("@/lib/espn/play-by-play", () => ({
  fetchPlayByPlayPreview: vi.fn(),
  fetchBoxScore: vi.fn(),
  fetchLeaders: vi.fn(),
  fetchInjuries: vi.fn(),
  fetchWinProbability: vi.fn(),
  fetchSeasonSeries: vi.fn(),
  fetchPickCenter: vi.fn(),
}));

// Mock odds 模組
vi.mock("@/lib/espn/odds", () => ({
  fetchOddsPreview: vi.fn(),
}));

import { GET } from "@/app/api/public/game/route";
import {
  fetchPlayByPlayPreview,
  fetchBoxScore,
  fetchLeaders,
  fetchInjuries,
  fetchWinProbability,
  fetchSeasonSeries,
  fetchPickCenter,
} from "@/lib/espn/play-by-play";
import { fetchOddsPreview } from "@/lib/espn/odds";

const mockFetchPlays = vi.mocked(fetchPlayByPlayPreview);
const mockFetchBoxScore = vi.mocked(fetchBoxScore);
const mockFetchLeaders = vi.mocked(fetchLeaders);
const mockFetchInjuries = vi.mocked(fetchInjuries);
const mockFetchWinProbability = vi.mocked(fetchWinProbability);
const mockFetchSeasonSeries = vi.mocked(fetchSeasonSeries);
const mockFetchPickCenter = vi.mocked(fetchPickCenter);
const mockFetchOddsPreview = vi.mocked(fetchOddsPreview);

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/public/game");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 參數驗證 ─────────────────────────────────────────────────────────────────

describe("GET /api/public/game - 參數驗證", () => {
  it("缺少 eventId 回傳 400", async () => {
    const req = makeRequest({ league: "nba", type: "plays" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("eventId");
  });

  it("無效的 type 回傳 400", async () => {
    const req = makeRequest({ eventId: "123", league: "nba", type: "invalid-type" });
    const res = await GET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

// ─── type=plays ───────────────────────────────────────────────────────────────

describe("GET /api/public/game?type=plays", () => {
  it("回傳 plays 資料與 totalCount", async () => {
    const mockData = {
      plays: [
        { id: "p1", text: "Jump ball", sequence: 1, scoringPlay: false },
      ],
      totalCount: 10,
    };
    mockFetchPlays.mockResolvedValueOnce(mockData);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "plays" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plays).toHaveLength(1);
    expect(body.totalCount).toBe(10);
  });

  it("以正確參數呼叫 fetchPlayByPlayPreview", async () => {
    mockFetchPlays.mockResolvedValueOnce({ plays: [], totalCount: 0 });

    const req = makeRequest({ eventId: "401633205", league: "mlb", type: "plays" });
    await GET(req);

    expect(mockFetchPlays).toHaveBeenCalledWith("mlb", "401633205");
  });
});

// ─── type=odds ────────────────────────────────────────────────────────────────

describe("GET /api/public/game?type=odds", () => {
  it("回傳 odds 陣列", async () => {
    const mockOdds = [{ provider: "ESPN BET", details: "LAL -5.5", spread: -5.5 }];
    mockFetchOddsPreview.mockResolvedValueOnce(mockOdds as never);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "odds" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.odds).toHaveLength(1);
    expect(body.odds[0].provider).toBe("ESPN BET");
  });
});

// ─── type=boxscore ────────────────────────────────────────────────────────────

describe("GET /api/public/game?type=boxscore", () => {
  it("回傳 boxscore 資料", async () => {
    const mockBoxscore = {
      teams: [{ teamName: "波士頓塞爾提克", stats: [] }],
      players: [],
    };
    mockFetchBoxScore.mockResolvedValueOnce(mockBoxscore as never);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "boxscore" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.boxscore.teams).toHaveLength(1);
  });

  it("boxscore 為 null 時回傳 { boxscore: null }", async () => {
    mockFetchBoxScore.mockResolvedValueOnce(null);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "boxscore" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.boxscore).toBeNull();
  });
});

// ─── type=leaders ─────────────────────────────────────────────────────────────

describe("GET /api/public/game?type=leaders", () => {
  it("回傳 leaders 資料", async () => {
    const mockLeaders = [
      {
        teamName: "波士頓塞爾提克",
        logo: "https://bos.png",
        leaders: [{ category: "points", displayName: "Tatum", displayValue: "32 PTS" }],
      },
    ];
    mockFetchLeaders.mockResolvedValueOnce(mockLeaders as never);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "leaders" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.leaders).toHaveLength(1);
    expect(body.leaders[0].teamName).toBe("波士頓塞爾提克");
  });
});

// ─── type=injuries ────────────────────────────────────────────────────────────

describe("GET /api/public/game?type=injuries", () => {
  it("回傳 injuries 資料", async () => {
    const mockInjuries = [
      {
        team: "邁阿密熱火",
        teamLogo: "https://heat.png",
        players: [{ name: "Jimmy Butler", status: "Out", description: "Knee" }],
      },
    ];
    mockFetchInjuries.mockResolvedValueOnce(mockInjuries as never);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "injuries" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.injuries).toHaveLength(1);
    expect(body.injuries[0].players[0].name).toBe("Jimmy Butler");
  });
});

// ─── type=winprobability ──────────────────────────────────────────────────────

describe("GET /api/public/game?type=winprobability", () => {
  it("回傳 winprobability 資料", async () => {
    const mockWinProb = [
      { homeWinPct: 50, playId: "1", secondsLeft: 2880 },
      { homeWinPct: 65, playId: "50", secondsLeft: 1440 },
    ];
    mockFetchWinProbability.mockResolvedValueOnce(mockWinProb as never);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "winprobability" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.winprobability).toHaveLength(2);
    expect(body.winprobability[0].homeWinPct).toBe(50);
  });
});

// ─── type=seasonseries ────────────────────────────────────────────────────────

describe("GET /api/public/game?type=seasonseries", () => {
  it("回傳 seasonseries 資料", async () => {
    const mockSeries = {
      summary: "BOS leads 3-1",
      seriesScore: "3-1",
      games: [],
    };
    mockFetchSeasonSeries.mockResolvedValueOnce(mockSeries as never);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "seasonseries" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seasonseries.summary).toBe("BOS leads 3-1");
  });

  it("seasonseries 為 null 時回傳 { seasonseries: null }", async () => {
    mockFetchSeasonSeries.mockResolvedValueOnce(null);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "seasonseries" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.seasonseries).toBeNull();
  });
});

// ─── type=pickcenter ──────────────────────────────────────────────────────────

describe("GET /api/public/game?type=pickcenter", () => {
  it("回傳 pickcenter 資料", async () => {
    const mockPickCenter = [
      {
        provider: "Draft Kings",
        details: "BOS -3",
        homeWinPct: 0.6,
        awayWinPct: 0.4,
      },
    ];
    mockFetchPickCenter.mockResolvedValueOnce(mockPickCenter as never);

    const req = makeRequest({ eventId: "401633205", league: "nba", type: "pickcenter" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pickcenter).toHaveLength(1);
    expect(body.pickcenter[0].provider).toBe("Draft Kings");
  });
});

// ─── league 預設值 ────────────────────────────────────────────────────────────

describe("GET /api/public/game - league 預設值", () => {
  it("未指定 league 時預設使用 nba", async () => {
    mockFetchLeaders.mockResolvedValueOnce([]);

    const req = makeRequest({ eventId: "401633205", type: "leaders" });
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockFetchLeaders).toHaveBeenCalledWith("nba", "401633205");
  });
});
