import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRewritePolling } from "@/hooks/useRewritePolling";
import { POLLING_INTERVAL_MS } from "@/lib/constants";
import { createQueryWrapper } from "../test-utils";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Suppress window.confirm / window.alert used inside hook
vi.stubGlobal("confirm", vi.fn(() => false));
vi.stubGlobal("alert", vi.fn());

function makeStatusResponse(currentTask: unknown = null) {
  return {
    lastCompleted: null,
    currentTask,
    newArticleCount: 0,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe("useRewritePolling - initial state", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts with rewriteStatus as null before first fetch resolves", () => {
    vi.useFakeTimers();
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    expect(result.current.rewriteStatus).toBeNull();
    expect(result.current.runningMode).toBeNull();
    expect(result.current.planTriggering).toBe(false);
    expect(result.current.triggering).toBe(false);
  });

  it("exposes required functions", () => {
    vi.useFakeTimers();
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    expect(typeof result.current.triggerPlan).toBe("function");
    expect(typeof result.current.triggerProduce).toBe("function");
    expect(typeof result.current.setRunningMode).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// fetchRewriteStatus on mount (real timers so waitFor works)
// ---------------------------------------------------------------------------

describe("useRewritePolling - fetchRewriteStatus on mount", () => {
  it("calls /api/rewrite on mount and sets rewriteStatus", async () => {
    const statusData = makeStatusResponse();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => statusData,
    });

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.rewriteStatus).not.toBeNull();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/rewrite");
    expect(result.current.rewriteStatus).toEqual(statusData);
  });

  it("leaves rewriteStatus null when fetch returns non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Unauthorized" }),
    });

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    // Wait for the fetch effect to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.rewriteStatus).toBeNull();
  });

  it("leaves rewriteStatus null when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.rewriteStatus).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Auto-polling when currentTask is active on mount
// ---------------------------------------------------------------------------

describe("useRewritePolling - auto-polling when currentTask is active on mount", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("sets runningMode to rewrite when currentTask is present on load", async () => {
    const activeStatus = makeStatusResponse({ status: "running", created_at: "2024-01-01T00:00:00Z" });
    // Use Once for the mount fetch, then keep subsequent polling fetches pending
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => activeStatus });
    mockFetch.mockReturnValue(new Promise(() => {})); // polling calls never resolve

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => {
      expect(result.current.runningMode).toBe("rewrite");
    });

    expect(result.current.rewriteStatus?.currentTask).not.toBeNull();
  });

  it("stops polling and clears runningMode when currentTask becomes null", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const activeStatus = makeStatusResponse({ status: "running", created_at: "2024-01-01T00:00:00Z" });
    const doneStatus = makeStatusResponse(null);

    // Mount fetch: active task; keep polling active for one more tick before done
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => activeStatus });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => activeStatus });
    // All subsequent polling fetches: done
    mockFetch.mockResolvedValue({ ok: true, json: async () => doneStatus });

    const onPollComplete = vi.fn();
    const { result } = renderHook(() => useRewritePolling({ onPollComplete }), { wrapper: createQueryWrapper() });

    // Wait for initial fetch to resolve and runningMode to be set
    await waitFor(() => {
      expect(result.current.runningMode).toBe("rewrite");
    });

    // Advance past the polling interval to trigger the "done" fetch
    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(result.current.runningMode).toBeNull();
    });

    expect(onPollComplete).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// triggerPlan
// ---------------------------------------------------------------------------

describe("useRewritePolling - triggerPlan", () => {
  it("sets runningMode to plan when triggerPlan is called", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    // POST stays pending so we can observe intermediate runningMode
    let resolvePlanPost!: (v: unknown) => void;
    mockFetch.mockReturnValueOnce(new Promise((res) => { resolvePlanPost = res; }));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    act(() => {
      result.current.triggerPlan();
    });

    expect(result.current.runningMode).toBe("plan");

    // Clean up: resolve the pending POST
    await act(async () => {
      resolvePlanPost({ ok: true, json: async () => ({ started: true }) });
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it("posts to /api/rewrite/plan with force=true always", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ started: true }) });
    // Polling fetch — keep pending so interval doesn't spin
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    await act(async () => {
      await result.current.triggerPlan();
    });

    const planPostCall = mockFetch.mock.calls.find(
      (c) => c[0] === "/api/rewrite/plan" && c[1]?.method === "POST"
    );
    expect(planPostCall).toBeDefined();

    const body = JSON.parse(planPostCall![1].body);
    expect(body.force).toBe(true);
  });

  it("calls clearPlans callback when provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ started: true }) });
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    const clearPlans = vi.fn();
    await act(async () => {
      await result.current.triggerPlan(clearPlans);
    });

    expect(clearPlans).toHaveBeenCalledOnce();
  });

  it("resets runningMode to null when plan POST returns non-ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Something went wrong" }),
    });

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    await act(async () => {
      await result.current.triggerPlan();
    });

    expect(result.current.runningMode).toBeNull();
    expect(result.current.planTriggering).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// triggerProduce
// ---------------------------------------------------------------------------

