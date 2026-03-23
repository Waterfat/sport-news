import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// 每次測試重置模組，清除 standings 的 in-memory cache
let fetchStandings: typeof import("@/lib/espn/standings").fetchStandings;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  const mod = await import("@/lib/espn/standings");
  fetchStandings = mod.fetchStandings;
});

// ─── Mock 資料 ────────────────────────────────────────────────────────────────

const MOCK_NBA_STANDINGS_RESPONSE = {
  children: [
    {
      name: "Eastern Conference",
      standings: {
        entries: [
          {
            team: {
              id: "2",
              displayName: "Boston Celtics",
              abbreviation: "BOS",
              logos: [{ href: "https://a.espncdn.com/bos.png" }],
            },
            stats: [
              { name: "wins", displayValue: "62" },
              { name: "losses", displayValue: "14" },
              { name: "winPercent", displayValue: ".816" },
              { name: "gamesBehind", displayValue: "-" },
              { name: "Home", displayValue: "30-7" },
              { name: "Road", displayValue: "32-7" },
              { name: "Last Ten Games", displayValue: "8-2" },
              { name: "streak", displayValue: "W3" },
            ],
          },
          {
            team: {
              id: "1",
              displayName: "Atlanta Hawks",
              abbreviation: "ATL",
              logos: [{ href: "https://a.espncdn.com/atl.png" }],
            },
            stats: [
              { name: "wins", displayValue: "40" },
              { name: "losses", displayValue: "36" },
              { name: "winPercent", displayValue: ".526" },
              { name: "gamesBehind", displayValue: "22" },
              { name: "Home", displayValue: "22-15" },
              { name: "Road", displayValue: "18-21" },
              { name: "Last Ten Games", displayValue: "5-5" },
            ],
          },
        ],
      },
    },
    {
      name: "Western Conference",
      standings: {
        entries: [
          {
            team: {
              id: "13",
              displayName: "Los Angeles Lakers",
              abbreviation: "LAL",
              logos: [{ href: "https://a.espncdn.com/lal.png" }],
            },
            stats: [
              { name: "winPercent", displayValue: ".645" },
            ],
          },
        ],
      },
    },
  ],
};

// ─── fetchStandings ───────────────────────────────────────────────────────────

describe("fetchStandings", () => {
  it("正確解析分組名稱（含中文化）", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_NBA_STANDINGS_RESPONSE,
    });

    const groups = await fetchStandings("nba");
    expect(groups).toHaveLength(2);
    expect(groups[0].name).toBe("東區");
    expect(groups[1].name).toBe("西區");
  });

  it("正確解析球隊資料（id, name, abbreviation, logo, stats）", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_NBA_STANDINGS_RESPONSE,
    });

    const groups = await fetchStandings("nba");
    const eastern = groups[0];

    // 確認球隊數量（已排序）
    expect(eastern.entries).toHaveLength(2);

    // 排序後 Boston (0.816) 應排第一
    const celtics = eastern.entries[0];
    expect(celtics.teamId).toBe("2");
    expect(celtics.teamName).toBe("波士頓塞爾提克");
    expect(celtics.abbreviation).toBe("BOS");
    expect(celtics.logo).toBe("https://a.espncdn.com/bos.png");
  });

  it("球隊按 winPercent 降序排列", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_NBA_STANDINGS_RESPONSE,
    });

    const groups = await fetchStandings("nba");
    const eastern = groups[0];

    // Boston (0.816) > Atlanta (0.526)
    expect(eastern.entries[0].teamName).toBe("波士頓塞爾提克");
    expect(eastern.entries[1].teamName).toBe("亞特蘭大老鷹");
  });

  it("stats name 映射：Road → Away, Last Ten Games → L10", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_NBA_STANDINGS_RESPONSE,
    });

    const groups = await fetchStandings("nba");
    const celtics = groups[0].entries[0];

    // Road 應映射為 Away
    expect(celtics.stats.Away).toBe("32-7");
    expect(celtics.stats.Road).toBeUndefined();

    // Last Ten Games 應映射為 L10
    expect(celtics.stats.L10).toBe("8-2");
    expect(celtics.stats["Last Ten Games"]).toBeUndefined();
  });

  it("未映射的 stat name 保持原樣", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_NBA_STANDINGS_RESPONSE,
    });

    const groups = await fetchStandings("nba");
    const celtics = groups[0].entries[0];

    expect(celtics.stats.wins).toBe("62");
    expect(celtics.stats.losses).toBe("14");
    expect(celtics.stats.winPercent).toBe(".816");
    expect(celtics.stats.Home).toBe("30-7");
  });

  it("URL 使用 /apis/v2/ 路徑（非 /apis/site/v2/）", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_NBA_STANDINGS_RESPONSE,
    });

    await fetchStandings("nba");
    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).toContain("/apis/v2/sports");
    expect(calledUrl).not.toContain("/apis/site/v2/sports");
    expect(calledUrl).toContain("basketball/nba/standings");
  });

  it("API 回傳 non-ok 狀態時回傳空陣列", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const groups = await fetchStandings("nba");
    expect(groups).toEqual([]);
  });

  it("網路錯誤時回傳空陣列", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network timeout"));

    const groups = await fetchStandings("nba");
    expect(groups).toEqual([]);
  });

  it("children 欄位缺失時回傳空陣列", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const groups = await fetchStandings("nba");
    expect(groups).toEqual([]);
  });

  it("group 的 entries 為空時回傳空 entries", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        children: [
          {
            name: "Eastern Conference",
            standings: { entries: [] },
          },
        ],
      }),
    });

    const groups = await fetchStandings("nba");
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toEqual([]);
  });

  it("mlb 使用正確的 sport path", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ children: [] }),
    });

    await fetchStandings("mlb");
    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).toContain("baseball/mlb/standings");
  });

  it("快取命中時不重複請求", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_NBA_STANDINGS_RESPONSE,
    });

    const first = await fetchStandings("nba");
    const second = await fetchStandings("nba");

    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    // 快取命中，同一測試內只發一次 fetch
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("缺少 standings 欄位的 group 回傳空 entries", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        children: [
          { name: "Eastern Conference" }, // 沒有 standings 欄位
        ],
      }),
    });

    const groups = await fetchStandings("nba");
    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toEqual([]);
  });
});
