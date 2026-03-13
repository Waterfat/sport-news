import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRewritePolling } from "@/hooks/useRewritePolling";
import { POLLING_INTERVAL_MS } from "@/lib/constants";

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

    const { result } = renderHook(() => useRewritePolling());

    expect(result.current.rewriteStatus).toBeNull();
    expect(result.current.runningMode).toBeNull();
    expect(result.current.planTriggering).toBe(false);
    expect(result.current.triggering).toBe(false);
  });

  it("exposes required functions", () => {
    vi.useFakeTimers();
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

    // Wait for the fetch effect to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.rewriteStatus).toBeNull();
  });

  it("leaves rewriteStatus null when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

    await waitFor(() => {
      expect(result.current.runningMode).toBe("rewrite");
    });

    expect(result.current.rewriteStatus?.currentTask).not.toBeNull();
  });

  it("stops polling and clears runningMode when currentTask becomes null", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const activeStatus = makeStatusResponse({ status: "running", created_at: "2024-01-01T00:00:00Z" });
    const doneStatus = makeStatusResponse(null);

    // Mount fetch: active task
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => activeStatus });
    // All subsequent polling fetches: done
    mockFetch.mockResolvedValue({ ok: true, json: async () => doneStatus });

    const onPollComplete = vi.fn();
    const { result } = renderHook(() => useRewritePolling({ onPollComplete }));

    // Let the initial fetch resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.runningMode).toBe("rewrite");

    // Advance past the polling interval
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

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    act(() => {
      result.current.triggerProduce();
    });

    expect(result.current.runningMode).toBe("produce");
  });

  it("calls afterTrigger callback when provided", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling());

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

    const { result } = renderHook(() => useRewritePolling());

    await waitFor(() => expect(result.current.rewriteStatus).not.toBeNull());

    act(() => {
      result.current.setRunningMode("custom-mode");
    });

    expect(result.current.runningMode).toBe("custom-mode");
  });

  it("allows clearing runningMode externally", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse() });
    mockFetch.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useRewritePolling());

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
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mount: no active task
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(null) });

    const onPollComplete = vi.fn();
    const onProducePollComplete = vi.fn();
    const { result } = renderHook(() =>
      useRewritePolling({ onPollComplete, onProducePollComplete })
    );

    // Wait for initial fetch
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.runningMode).toBeNull();

    // Simulate: triggerProduce sets runningMode to "produce" and starts polling
    // The polling fetch returns an active task (which the page-load useEffect might try to re-poll)
    const activeTask = { status: "running", created_at: "2024-01-01T00:00:00Z" };
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeStatusResponse(activeTask) });

    act(() => {
      result.current.triggerProduce();
    });

    expect(result.current.runningMode).toBe("produce");

    // Let the first polling tick fire — this updates rewriteStatus with currentTask
    // which triggers the page-load useEffect. The bug was: useEffect saw currentTask + runningMode==null
    // (stale state) and started a second polling loop as "rewrite"
    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    // runningMode must STILL be "produce", not "rewrite"
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
      useRewritePolling({ onPollComplete, onProducePollComplete })
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // triggerProduce with active task on first poll, then done on second
    const activeTask = { status: "running", created_at: "2024-01-01T00:00:00Z" };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(activeTask) })
      .mockResolvedValue({ ok: true, json: async () => makeStatusResponse(null) });

    act(() => {
      result.current.triggerProduce();
    });

    // First tick: still running
    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    // Second tick: task done
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
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mount: no active task
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => makeStatusResponse(null) });

    const { result } = renderHook(() => useRewritePolling());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // triggerPlan: POST succeeds, polling starts
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ started: true }) });
    const activeTask = { status: "running", created_at: "2024-01-01T00:00:00Z" };
    mockFetch.mockResolvedValue({ ok: true, json: async () => makeStatusResponse(activeTask) });

    await act(async () => {
      await result.current.triggerPlan();
    });

    expect(result.current.runningMode).toBe("plan");

    // Let polling tick fire
    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    // Must still be "plan", not "rewrite"
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

  it("clears the polling interval when the task completes (currentTask becomes null)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    const activeStatus = makeStatusResponse({ status: "running", created_at: "2024-01-01T00:00:00Z" });
    const doneStatus = makeStatusResponse(null);

    // Mount fetch: active task
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => activeStatus });
    // Polling fetch: task is done
    mockFetch.mockResolvedValue({ ok: true, json: async () => doneStatus });

    const { result } = renderHook(() => useRewritePolling());

    // Let the initial fetch resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.runningMode).toBe("rewrite");

    // Advance past one polling interval so the completion branch runs
    await act(async () => {
      vi.advanceTimersByTime(POLLING_INTERVAL_MS + 100);
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => expect(result.current.runningMode).toBeNull());

    // The hook calls clearInterval when it detects task completion
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
