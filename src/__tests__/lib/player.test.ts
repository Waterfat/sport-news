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

import { fetchPlayer, fetchPlayerGameLog } from "@/lib/espn/player";
import { espnFetch } from "@/lib/espn/client";

const mockEspnFetch = vi.mocked(espnFetch);

beforeEach(() => {
  mockEspnFetch.mockReset();
});

// ─── Mock 資料 ────────────────────────────────────────────────────────────────

const MOCK_PLAYER_RESPONSE = {
  athlete: {
    id: "3945274",
    displayName: "Jayson Tatum",
    jersey: "0",
    position: { displayName: "Small Forward" },
    team: {
      id: "2",
      displayName: "Boston Celtics",
      abbreviation: "BOS",
      logos: [{ href: "https://a.espncdn.com/bos.png" }],
    },
    headshot: { href: "https://a.espncdn.com/tatum.png" },
    statistics: [
      {
        categories: [
          {
            name: "general",
            displayName: "General",
            stats: [
              {
                name: "points",
                displayName: "Points",
                value: 26.9,
                displayValue: "26.9",
              },
              {
                name: "rebounds",
                displayName: "Rebounds",
                value: 8.1,
                displayValue: "8.1",
              },
            ],
          },
        ],
      },
    ],
  },
};

const MOCK_PLAYER_MINIMAL = {
  athlete: {
    id: "9999",
    displayName: "Test Player",
  },
};

const MOCK_GAMELOG_RESPONSE = {
  categories: [
    {
      labels: ["PTS", "REB", "AST", "FG%"],
      events: [
        {
          eventDate: "2026-03-01T00:00:00Z",
          opponent: { displayName: "Miami Heat", abbreviation: "MIA" },
          gameResult: "W",
          stats: ["28", "7", "5", ".533"],
        },
        {
          eventDate: "2026-03-03T00:00:00Z",
          opponent: { abbreviation: "NYK" },
          gameResult: "L",
          stats: ["22", "10", "3", ".421"],
        },
      ],
    },
  ],
};

// ─── fetchPlayer ──────────────────────────────────────────────────────────────

describe("fetchPlayer", () => {
  it("正確解析球員基本資訊", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_RESPONSE);

    const player = await fetchPlayer("nba", "3945274");

    expect(player.id).toBe("3945274");
    expect(player.name).toBe("Jayson Tatum");
    expect(player.jersey).toBe("0");
    expect(player.position).toBe("Small Forward");
    expect(player.headshot).toBe("https://a.espncdn.com/tatum.png");
  });

  it("正確解析球隊資訊", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_RESPONSE);

    const player = await fetchPlayer("nba", "3945274");

    expect(player.team.id).toBe("2");
    expect(player.team.name).toBe("Boston Celtics");
    expect(player.team.abbreviation).toBe("BOS");
    expect(player.team.logo).toBe("https://a.espncdn.com/bos.png");
  });

  it("statistics categories 正確展開為 stats 陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_RESPONSE);

    const player = await fetchPlayer("nba", "3945274");

    expect(player.stats).toHaveLength(1);
    expect(player.stats[0].name).toBe("general");
    expect(player.stats[0].displayName).toBe("General");
    expect(player.stats[0].stats).toHaveLength(2);
    expect(player.stats[0].stats[0].name).toBe("points");
    expect(player.stats[0].stats[0].value).toBe(26.9);
  });

  it("缺少 headshot 時回傳空字串", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_MINIMAL);

    const player = await fetchPlayer("nba", "9999");
    expect(player.headshot).toBe("");
  });

  it("缺少 team 時回傳空字串 fallback", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_MINIMAL);

    const player = await fetchPlayer("nba", "9999");
    expect(player.team.id).toBe("");
    expect(player.team.name).toBe("");
    expect(player.team.abbreviation).toBe("");
    expect(player.team.logo).toBe("");
  });

  it("缺少 jersey 時回傳空字串", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_MINIMAL);

    const player = await fetchPlayer("nba", "9999");
    expect(player.jersey).toBe("");
  });

  it("缺少 statistics 時回傳空陣列", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_MINIMAL);

    const player = await fetchPlayer("nba", "9999");
    expect(player.stats).toEqual([]);
  });

  it("以正確路徑呼叫 espnFetch（/overview 端點）", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_PLAYER_RESPONSE);

    await fetchPlayer("nba", "3945274");

    expect(mockEspnFetch).toHaveBeenCalledWith(
      "basketball/nba/athletes/3945274/overview",
      expect.objectContaining({ ttl: 600_000 })
    );
  });

  it("多個 statistics 群組正確 flatMap", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      athlete: {
        id: "1",
        displayName: "Test",
        statistics: [
          {
            categories: [
              { name: "cat1", displayName: "Cat1", stats: [] },
              { name: "cat2", displayName: "Cat2", stats: [] },
            ],
          },
          {
            categories: [
              { name: "cat3", displayName: "Cat3", stats: [] },
            ],
          },
        ],
      },
    });

    const player = await fetchPlayer("nba", "1");
    // 2 + 1 = 3 categories after flatMap
    expect(player.stats).toHaveLength(3);
  });
});

