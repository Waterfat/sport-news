import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mock 所有依賴 ────────────────────────────────────────────────────────────

vi.mock("@/lib/espn/standings", () => ({
  fetchStandings: vi.fn(),
}));

vi.mock("@/lib/espn/team", () => ({
  fetchTeamATS: vi.fn(),
}));

vi.mock("@/lib/espn/client", () => ({
  getSportPath: (s: string) => {
    const m: Record<string, string> = { nba: "basketball/nba", mlb: "baseball/mlb" };
    return m[s] ?? s;
  },
}));

vi.mock("@/lib/constants", () => ({
  getTeamNameZh: (name: string) => {
    const m: Record<string, string> = { "Los Angeles Lakers": "洛杉磯湖人" };
    return m[name] ?? name;
  },
}));

// Mock global fetch for team/player routes that call ESPN directly
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { GET as standingsGET } from "@/app/api/public/standings/route";
import { GET as teamGET } from "@/app/api/public/team/route";
import { GET as playerGET } from "@/app/api/public/player/route";
import { fetchStandings } from "@/lib/espn/standings";
import { fetchTeamATS } from "@/lib/espn/team";

const mockFetchStandings = vi.mocked(fetchStandings);
const mockFetchTeamATS = vi.mocked(fetchTeamATS);

