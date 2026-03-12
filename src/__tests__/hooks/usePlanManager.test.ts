import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePlanManager } from "@/hooks/usePlanManager";
import type { PlanItem, RawArticleInfo } from "@/components/admin/PlansTable";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("confirm", vi.fn(() => true));
vi.stubGlobal("alert", vi.fn());

function makePlan(id: string, title = `Plan ${id}`): PlanItem {
  return {
    id,
    title,
    raw_article_ids: [],
    league: "NBA",
    plan_type: "analysis",
    created_at: "2024-01-01T00:00:00Z",
    writer_personas: null,
  };
}

function makeRawArticleMap(ids: string[]): Record<string, RawArticleInfo> {
  const map: Record<string, RawArticleInfo> = {};
  for (const id of ids) {
    map[id] = { title: `Article ${id}`, source: "ESPN", url: `https://espn.com/${id}` };
  }
  return map;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlanManager - initial state", () => {
  it("starts with empty plans, empty rawArticleMap, empty selection, and planLoading false", () => {
    // Keep fetch pending so we see initial state
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlanManager());

    expect(result.current.plans).toEqual([]);
    expect(result.current.rawArticleMap).toEqual({});
    expect(result.current.selectedPlanIds.size).toBe(0);
    expect(result.current.planLoading).toBe(false);
  });

  it("exposes all required handlers", () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlanManager());

    expect(typeof result.current.fetchPlans).toBe("function");
    expect(typeof result.current.clearPlans).toBe("function");
    expect(typeof result.current.handlePlanProduce).toBe("function");
    expect(typeof result.current.handlePlanDelete).toBe("function");
    expect(typeof result.current.togglePlanSelect).toBe("function");
    expect(typeof result.current.togglePlanSelectAll).toBe("function");
  });
});

describe("usePlanManager - fetchPlans", () => {
  it("calls /api/rewrite/plan on mount and populates plans and rawArticleMap", async () => {
    const plans = [makePlan("1"), makePlan("2")];
    const rawArticleMap = makeRawArticleMap(["a1", "a2"]);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans, rawArticleMap }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => {
      expect(result.current.plans).toHaveLength(2);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/rewrite/plan");
    expect(result.current.plans).toEqual(plans);
    expect(result.current.rawArticleMap).toEqual(rawArticleMap);
  });

  it("uses empty arrays/objects as fallback when response lacks fields", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    expect(result.current.plans).toEqual([]);
    expect(result.current.rawArticleMap).toEqual({});
  });

  it("does not throw when fetch rejects", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    const { result } = renderHook(() => usePlanManager());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.plans).toEqual([]);
  });

  it("manual fetchPlans call refreshes plans", async () => {
    const firstPlans = [makePlan("1")];
    const secondPlans = [makePlan("1"), makePlan("2")];

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ plans: firstPlans, rawArticleMap: {} }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ plans: secondPlans, rawArticleMap: {} }) });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    await act(async () => {
      await result.current.fetchPlans();
    });

    expect(result.current.plans).toHaveLength(2);
  });
});

describe("usePlanManager - clearPlans", () => {
  it("resets plans and selection", async () => {
    const plans = [makePlan("1"), makePlan("2")];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans, rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(2));

    // Select one plan first
    act(() => result.current.togglePlanSelect("1"));
    expect(result.current.selectedPlanIds.has("1")).toBe(true);

    act(() => result.current.clearPlans());

    expect(result.current.plans).toEqual([]);
    expect(result.current.selectedPlanIds.size).toBe(0);
  });
});

describe("usePlanManager - togglePlanSelect", () => {
  it("adds an id to the selection when not already selected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [makePlan("plan-1")], rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    act(() => result.current.togglePlanSelect("plan-1"));

    expect(result.current.selectedPlanIds.has("plan-1")).toBe(true);
  });

  it("removes an id from the selection when already selected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [makePlan("plan-1")], rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    act(() => result.current.togglePlanSelect("plan-1"));
    expect(result.current.selectedPlanIds.has("plan-1")).toBe(true);

    act(() => result.current.togglePlanSelect("plan-1"));
    expect(result.current.selectedPlanIds.has("plan-1")).toBe(false);
  });

  it("can select multiple ids independently", async () => {
    const plans = [makePlan("p1"), makePlan("p2"), makePlan("p3")];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans, rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(3));

    act(() => {
      result.current.togglePlanSelect("p1");
      result.current.togglePlanSelect("p3");
    });

    expect(result.current.selectedPlanIds.has("p1")).toBe(true);
    expect(result.current.selectedPlanIds.has("p2")).toBe(false);
    expect(result.current.selectedPlanIds.has("p3")).toBe(true);
    expect(result.current.selectedPlanIds.size).toBe(2);
  });
});

describe("usePlanManager - togglePlanSelectAll", () => {
  it("selects all plans when none are selected", async () => {
    const plans = [makePlan("p1"), makePlan("p2"), makePlan("p3")];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans, rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(3));

    act(() => result.current.togglePlanSelectAll());

    expect(result.current.selectedPlanIds.size).toBe(3);
    expect(result.current.selectedPlanIds.has("p1")).toBe(true);
    expect(result.current.selectedPlanIds.has("p2")).toBe(true);
    expect(result.current.selectedPlanIds.has("p3")).toBe(true);
  });

  it("deselects all plans when all are selected", async () => {
    const plans = [makePlan("p1"), makePlan("p2")];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans, rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(2));

    // Select all first
    act(() => result.current.togglePlanSelectAll());
    expect(result.current.selectedPlanIds.size).toBe(2);

    // Toggle again to deselect all
    act(() => result.current.togglePlanSelectAll());
    expect(result.current.selectedPlanIds.size).toBe(0);
  });

  it("selects all when only some plans are selected (partial selection is treated as not-all)", async () => {
    const plans = [makePlan("p1"), makePlan("p2"), makePlan("p3")];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans, rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(3));

    // Select only one
    act(() => result.current.togglePlanSelect("p1"));
    expect(result.current.selectedPlanIds.size).toBe(1);

    // toggleSelectAll with partial selection should select all
    act(() => result.current.togglePlanSelectAll());
    expect(result.current.selectedPlanIds.size).toBe(3);
  });
});