// ─── fetchPlayerGameLog ───────────────────────────────────────────────────────

describe("fetchPlayerGameLog", () => {
  it("正確解析 labels 和 events", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_GAMELOG_RESPONSE);

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");

    expect(gamelog.labels).toEqual(["PTS", "REB", "AST", "FG%"]);
    expect(gamelog.entries).toHaveLength(2);
  });

  it("event 資料正確對應", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_GAMELOG_RESPONSE);

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");
    const first = gamelog.entries[0];

    expect(first.date).toBe("2026-03-01T00:00:00Z");
    expect(first.opponent).toBe("Miami Heat"); // displayName 優先
    expect(first.result).toBe("W");
    expect(first.stats.PTS).toBe("28");
    expect(first.stats.REB).toBe("7");
    expect(first.stats["FG%"]).toBe(".533");
  });

  it("opponent 只有 abbreviation 時使用 abbreviation", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_GAMELOG_RESPONSE);

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");
    const second = gamelog.entries[1];

    expect(second.opponent).toBe("NYK");
  });

  it("stats 欄位索引對應 labels", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_GAMELOG_RESPONSE);

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");
    const second = gamelog.entries[1];

    expect(second.stats.PTS).toBe("22");
    expect(second.stats.REB).toBe("10");
    expect(second.stats.AST).toBe("3");
  });

  it("categories 為空時回傳空 labels 和 entries", async () => {
    mockEspnFetch.mockResolvedValueOnce({ categories: [] });

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");

    expect(gamelog.labels).toEqual([]);
    expect(gamelog.entries).toEqual([]);
  });

  it("無 categories 欄位時回傳空結果", async () => {
    mockEspnFetch.mockResolvedValueOnce({});

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");

    expect(gamelog.labels).toEqual([]);
    expect(gamelog.entries).toEqual([]);
  });

  it("espnFetch 拋出例外時回傳空結果並不 throw", async () => {
    mockEspnFetch.mockRejectedValueOnce(new Error("Network error"));

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");

    expect(gamelog.labels).toEqual([]);
    expect(gamelog.entries).toEqual([]);
  });

  it("以正確路徑呼叫 espnFetch（/gamelog 端點）", async () => {
    mockEspnFetch.mockResolvedValueOnce(MOCK_GAMELOG_RESPONSE);

    await fetchPlayerGameLog("nba", "nba", "3945274");

    expect(mockEspnFetch).toHaveBeenCalledWith(
      "basketball/nba/athletes/3945274/gamelog",
      expect.any(Object)
    );
  });

  it("stats 長度不足 labels 時以 '-' 填補", async () => {
    mockEspnFetch.mockResolvedValueOnce({
      categories: [
        {
          labels: ["PTS", "REB", "AST"],
          events: [
            {
              eventDate: "2026-03-01",
              opponent: { displayName: "Heat" },
              gameResult: "W",
              stats: ["28"], // 只有一個值
            },
          ],
        },
      ],
    });

    const gamelog = await fetchPlayerGameLog("nba", "nba", "3945274");
    const entry = gamelog.entries[0];

    expect(entry.stats.PTS).toBe("28");
    expect(entry.stats.REB).toBe("-"); // 填補 fallback
    expect(entry.stats.AST).toBe("-");
  });
});