function makeRequest(base: string, params: Record<string, string>) {
  const url = new URL(`http://localhost${base}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return new NextRequest(url.toString());
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════════════
// STANDINGS
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/public/standings", () => {
  it("正常回傳 standings 資料，HTTP 200", async () => {
    const mockGroups = [
      {
        name: "東區",
        entries: [
          { teamId: "2", teamName: "波士頓塞爾提克", abbreviation: "BOS", logo: "", stats: {} },
        ],
      },
    ];
    mockFetchStandings.mockResolvedValueOnce(mockGroups);

    const req = makeRequest("/api/public/standings", { league: "nba" });
    const res = await standingsGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.standings).toHaveLength(1);
    expect(body.standings[0].name).toBe("東區");
  });

  it("league 預設為 nba", async () => {
    mockFetchStandings.mockResolvedValueOnce([]);

    const req = makeRequest("/api/public/standings", {});
    await standingsGET(req);

    expect(mockFetchStandings).toHaveBeenCalledWith("nba");
  });

  it("fetchStandings 拋出例外時回傳 500", async () => {
    mockFetchStandings.mockRejectedValueOnce(new Error("ESPN down"));

    const req = makeRequest("/api/public/standings", { league: "nba" });
    const res = await standingsGET(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("mlb standings 以正確 league 呼叫", async () => {
    mockFetchStandings.mockResolvedValueOnce([]);

    const req = makeRequest("/api/public/standings", { league: "mlb" });
    await standingsGET(req);

    expect(mockFetchStandings).toHaveBeenCalledWith("mlb");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEAM
// ═══════════════════════════════════════════════════════════════════════════════

describe("GET /api/public/team", () => {
  it("缺少 id 回傳 400", async () => {
    const req = makeRequest("/api/public/team", { sport: "nba" });
    const res = await teamGET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("id");
  });

  it("type=roster 回傳球員名單", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        athletes: [
          {
            id: "3945274",
            displayName: "Jayson Tatum",
            jersey: "0",
            position: { abbreviation: "SF" },
            age: 26,
            displayHeight: "6'8\"",
            displayWeight: "210 lbs",
          },
        ],
      }),
    });

    const req = makeRequest("/api/public/team", { sport: "nba", id: "2", type: "roster" });
    const res = await teamGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roster).toHaveLength(1);
    expect(body.roster[0].displayName).toBe("Jayson Tatum");
    expect(body.roster[0].position).toBe("SF");
  });

  it("type=roster ESPN API 失敗時回傳空 roster", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const req = makeRequest("/api/public/team", { sport: "nba", id: "2", type: "roster" });
    const res = await teamGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roster).toEqual([]);
  });

  it("type=ats 回傳 ATS 資料", async () => {
    mockFetchTeamATS.mockResolvedValueOnce({ wins: 40, losses: 35, pushes: 1 });

    const req = makeRequest("/api/public/team", { sport: "nba", id: "13", type: "ats" });
    const res = await teamGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ats.wins).toBe(40);
    expect(body.ats.losses).toBe(35);
    expect(body.ats.pushes).toBe(1);
  });

  it("type=ats ATS 為 null 時回傳 { ats: null }", async () => {
    mockFetchTeamATS.mockResolvedValueOnce(null);

    const req = makeRequest("/api/public/team", { sport: "nba", id: "13", type: "ats" });
    const res = await teamGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ats).toBeNull();
  });

  it("預設 type 回傳球隊基本資訊", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        team: {
          id: "13",
          displayName: "Los Angeles Lakers",
          abbreviation: "LAL",
          logos: [{ href: "https://lal.png" }],
          color: "552583",
          record: { items: [{ summary: "45-31" }] },
          standingSummary: "4th in Pacific",
        },
      }),
    });

    const req = makeRequest("/api/public/team", { sport: "nba", id: "13" });
    const res = await teamGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.team.id).toBe("13");
    expect(body.team.name).toBe("洛杉磯湖人");
    expect(body.team.abbreviation).toBe("LAL");
    expect(body.team.record).toBe("45-31");
  });

  it("球隊不存在時回傳 404", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const req = makeRequest("/api/public/team", { sport: "nba", id: "99999" });
    const res = await teamGET(req);

    expect(res.status).toBe(404);
  });

  it("fetch 拋出例外時回傳 500", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const req = makeRequest("/api/public/team", { sport: "nba", id: "13" });
    const res = await teamGET(req);

    expect(res.status).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_PLAYER_ESPN = {
  athlete: {
    id: "3945274",
    displayName: "Jayson Tatum",
    jersey: "0",
    position: { displayName: "Small Forward" },
    age: 26,
    displayHeight: "6'8\"",
    displayWeight: "210 lbs",
    headshot: { href: "https://tatum.png" },
    team: {
      id: "2",
      displayName: "Boston Celtics",
      abbreviation: "BOS",
      logos: [{ href: "https://bos.png" }],
    },
    experience: { years: 7 },
    college: { name: "Duke" },
    statistics: [],
  },
};

describe("GET /api/public/player", () => {
  it("缺少 id 回傳 400", async () => {
    const req = makeRequest("/api/public/player", { sport: "nba" });
    const res = await playerGET(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("id");
  });

  it("預設 type 回傳球員基本資訊", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_PLAYER_ESPN,
    });

    const req = makeRequest("/api/public/player", { sport: "nba", id: "3945274" });
    const res = await playerGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.player.id).toBe("3945274");
    expect(body.player.displayName).toBe("Jayson Tatum");
    expect(body.player.jersey).toBe("0");
    expect(body.player.headshot).toBe("https://tatum.png");
    expect(body.player.team.abbreviation).toBe("BOS");
    expect(body.player.college).toBe("Duke");
  });

  it("stats 回傳最多 15 筆", async () => {
    const manyStats = Array.from({ length: 20 }, (_, i) => ({
      name: `stat${i}`,
      displayName: `Stat ${i}`,
      displayValue: String(i),
    }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        athlete: {
          ...MOCK_PLAYER_ESPN.athlete,
          statistics: [{ stats: manyStats }],
        },
      }),
    });

    const req = makeRequest("/api/public/player", { sport: "nba", id: "3945274" });
    const res = await playerGET(req);

    const body = await res.json();
    expect(body.stats.length).toBeLessThanOrEqual(15);
  });

  it("player not found 時回傳 404", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const req = makeRequest("/api/public/player", { sport: "nba", id: "99999" });
    const res = await playerGET(req);

    expect(res.status).toBe(404);
  });

  it("缺少 team 時 team 為 null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        athlete: {
          id: "1",
          displayName: "Free Agent",
          // team 欄位缺失
        },
      }),
    });

    const req = makeRequest("/api/public/player", { sport: "nba", id: "1" });
    const res = await playerGET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.player.team).toBeNull();
  });

  it("fetch 拋出例外時回傳 500", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Timeout"));

    const req = makeRequest("/api/public/player", { sport: "nba", id: "3945274" });
    const res = await playerGET(req);

    expect(res.status).toBe(500);
  });
});
