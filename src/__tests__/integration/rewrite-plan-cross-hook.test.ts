/**
 * Integration tests: Cross-hook interaction between useRewritePolling and usePlanManager
 *
 * Tests the scenarios where actions in one hook affect the other,
 * mimicking the wiring in ArticlesPage.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRewritePolling } from "@/hooks/useRewritePolling";
import { usePlanManager } from "@/hooks/usePlanManager";
import { POLLING_INTERVAL_MS } from "@/lib/constants";
import { createQueryWrapper } from "../test-utils";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("alert", vi.fn());

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast: mockToast }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStatusResponse(currentTask: unknown = null) {
  return { lastCompleted: null, currentTask, newArticleCount: 0 };
}

function makePlansResponse(count = 2) {
  const plans = Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    title: `Plan ${i + 1}`,
    raw_article_ids: [],
    league: "NBA",
    plan_type: "analysis",
    created_at: "2024-01-01T00:00:00Z",
    writer_personas: null,
  }));
  return { plans, rawArticleMap: {}, earliestCrawledAt: null };
}

/**
 * Combined hook that mirrors page.tsx wiring.
 */
function useCrossHookWiring() {
  const planManager = usePlanManager();

  const rewritePolling = useRewritePolling({
    onPollComplete: () => {
      fetch("/api/articles/generated?page=1&limit=20");
    },
    onPlanPollComplete: () => {
      planManager.fetchPlans();
      fetch("/api/articles/generated?page=1&limit=20");
    },
    onProducePollComplete: () => {
      planManager.fetchPlans();
      fetch("/api/articles/generated?page=1&limit=20");
    },
  });

  return { planManager, rewritePolling };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. triggerPlan calls clearPlans, which actually empties plans state
// ---------------------------------------------------------------------------

describe("triggerPlan → clearPlans cross-hook", () => {
  it("calling triggerPlan with clearPlans clears the planManager plans", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(3) };
      }
      if (url === "/api/rewrite/plan" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      return new Promise(() => {});
    });

    const { result } = renderHook(() => useCrossHookWiring(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(3);
    });

    // triggerPlan with clearPlans (mimics page.tsx)
    await act(async () => {
      await result.current.rewritePolling.triggerPlan(result.current.planManager.clearPlans);
    });

    expect(result.current.planManager.plans).toEqual([]);
    expect(result.current.planManager.selectedPlanIds.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. handlePlanProduce → triggerProduce, runningMode set to "produce"
// ---------------------------------------------------------------------------

describe("handlePlanProduce → triggerProduce cross-hook", () => {
  it("sets runningMode to produce when handlePlanProduce calls triggerProduce", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(2) };
      }
      if (url === "/api/rewrite/plan/produce" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      return new Promise(() => {});
    });

    const { result } = renderHook(() => useCrossHookWiring(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(2);
    });

    act(() => result.current.planManager.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.planManager.handlePlanProduce(() => {
        result.current.rewritePolling.triggerProduce();
      });
    });

    expect(result.current.rewritePolling.runningMode).toBe("produce");
    expect(result.current.planManager.planLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Produce completion triggers both fetchPlans and fetchArticles
// ---------------------------------------------------------------------------

describe("produce completion → cross-hook refresh", () => {
  it("onProducePollComplete calls fetchPlans and fetchArticles", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const callLog: string[] = [];

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(2) };
      }
      if (url === "/api/rewrite/plan/produce" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useCrossHookWiring(), { wrapper: createQueryWrapper() });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(2);
    });

    // Select and produce
    act(() => result.current.planManager.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.planManager.handlePlanProduce(() => {
        result.current.rewritePolling.triggerProduce();
      });
    });

    // Polling: task completes on first tick
    callLog.length = 0;

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(null) };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(1) };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(result.current.rewritePolling.runningMode).toBeNull();
    });

    const planFetches = callLog.filter((c) => c === "GET /api/rewrite/plan");
    const articleFetches = callLog.filter((c) => c.startsWith("GET /api/articles/generated"));

    expect(planFetches.length).toBeGreaterThanOrEqual(1);
    expect(articleFetches.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Plan API failure (500) → both hooks recover correctly
// ---------------------------------------------------------------------------

describe("plan API failure recovery", () => {
  it("500 from plan POST resets runningMode and planTriggering", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(2) };
      }
      if (url === "/api/rewrite/plan" && init?.method === "POST") {
        return { ok: false, json: async () => ({ error: "Internal Server Error" }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useCrossHookWiring(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(2);
    });

    await act(async () => {
      await result.current.rewritePolling.triggerPlan(result.current.planManager.clearPlans);
    });

    // runningMode should be reset to null on failure
    expect(result.current.rewritePolling.runningMode).toBeNull();
    expect(result.current.rewritePolling.planTriggering).toBe(false);

    // toast.error should have been called for plan API failure
    expect(mockToast.error).toHaveBeenCalled();
  });

  it("network error on plan POST resets runningMode", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse() };
      }
      if (url === "/api/rewrite/plan" && init?.method === "POST") {
        throw new Error("Network failure");
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useCrossHookWiring(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(2);
    });

    await act(async () => {
      await result.current.rewritePolling.triggerPlan();
    });

    expect(result.current.rewritePolling.runningMode).toBeNull();
    expect(result.current.rewritePolling.planTriggering).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Produce API failure → planLoading resets to false
// ---------------------------------------------------------------------------

describe("produce API failure recovery", () => {
  it("500 from produce POST resets planLoading to false", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(2) };
      }
      if (url === "/api/rewrite/plan/produce" && init?.method === "POST") {
        return { ok: false, json: async () => ({ error: "Produce failed" }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useCrossHookWiring(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(2);
    });

    act(() => result.current.planManager.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.planManager.handlePlanProduce(() => {
        result.current.rewritePolling.triggerProduce();
      });
    });

    // planLoading should be false after failure
    expect(result.current.planManager.planLoading).toBe(false);
    // toast.error should be called for produce failures
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  it("network error on produce POST resets planLoading to false", async () => {
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(2) };
      }
      if (url === "/api/rewrite/plan/produce" && init?.method === "POST") {
        throw new Error("Network failure");
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useCrossHookWiring(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(2);
    });

    act(() => result.current.planManager.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.planManager.handlePlanProduce(() => {
        result.current.rewritePolling.triggerProduce();
      });
    });

    expect(result.current.planManager.planLoading).toBe(false);
  });
});
