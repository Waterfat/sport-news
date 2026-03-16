/**
 * Integration tests: ArticlesPage callback wiring
 *
 * Verifies that useRewritePolling + usePlanManager are wired together
 * the same way as in page.tsx — specifically the callback chains that
 * connect polling completion to data refreshes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRewritePolling } from "@/hooks/useRewritePolling";
import { usePlanManager } from "@/hooks/usePlanManager";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("confirm", vi.fn(() => true));
vi.stubGlobal("alert", vi.fn());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStatusResponse(currentTask: unknown = null) {
  return { lastCompleted: null, currentTask, newArticleCount: 0 };
}

const activeTask = { status: "running", created_at: "2024-01-01T00:00:00Z" };

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
 * Mimics page.tsx wiring: renders both hooks with the same callback pattern.
 * We track which API endpoints are called to verify wiring correctness.
 */
function useArticlesPageWiring() {
  const planManager = usePlanManager();

  const rewritePolling = useRewritePolling({
    onPollComplete: () => {
      // page.tsx: fetchArticles()
      fetch("/api/articles/generated?page=1&limit=20");
    },
    onPlanPollComplete: () => {
      // page.tsx: planManager.fetchPlans() + fetchArticles()
      planManager.fetchPlans();
      fetch("/api/articles/generated?page=1&limit=20");
    },
    onProducePollComplete: () => {
      // page.tsx: planManager.fetchPlans() + fetchArticles()
      planManager.fetchPlans();
      fetch("/api/articles/generated?page=1&limit=20");
    },
  });

  return { planManager, rewritePolling };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. onPlanPollComplete triggers both fetchPlans and fetchArticles
// ---------------------------------------------------------------------------

describe("onPlanPollComplete wiring", () => {
  it("triggers both fetchPlans and fetchArticles when plan polling completes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Track calls by URL
    const callLog: string[] = [];

    // Mount: no active task
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);

      if (url === "/api/rewrite" && (!init || !init.method || init.method === "GET")) {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init || !init.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse() };
      }
      if (url === "/api/rewrite/plan" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useArticlesPageWiring());

    // Wait for mount fetches
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Clear log to isolate triggerPlan flow
    callLog.length = 0;

    // triggerPlan → POST /api/rewrite/plan → start polling
    await act(async () => {
      await result.current.rewritePolling.triggerPlan(result.current.planManager.clearPlans);
    });

    expect(callLog).toContain("POST /api/rewrite/plan");

    // Polling: first tick returns active task
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);

      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(activeTask) };
      }
      if (url === "/api/rewrite/plan") {
        return { ok: true, json: async () => makePlansResponse(3) };
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

    // Second tick: task completes → triggers onPlanPollComplete
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);

      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(null) };
      }
      if (url === "/api/rewrite/plan") {
        return { ok: true, json: async () => makePlansResponse(3) };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    callLog.length = 0; // Clear to isolate completion callbacks

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(result.current.rewritePolling.runningMode).toBeNull();
    });

    // Verify both fetchPlans (GET /api/rewrite/plan) and fetchArticles were called
    const planFetches = callLog.filter((c) => c === "GET /api/rewrite/plan");
    const articleFetches = callLog.filter((c) => c.startsWith("GET /api/articles/generated"));

    expect(planFetches.length).toBeGreaterThanOrEqual(1);
    expect(articleFetches.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 2. onProducePollComplete triggers both fetchPlans and fetchArticles
// ---------------------------------------------------------------------------

describe("onProducePollComplete wiring", () => {
  it("triggers both fetchPlans and fetchArticles when produce polling completes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const callLog: string[] = [];

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);

      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse() };
      }
      if (url === "/api/rewrite/plan/produce" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useArticlesPageWiring());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Select a plan and trigger produce (mimics page.tsx handlePlanProduce)
    act(() => result.current.planManager.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.planManager.handlePlanProduce(() => {
        result.current.rewritePolling.triggerProduce();
      });
    });

    // Polling: active task on first tick
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(activeTask) };
      }
      if (url === "/api/rewrite/plan") {
        return { ok: true, json: async () => makePlansResponse() };
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

    // Second tick: task done → triggers onProducePollComplete
    callLog.length = 0;

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(null) };
      }
      if (url === "/api/rewrite/plan") {
        return { ok: true, json: async () => makePlansResponse() };
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
// 3. onPollComplete (page-load auto-detect) only triggers fetchArticles
// ---------------------------------------------------------------------------

describe("onPollComplete wiring (page-load auto-detect)", () => {
  it("only triggers fetchArticles, not an extra fetchPlans", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const callLog: string[] = [];

    // Mount: active task → auto-detect triggers polling
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(activeTask) };
      }
      if (url === "/api/rewrite/plan") {
        return { ok: true, json: async () => makePlansResponse() };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useArticlesPageWiring());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Should auto-detect the running task
    await waitFor(() => {
      expect(result.current.rewritePolling.runningMode).toBe("rewrite");
    });

    // Now task completes
    callLog.length = 0;

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(null) };
      }
      if (url === "/api/rewrite/plan") {
        return { ok: true, json: async () => makePlansResponse() };
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

    // fetchArticles should be called
    const articleFetches = callLog.filter((c) => c.startsWith("GET /api/articles/generated"));
    expect(articleFetches.length).toBeGreaterThanOrEqual(1);

    // fetchPlans should NOT be called extra (only the polling status fetch)
    // The only /api/rewrite/plan calls should be from the polling tick itself, not from onPollComplete
    const planFetchesFromCallback = callLog.filter(
      (c) => c === "GET /api/rewrite/plan"
    );
    // onPollComplete does NOT call fetchPlans, so no extra plan fetch calls
    // (usePlanManager doesn't auto-refetch on poll complete — only onPlanPollComplete does)
    expect(planFetchesFromCallback.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. triggerPlan full chain: clearPlans → POST → poll → callbacks
// ---------------------------------------------------------------------------

describe("triggerPlan full chain", () => {
  it("clearPlans → POST → poll → onPlanPollComplete fires fetchPlans + fetchArticles", async () => {
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
      if (url === "/api/rewrite/plan" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useArticlesPageWiring());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Verify plans loaded
    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(2);
    });

    // triggerPlan with clearPlans (mimics page.tsx handleTriggerPlan)
    await act(async () => {
      await result.current.rewritePolling.triggerPlan(result.current.planManager.clearPlans);
    });

    // clearPlans should have emptied plans
    expect(result.current.planManager.plans).toEqual([]);
    expect(result.current.rewritePolling.runningMode).toBe("plan");

    // Complete the polling
    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse(null) };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(5) };
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

    // After onPlanPollComplete, plans should be refreshed
    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(5);
    });
  });
});

