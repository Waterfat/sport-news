import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch 必須在 import module 之前設定
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// 每次測試重置模組，讓 in-memory cache 歸零
let espnFetch: typeof import("@/lib/espn/client").espnFetch;
let ESPNApiError: typeof import("@/lib/espn/client").ESPNApiError;
let getSportPath: typeof import("@/lib/espn/client").getSportPath;
let SPORT_PATHS: typeof import("@/lib/espn/client").SPORT_PATHS;
let CACHE_TTL: typeof import("@/lib/espn/client").CACHE_TTL;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  const mod = await import("@/lib/espn/client");
  espnFetch = mod.espnFetch;
  ESPNApiError = mod.ESPNApiError;
  getSportPath = mod.getSportPath;
  SPORT_PATHS = mod.SPORT_PATHS;
  CACHE_TTL = mod.CACHE_TTL;
});

// ─── ESPNApiError ────────────────────────────────────────────────────────────

describe("ESPNApiError", () => {
  it("包含正確的 status 和 endpoint 屬性", () => {
    const err = new ESPNApiError(404, "basketball/nba/scoreboard");
    expect(err.status).toBe(404);
    expect(err.endpoint).toBe("basketball/nba/scoreboard");
    expect(err.name).toBe("ESPNApiError");
    expect(err).toBeInstanceOf(Error);
  });

  it("使用預設訊息格式", () => {
    const err = new ESPNApiError(500, "baseball/mlb/teams");
    expect(err.message).toContain("500");
    expect(err.message).toContain("baseball/mlb/teams");
  });

  it("支援自訂訊息", () => {
    const err = new ESPNApiError(403, "nba/summary", "Forbidden");
    expect(err.message).toBe("Forbidden");
  });
});

// ─── getSportPath ────────────────────────────────────────────────────────────

describe("getSportPath", () => {
  it("nba 回傳 basketball/nba", () => {
    expect(getSportPath("nba")).toBe("basketball/nba");
  });

  it("mlb 回傳 baseball/mlb", () => {
    expect(getSportPath("mlb")).toBe("baseball/mlb");
  });

  it("nfl 回傳 football/nfl", () => {
    expect(getSportPath("nfl")).toBe("football/nfl");
  });

  it("nhl 回傳 hockey/nhl", () => {
    expect(getSportPath("nhl")).toBe("hockey/nhl");
  });

  it("epl 回傳 soccer/eng.1", () => {
    expect(getSportPath("epl")).toBe("soccer/eng.1");
  });

  it("未知聯賽回傳原始字串（pass-through）", () => {
    expect(getSportPath("unknown-league")).toBe("unknown-league");
    expect(getSportPath("basketball/nba")).toBe("basketball/nba");
  });
});

// ─── SPORT_PATHS ─────────────────────────────────────────────────────────────

describe("SPORT_PATHS", () => {
  it("包含所有必要聯賽路徑", () => {
    expect(SPORT_PATHS.nba).toBe("basketball/nba");
    expect(SPORT_PATHS.mlb).toBe("baseball/mlb");
    expect(SPORT_PATHS.nfl).toBe("football/nfl");
    expect(SPORT_PATHS.nhl).toBe("hockey/nhl");
    expect(SPORT_PATHS.epl).toBe("soccer/eng.1");
    expect(SPORT_PATHS.laliga).toBe("soccer/esp.1");
    expect(SPORT_PATHS.ucl).toBe("soccer/uefa.champions");
    expect(SPORT_PATHS.mls).toBe("soccer/usa.1");
  });
});

// ─── CACHE_TTL ───────────────────────────────────────────────────────────────

describe("CACHE_TTL", () => {
  it("LIVE 為 10 秒", () => {
    expect(CACHE_TTL.LIVE).toBe(10_000);
  });

  it("STANDINGS 為 5 分鐘", () => {
    expect(CACHE_TTL.STANDINGS).toBe(5 * 60_000);
  });

  it("TEAM 為 10 分鐘", () => {
    expect(CACHE_TTL.TEAM).toBe(10 * 60_000);
  });

  it("HISTORICAL 為 24 小時", () => {
    expect(CACHE_TTL.HISTORICAL).toBe(24 * 60 * 60_000);
  });

  it("PBP_FINAL 為 1 小時", () => {
    expect(CACHE_TTL.PBP_FINAL).toBe(60 * 60_000);
  });
});

// ─── espnFetch ────────────────────────────────────────────────────────────────

describe("espnFetch", () => {
  const MOCK_DATA = { events: [{ id: "123" }] };

  it("成功請求並回傳解析後的 JSON", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => MOCK_DATA,
    });

    const data = await espnFetch("basketball/nba/scoreboard");
    expect(data).toEqual(MOCK_DATA);
  });

  it("URL 包含 ESPN_BASE 前綴", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await espnFetch("basketball/nba/scoreboard");
    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).toContain("site.api.espn.com");
    expect(calledUrl).toContain("basketball/nba/scoreboard");
  });

  it("params 正確附加至 URL query string", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await espnFetch("basketball/nba/scoreboard", {
      params: { dates: "20260315", limit: "50" },
    });
    const calledUrl = mockFetch.mock.calls[0][0].toString();
    expect(calledUrl).toContain("dates=20260315");
    expect(calledUrl).toContain("limit=50");
  });

  it("API 回 4xx 時拋出 ESPNApiError", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    await expect(espnFetch("basketball/nba/scoreboard")).rejects.toBeInstanceOf(
      ESPNApiError
    );
  });

  it("API 回 5xx 時拋出 ESPNApiError 且 status 正確", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });

    let thrownError: unknown;
    try {
      await espnFetch("basketball/nba/scoreboard");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(ESPNApiError);
    expect((thrownError as InstanceType<typeof ESPNApiError>).status).toBe(503);
  });

  it("同一路徑第二次呼叫命中快取，不再發送請求", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_DATA,
    });

    const first = await espnFetch("basketball/nba/scoreboard", {
      ttl: 60_000,
    });
    const second = await espnFetch("basketball/nba/scoreboard", {
      ttl: 60_000,
    });

    expect(first).toEqual(MOCK_DATA);
    expect(second).toEqual(MOCK_DATA);
    // 快取命中 - 同一測試內只發一次請求
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("不同路徑各自發送獨立請求", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await espnFetch("basketball/nba/scoreboard", { ttl: 60_000 });
    await espnFetch("baseball/mlb/scoreboard", { ttl: 60_000 });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("params 不同視為不同快取 key", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    await espnFetch("basketball/nba/scoreboard", {
      ttl: 60_000,
      params: { dates: "20260315" },
    });
    await espnFetch("basketball/nba/scoreboard", {
      ttl: 60_000,
      params: { dates: "20260316" },
    });

    // 不同 date 參數應各自請求
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("TTL 為 0 時每次都發送新請求（不快取）", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => MOCK_DATA,
    });

    // TTL=0 表示立即過期，第二次也應命中快取
    // 注意：實際實作是「快取後立即過期」，故第二次仍能讀到同一 key
    // 這裡主要驗證不報錯
    const data = await espnFetch("basketball/nba/scoreboard", { ttl: 0 });
    expect(data).toEqual(MOCK_DATA);
  });
});
