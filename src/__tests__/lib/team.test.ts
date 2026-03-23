import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ESPN client
vi.mock("@/lib/espn/client", () => ({
  espnFetch: vi.fn(),
  CACHE_TTL: { LIVE: 10_000, TEAM: 600_000 },
  getSportPath: (league: string) => {
    const paths: Record<string, string> = {
      nba: "basketball/nba",
      mlb: "baseball/mlb",
    };
    return paths[league] ?? league;
  },
}));

import { fetchTeam, fetchTeamATS } from "@/lib/espn/team";
import { espnFetch } from "@/lib/espn/client";

const mockEspnFetch = vi.mocked(espnFetch);

beforeEach(() => {
  mockEspnFetch.mockReset();
});

// ─── Mock 資料 ────────────────────────────────────────────────────────────────

const MOCK_TEAM_RESPONSE = {
  team: {
    id: "13",
    displayName: "Los Angeles Lakers",
    abbreviation: "LAL",
    logos: [{ href: "https://a.espncdn.com/lal.png" }],
    color: "552583",
    record: {
      items: [{ summary: "45-31" }],
    },
    standingSummary: "4th in Pacific",
  },
};

const MOCK_TEAM_MINIMAL = {
  team: {
    id: "9",
    displayName: "Golden State Warriors",
    abbreviation: "GSW",
  },
};

const MOCK_ATS_RESPONSE = {
  teamATS: {
    wins: 32,
    losses: 40,
    pushes: 4,
  },
};

// ─── fetchTeam ────────────────────────────────────────────────────────────────

describe("fetchTeam", () => {
  it("正確解析球隊基本資訊", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_TEAM_RESPONSE);

    const team = await fetchTeam("nba", "13");

    expect(team.id).toBe("13");
    expect(team.name).toBe("Los Angeles Lakers");
    expect(team.abbreviation).toBe("LAL");
    expect(team.logo).toBe("https://a.espncdn.com/lal.png");
    expect(team.color).toBe("552583");
    expect(team.record).toBe("45-31");
    expect(team.standingSummary).toBe("4th in Pacific");
  });

  it("缺少 logos 時回傳空字串", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_TEAM_MINIMAL);

    const team = await fetchTeam("nba", "9");
    expect(team.logo).toBe("");
  });

  it("缺少 color 時回傳空字串", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_TEAM_MINIMAL);

    const team = await fetchTeam("nba", "9");
    expect(team.color).toBe("");
  });

  it("缺少 record 時回傳空字串", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_TEAM_MINIMAL);

    const team = await fetchTeam("nba", "9");
    expect(team.record).toBe("");
  });

  it("缺少 standingSummary 時回傳空字串", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_TEAM_MINIMAL);

    const team = await fetchTeam("nba", "9");
    expect(team.standingSummary).toBe("");
  });

  it("以正確 sportPath 和 teamId 呼叫 espnFetch", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_TEAM_RESPONSE);

    await fetchTeam("nba", "13");

    expect(mockEspnFetch).toHaveBeenCalledWith(
      "basketball/nba/teams/13",
      expect.objectContaining({ ttl: 600_000 })
    );
  });

  it("mlb 球隊使用正確的 sport path", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      team: {
        id: "10",
        displayName: "New York Yankees",
        abbreviation: "NYY",
      },
    });

    await fetchTeam("mlb", "10");

    const callArgs = mockEspnFetch.mock.calls[0];
    expect(callArgs[0]).toContain("baseball/mlb/teams/10");
  });
});

// ─── fetchTeamATS ─────────────────────────────────────────────────────────────

describe("fetchTeamATS", () => {
  it("正確解析 ATS 資料（wins, losses, pushes）", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_ATS_RESPONSE);

    const ats = await fetchTeamATS("nba", "13");

    expect(ats).not.toBeNull();
    expect(ats!.wins).toBe(32);
    expect(ats!.losses).toBe(40);
    expect(ats!.pushes).toBe(4);
  });

  it("teamATS 欄位不存在時回傳 null", async () => {
    mockEspnFetch.mockResolvedValueOnce({});

    const ats = await fetchTeamATS("nba", "13");
    expect(ats).toBeNull();
  });

  it("espnFetch 拋出例外時回傳 null", async () => {
    mockEspnFetch.mockRejectedValueOnce(new Error("Network error"));

    const ats = await fetchTeamATS("nba", "13");
    expect(ats).toBeNull();
  });

  it("以正確路徑呼叫 espnFetch", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_ATS_RESPONSE);

    await fetchTeamATS("nba", "13");

    expect(mockEspnFetch).toHaveBeenCalledWith(
      "basketball/nba/teams/13/ats",
      expect.any(Object)
    );
  });

  it("pushes 為 0 時正確解析", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      teamATS: { wins: 40, losses: 35, pushes: 0 },
    });

    const ats = await fetchTeamATS("nba", "2");
    expect(ats!.pushes).toBe(0);
  });
});