describe("usePlanManager - handlePlanDelete", () => {
  it("calls DELETE /api/rewrite/plan with selected ids when confirmed", async () => {
    const plans = [makePlan("p1"), makePlan("p2")];
    // Mount fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans, rawArticleMap: {} }),
    });
    // Delete response
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // Re-fetch after delete
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [makePlan("p2")], rawArticleMap: {} }),
    });

    vi.mocked(confirm).mockReturnValueOnce(true);

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(2));

    act(() => result.current.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.handlePlanDelete();
    });

    const deleteCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/rewrite/plan" && c[1]?.method === "DELETE"
    );
    expect(deleteCall).toBeDefined();

    const body = JSON.parse(deleteCall![1].body);
    expect(body.ids).toContain("p1");
    expect(body.ids).toHaveLength(1);
  });

  it("clears selection after successful delete", async () => {
    const plans = [makePlan("p1"), makePlan("p2")];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plans, rawArticleMap: {} }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plans: [], rawArticleMap: {} }) });

    vi.mocked(confirm).mockReturnValueOnce(true);

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(2));

    act(() => result.current.togglePlanSelect("p1"));
    expect(result.current.selectedPlanIds.size).toBe(1);

    await act(async () => {
      await result.current.handlePlanDelete();
    });

    expect(result.current.selectedPlanIds.size).toBe(0);
  });

  it("does nothing when no plans are selected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [makePlan("p1")], rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    // No selection — handlePlanDelete should be a no-op
    await act(async () => {
      await result.current.handlePlanDelete();
    });

    // Only the initial mount fetch, no DELETE call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("does not call DELETE when user cancels confirm dialog", async () => {
    const plans = [makePlan("p1")];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plans, rawArticleMap: {} }) });

    vi.mocked(confirm).mockReturnValueOnce(false);

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    act(() => result.current.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.handlePlanDelete();
    });

    const deleteCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/rewrite/plan" && c[1]?.method === "DELETE"
    );
    expect(deleteCall).toBeUndefined();
  });

  it("re-fetches plans after successful delete", async () => {
    const plans = [makePlan("p1"), makePlan("p2")];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plans, rawArticleMap: {} }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    // Re-fetch returns updated list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [makePlan("p2")], rawArticleMap: {} }),
    });

    vi.mocked(confirm).mockReturnValueOnce(true);

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(2));

    act(() => result.current.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.handlePlanDelete();
    });

    await waitFor(() => expect(result.current.plans).toHaveLength(1));
    expect(result.current.plans[0].id).toBe("p2");
  });
});

describe("usePlanManager - handlePlanProduce", () => {
  it("does nothing when no plans are selected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ plans: [makePlan("p1")], rawArticleMap: {} }),
    });

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    const onStartPolling = vi.fn();
    await act(async () => {
      await result.current.handlePlanProduce(onStartPolling);
    });

    expect(onStartPolling).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1); // only mount fetch
  });

  it("posts to /api/rewrite/plan/produce with selected ids", async () => {
    const plans = [makePlan("p1"), makePlan("p2")];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plans, rawArticleMap: {} }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ started: true }) });

    vi.mocked(confirm).mockReturnValueOnce(true);

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(2));

    act(() => {
      result.current.togglePlanSelect("p1");
      result.current.togglePlanSelect("p2");
    });

    const onStartPolling = vi.fn();
    await act(async () => {
      await result.current.handlePlanProduce(onStartPolling);
    });

    const produceCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/rewrite/plan/produce"
    );
    expect(produceCall).toBeDefined();

    const body = JSON.parse(produceCall![1].body);
    expect(body.ids).toContain("p1");
    expect(body.ids).toContain("p2");
    expect(body.ids).toHaveLength(2);
  });

  it("calls onStartPolling after successful produce", async () => {
    const plans = [makePlan("p1")];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plans, rawArticleMap: {} }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ started: true }) });

    vi.mocked(confirm).mockReturnValueOnce(true);

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(1));

    act(() => result.current.togglePlanSelect("p1"));

    const onStartPolling = vi.fn();
    await act(async () => {
      await result.current.handlePlanProduce(onStartPolling);
    });

    expect(onStartPolling).toHaveBeenCalledOnce();
  });

  it("removes produced plans from local list on success", async () => {
    const plans = [makePlan("p1"), makePlan("p2")];
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ plans, rawArticleMap: {} }) });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ started: true }) });

    vi.mocked(confirm).mockReturnValueOnce(true);

    const { result } = renderHook(() => usePlanManager());

    await waitFor(() => expect(result.current.plans).toHaveLength(2));

    act(() => result.current.togglePlanSelect("p1"));

    await act(async () => {
      await result.current.handlePlanProduce(vi.fn());
    });

    // p1 should be removed from the local plans list
    expect(result.current.plans.find((p) => p.id === "p1")).toBeUndefined();
    expect(result.current.plans.find((p) => p.id === "p2")).toBeDefined();
  });
});