// ---------------------------------------------------------------------------
// 5. handlePlanProduce full chain: POST produce → triggerProduce → poll → callbacks
// ---------------------------------------------------------------------------

describe("handlePlanProduce full chain", () => {
  it("POST produce → triggerProduce → poll complete → fetchPlans + fetchArticles", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const callLog: string[] = [];

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (url === "/api/rewrite/plan" && (!init?.method || init.method === "GET")) {
        return { ok: true, json: async () => makePlansResponse(3) };
      }
      if (url === "/api/rewrite/plan/produce" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      if (url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { result } = renderHook(() => useArticlesPageWiring());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(result.current.planManager.plans).toHaveLength(3);
    });

    // Select plans and trigger produce (mimics page.tsx handlePlanProduce)
    act(() => {
      result.current.planManager.togglePlanSelect("p1");
      result.current.planManager.togglePlanSelect("p2");
    });

    await act(async () => {
      await result.current.planManager.handlePlanProduce(() => {
        result.current.rewritePolling.triggerProduce();
      });
    });

    expect(result.current.rewritePolling.runningMode).toBe("produce");
    // Produced plans should be removed from local list
    expect(result.current.planManager.plans.find((p) => p.id === "p1")).toBeUndefined();
    expect(result.current.planManager.plans.find((p) => p.id === "p2")).toBeUndefined();

    // Complete polling
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

    // Verify onProducePollComplete fired: both fetchPlans and fetchArticles
    const planFetches = callLog.filter((c) => c === "GET /api/rewrite/plan");
    const articleFetches = callLog.filter((c) => c.startsWith("GET /api/articles/generated"));

    expect(planFetches.length).toBeGreaterThanOrEqual(1);
    expect(articleFetches.length).toBeGreaterThanOrEqual(1);
  });
});