describe("useRewritePolling - triggerProduce", () => {
  it("sets runningMode to produce", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    // Polling fetch stays pending so interval doesn't fire
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    act(() => {
      result.current.triggerProduce();
    });

    expect(result.current.runningMode).toBe("produce");
  });

  it("calls afterTrigger callback when provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    const afterTrigger = vi.fn();
    act(() => {
      result.current.triggerProduce(afterTrigger);
    });

    expect(afterTrigger).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// setRunningMode
// ---------------------------------------------------------------------------

describe("useRewritePolling - setRunningMode", () => {
  it("allows external callers to override runningMode", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    act(() => {
      result.current.setRunningMode("custom-mode");
    });

    expect(result.current.runningMode).toBe("custom-mode");
  });

  it("allows clearing runningMode externally", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    // Set then clear
    act(() => result.current.triggerProduce());
    expect(result.current.runningMode).toBe("produce");

    act(() => result.current.setRunningMode(null));
    expect(result.current.runningMode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Race condition: triggerProduce then mount-effect must NOT start duplicate polling
// ---------------------------------------------------------------------------

describe("useRewritePolling - produce does not trigger duplicate rewrite polling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT overwrite runningMode to rewrite when triggerProduce already set it to produce", async () => {
    // Mount: no active task
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(null) });

    const onPollComplete = vi.fn();
    const onProducePollComplete = vi.fn();
    const { result } = renderHook(() =>
      useRewritePolling({ onPollComplete, onProducePollComplete }),
      { wrapper: createQueryWrapper() }
    );

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());
    expect(result.current.runningMode).toBeNull();

    // Simulate: triggerProduce sets runningMode to "produce"
    // Polling fetches always return activeTask (task never completes in this test)
    const activeTask = { status: "running", created_at: "2024-01-01T00:00:00Z" };
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeStatusResponse(activeTask) });

    act(() => {
      result.current.triggerProduce();
    });

    // runningMode must be "produce", not "rewrite"
    expect(result.current.runningMode).toBe("produce");
    expect(result.current.runningMode).not.toBe("rewrite");

    // onPollComplete (rewrite callback) should NOT have been called
    expect(onPollComplete).not.toHaveBeenCalled();
  });

  it("calls onProducePollComplete (not onPollComplete) when produce finishes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mount: no active task
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(null) });

    const onPollComplete = vi.fn();
    const onProducePollComplete = vi.fn();
    const { result } = renderHook(() =>
      useRewritePolling({ onPollComplete, onProducePollComplete }),
      { wrapper: createQueryWrapper() }
    );

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    // triggerProduce: first polling fetch returns active task, subsequent fetches return done
    const activeTask = { status: "running", created_at: "2024-01-01T00:00:00Z" };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(activeTask) })
      .mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(activeTask) })
      .mockResolvedValue({ ok: true, json: async () => makeStatusResponse(null) });

    act(() => {
      result.current.triggerProduce();
    });

    // Advance time to let polling fetch the active task and then the done state
    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => {
      expect(result.current.runningMode).toBeNull();
    });

    // The produce callback should be called, NOT the rewrite callback
    expect(onProducePollComplete).toHaveBeenCalled();
    expect(onPollComplete).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Race condition: triggerPlan then mount-effect must NOT start duplicate polling
// ---------------------------------------------------------------------------

describe("useRewritePolling - plan does not trigger duplicate rewrite polling", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("does NOT overwrite runningMode to rewrite when triggerPlan already set it to plan", async () => {
    // Mount: no active task
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(null) });

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    // triggerPlan: POST succeeds, polling fetches always return active task (never completes)
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ started: true }) });
    const activeTask = { status: "running", created_at: "2024-01-01T00:00:00Z" };
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeStatusResponse(activeTask) });

    await act(async () => {
      await result.current.triggerPlan();
    });

    // Must be "plan", not "rewrite"
    expect(result.current.runningMode).toBe("plan");
    expect(result.current.runningMode).not.toBe("rewrite");
  });
});

// ---------------------------------------------------------------------------
// Interval cleanup on unmount (uses fake timers, isolated)
// ---------------------------------------------------------------------------

describe("useRewritePolling - polling timeout auto-cleanup", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops polling when the task completes (currentTask becomes null)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const activeStatus = makeStatusResponse({ status: "running", created_at: "2024-01-01T00:00:00Z" });
    const doneStatus = makeStatusResponse(null);

    // Mount fetch: active task; keep active for one more tick before done
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => activeStatus });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => activeStatus });
    // Polling fetches: task is done
    mockFetch.mockResolvedValue({ ok: true, json: async () => doneStatus });

    const { result } = renderHook(() => useRewritePolling(), { wrapper: createQueryWrapper() });

    // Wait for initial fetch to resolve and runningMode to be set
    await waitFor(() => {
      expect(result.current.runningMode).toBe("rewrite");
    });

    // Advance past polling intervals so the done state is fetched
    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    // TanStack Query stops polling when refetchInterval returns false (no currentTask)
    // Verify runningMode is cleared after task completion
    await waitFor(() => expect(result.current.runningMode).toBeNull());
  });
});
