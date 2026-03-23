import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../test-utils";

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { useGameDetail } from "@/hooks/useGameDetail";
import { useSession } from "next-auth/react";

const mockUseSession = vi.mocked(useSession);

// ─── 輔助函式 ─────────────────────────────────────────────────────────────────

function mockSessionGuest() {
  mockUseSession.mockReturnValue({
    data: null,
    status: "unauthenticated",
    update: vi.fn(),
  });
}

function mockSessionMember() {
  mockUseSession.mockReturnValue({
    data: { user: { name: "Test User", email: "test@example.com" }, expires: "2099-01-01" },
    status: "authenticated",
    update: vi.fn(),
  });
}

/** 建立一個回傳指定 body 的 fetch mock */
function mockFetchResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  };
}

/** 建立一個不完成的 fetch mock（pending state） */
function mockFetchPending() {
  return new Promise(() => {});
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

// ─── 訪客/會員 API 分流 ───────────────────────────────────────────────────────

describe("useGameDetail - API 分流", () => {
  it("訪客使用 /api/public/game", async () => {
    mockSessionGuest();

    // scoreboard + leaders fetch
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse({ games: [] }))
      .mockResolvedValueOnce(mockFetchResponse({ leaders: [] }));

    renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      const urls = mockFetch.mock.calls.map((c) => c[0].toString());
      expect(urls.some((u) => u.includes("/api/public/game"))).toBe(true);
      expect(urls.every((u) => !u.includes("/api/member/game"))).toBe(true);
    });
  });

  it("會員使用 /api/member/game", async () => {
    mockSessionMember();

    // scoreboard + leaders fetch
    mockFetch
      .mockResolvedValueOnce(mockFetchResponse({ games: [] }))
      .mockResolvedValueOnce(mockFetchResponse({ leaders: [] }));

    renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      const urls = mockFetch.mock.calls.map((c) => c[0].toString());
      const memberCalled = urls.some((u) => u.includes("/api/member/game"));
      expect(memberCalled).toBe(true);
    });
  });

  it("isMember 訪客時為 false", () => {
    mockSessionGuest();
    mockFetch.mockReturnValue(mockFetchPending());

    const { result } = renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isMember).toBe(false);
  });

  it("isMember 會員時為 true", () => {
    mockSessionMember();
    mockFetch.mockReturnValue(mockFetchPending());

    const { result } = renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isMember).toBe(true);
  });
});

// ─── Tab 條件查詢 ─────────────────────────────────────────────────────────────

describe("useGameDetail - tab 條件查詢", () => {
  beforeEach(() => {
    mockSessionGuest();
  });

  it("tab=summary 時 winProb/seasonSeries/pickCenter 查詢自動觸發", async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse({
        games: [],
        leaders: [],
        winprobability: [{ homeWinPct: 55, playId: "1", secondsLeft: 1000 }],
        seasonseries: { summary: "BOS leads", seriesScore: "3-1", games: [] },
        pickcenter: [],
      })
    );

    const { result } = renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      const urls = mockFetch.mock.calls.map((c) => c[0].toString());
      expect(urls.some((u) => u.includes("type=winprobability"))).toBe(true);
      expect(urls.some((u) => u.includes("type=seasonseries"))).toBe(true);
      expect(urls.some((u) => u.includes("type=pickcenter"))).toBe(true);
    });
  });

  it("tab=pbp 時 PBP 查詢觸發", async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse({
        games: [],
        leaders: [],
        plays: [],
        totalCount: 0,
      })
    );

    renderHook(() => useGameDetail("nba", "401633205", "pbp"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      const urls = mockFetch.mock.calls.map((c) => c[0].toString());
      expect(urls.some((u) => u.includes("type=plays"))).toBe(true);
    });
  });

  it("tab=boxscore 時 boxscore 查詢觸發", async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse({
        games: [],
        leaders: [],
        boxscore: null,
      })
    );

    renderHook(() => useGameDetail("nba", "401633205", "boxscore"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      const urls = mockFetch.mock.calls.map((c) => c[0].toString());
      expect(urls.some((u) => u.includes("type=boxscore"))).toBe(true);
    });
  });

  it("tab=injuries 時 injuries 查詢觸發", async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse({
        games: [],
        leaders: [],
        injuries: [],
      })
    );

    renderHook(() => useGameDetail("nba", "401633205", "injuries"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      const urls = mockFetch.mock.calls.map((c) => c[0].toString());
      expect(urls.some((u) => u.includes("type=injuries"))).toBe(true);
    });
  });

  it("tab=summary 時 PBP/boxscore/injuries 不自動觸發", async () => {
    mockFetch.mockResolvedValue(
      mockFetchResponse({ games: [], leaders: [], winprobability: [], seasonseries: null, pickcenter: [] })
    );

    renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    // 等待查詢穩定
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    const urls = mockFetch.mock.calls.map((c) => c[0].toString());
    // PBP、boxscore、injuries 不應在 summary tab 時觸發
    expect(urls.every((u) => !u.includes("type=plays"))).toBe(true);
    expect(urls.every((u) => !u.includes("type=boxscore"))).toBe(true);
    expect(urls.every((u) => !u.includes("type=injuries"))).toBe(true);
  });
});

// ─── 回傳值結構 ───────────────────────────────────────────────────────────────

describe("useGameDetail - 回傳值結構", () => {
  beforeEach(() => {
    mockSessionGuest();
    mockFetch.mockReturnValue(mockFetchPending());
  });

  it("初始狀態 plays 為空陣列", () => {
    const { result } = renderHook(() => useGameDetail("nba", "401633205", "pbp"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.plays).toEqual([]);
  });

  it("初始狀態 totalPlays 為 0", () => {
    const { result } = renderHook(() => useGameDetail("nba", "401633205", "pbp"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.totalPlays).toBe(0);
  });

  it("初始狀態 leaders 為空陣列", () => {
    const { result } = renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.leaders).toEqual([]);
  });

  it("初始狀態 boxScore 為 null", () => {
    const { result } = renderHook(() => useGameDetail("nba", "401633205", "boxscore"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.boxScore).toBeNull();
  });

  it("初始狀態 injuries 為空陣列", () => {
    const { result } = renderHook(() => useGameDetail("nba", "401633205", "injuries"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.injuries).toEqual([]);
  });

  it("初始狀態 game 為 null", () => {
    const { result } = renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.game).toBeNull();
  });
});

// ─── scoreboard 查詢取得 game info ────────────────────────────────────────────

describe("useGameDetail - game info 查詢", () => {
  it("從 scoreboard 找到對應 eventId 的 game", async () => {
    mockSessionGuest();

    const mockGame = {
      id: "401633205",
      status: "final",
      homeTeam: { id: "2", name: "波士頓塞爾提克", score: "110" },
      awayTeam: { id: "17", name: "布魯克林籃網", score: "98" },
    };

    mockFetch.mockResolvedValue(
      mockFetchResponse({
        games: [mockGame],
        leaders: [],
        winprobability: [],
        seasonseries: null,
        pickcenter: [],
      })
    );

    const { result } = renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(result.current.game).not.toBeNull();
    });

    expect(result.current.game!.id).toBe("401633205");
  });

  it("scoreboard 找不到對應 game 時 game 為 null", async () => {
    mockSessionGuest();

    mockFetch.mockResolvedValue(
      mockFetchResponse({
        games: [{ id: "999", status: "final" }],
        leaders: [],
      })
    );

    const { result } = renderHook(() => useGameDetail("nba", "401633205", "summary"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    // 找不到對應 id，game 仍為 null
    expect(result.current.game).toBeNull();
  });
});
