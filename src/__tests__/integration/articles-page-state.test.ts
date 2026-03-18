/**
 * Integration tests: ArticlesPage state management
 *
 * Tests the state management logic from page.tsx — filter resets,
 * batch operations, and single publish behavior — using the same
 * hook + fetch patterns as the real page.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useState, useCallback, useEffect } from "react";
import { useRewritePolling } from "@/hooks/useRewritePolling";
import { createQueryWrapper } from "../test-utils";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubGlobal("confirm", vi.fn(() => true));
vi.stubGlobal("alert", vi.fn());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Article {
  id: string;
  title: string;
  status: string;
  published_at: string | null;
}

function makeArticle(id: string, status = "draft"): Article {
  return { id, title: `Article ${id}`, status, published_at: null };
}

function makeStatusResponse(currentTask: unknown = null) {
  return { lastCompleted: null, currentTask, newArticleCount: 0 };
}

/**
 * Mimics the state management parts of page.tsx for testing.
 */
function useArticlesPageState() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pageSize.toString(),
    });
    if (status !== "all") params.set("status", status);

    try {
      const res = await fetch(`/api/articles/generated?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
      setTotal(data.total || 0);
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  const rewritePolling = useRewritePolling({
    onPollComplete: () => fetchArticles(),
    onPlanPollComplete: () => fetchArticles(),
    onProducePollComplete: () => fetchArticles(),
  });

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const handleBatchAction = async (action: "publish" | "delete") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBatchLoading(true);
    try {
      const res = await fetch("/api/articles/generated/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        await fetchArticles();
      }
    } catch {
      // noop
    } finally {
      setBatchLoading(false);
    }
  };

  const handlePublishOne = async (articleId: string) => {
    setPublishingIds((prev) => new Set(prev).add(articleId));
    try {
      const res = await fetch("/api/articles/generated/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [articleId], action: "publish" }),
      });
      if (res.ok) {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === articleId
              ? { ...a, status: "published", published_at: new Date().toISOString() }
              : a
          )
        );
      }
    } catch {
      // noop
    } finally {
      setPublishingIds((prev) => {
        const next = new Set(prev);
        next.delete(articleId);
        return next;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return {
    articles, total, page, pageSize, status, loading,
    selectedIds, batchLoading, publishingIds,
    rewritePolling,
    setPage, handleStatusChange, handlePageSizeChange,
    handleBatchAction, handlePublishOne, toggleSelect,
    fetchArticles,
  };
}

// ---------------------------------------------------------------------------

function setupDefaultFetch(articleList: Article[] = []) {
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (typeof url === "string" && url === "/api/rewrite" && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => makeStatusResponse() };
    }
    if (typeof url === "string" && url.startsWith("/api/articles/generated") && (!init?.method || init.method === "GET")) {
      return { ok: true, json: async () => ({ articles: articleList, total: articleList.length }) };
    }
    if (typeof url === "string" && url === "/api/articles/generated/batch" && init?.method === "POST") {
      return { ok: true, json: async () => ({ success: true }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Filter change resets page and selectedIds
// ---------------------------------------------------------------------------

describe("filter change resets state", () => {
  it("handleStatusChange resets page to 1 and clears selectedIds", async () => {
    const articles = [makeArticle("a1"), makeArticle("a2"), makeArticle("a3")];
    setupDefaultFetch(articles);

    const { result } = renderHook(() => useArticlesPageState(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Select some articles and change page
    act(() => {
      result.current.toggleSelect("a1");
      result.current.toggleSelect("a2");
      result.current.setPage(3);
    });

    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.page).toBe(3);

    // Change status filter
    act(() => {
      result.current.handleStatusChange("published");
    });

    expect(result.current.page).toBe(1);
    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.status).toBe("published");
  });
});

// ---------------------------------------------------------------------------
// 2. pageSize change resets page
// ---------------------------------------------------------------------------

describe("pageSize change resets page", () => {
  it("handlePageSizeChange resets page to 1", async () => {
    setupDefaultFetch();

    const { result } = renderHook(() => useArticlesPageState(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setPage(5));
    expect(result.current.page).toBe(5);

    act(() => result.current.handlePageSizeChange(50));

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// 3. Filter works during plan running mode
// ---------------------------------------------------------------------------

describe("filter during running mode", () => {
  it("changing filter while runningMode=plan still triggers fetchArticles", async () => {
    const callLog: string[] = [];

    mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
      callLog.push(`${init?.method || "GET"} ${url}`);
      if (typeof url === "string" && url === "/api/rewrite") {
        return { ok: true, json: async () => makeStatusResponse() };
      }
      if (typeof url === "string" && url.startsWith("/api/articles/generated")) {
        return { ok: true, json: async () => ({ articles: [], total: 0 }) };
      }
      if (typeof url === "string" && url === "/api/rewrite/plan" && init?.method === "POST") {
        return { ok: true, json: async () => ({ started: true }) };
      }
      return new Promise(() => {}); // keep polling pending
    });

    const { result } = renderHook(() => useArticlesPageState(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate plan running
    act(() => {
      result.current.rewritePolling.setRunningMode("plan");
    });

    expect(result.current.rewritePolling.runningMode).toBe("plan");

    callLog.length = 0;

    // Change filter — should still trigger fetchArticles
    act(() => {
      result.current.handleStatusChange("draft");
    });

    // fetchArticles is triggered by the useEffect [page, pageSize, status] dependency
    await waitFor(() => {
      const articleCalls = callLog.filter((c) => c.startsWith("GET /api/articles/generated"));
      expect(articleCalls.length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Batch publish clears selectedIds and re-fetches
// ---------------------------------------------------------------------------

describe("batch publish", () => {
  it("clears selectedIds and re-fetches articles after success", async () => {
    const articles = [makeArticle("a1"), makeArticle("a2")];
    setupDefaultFetch(articles);

    const { result } = renderHook(() => useArticlesPageState(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.articles).toHaveLength(2));

    act(() => {
      result.current.toggleSelect("a1");
      result.current.toggleSelect("a2");
    });

    expect(result.current.selectedIds.size).toBe(2);

    await act(async () => {
      await result.current.handleBatchAction("publish");
    });

    expect(result.current.selectedIds.size).toBe(0);
    expect(result.current.batchLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Single publish updates only that article, doesn't clear selectedIds
// ---------------------------------------------------------------------------

describe("single publish", () => {
  it("updates only the published article status, keeps selectedIds intact", async () => {
    const articles = [makeArticle("a1"), makeArticle("a2"), makeArticle("a3")];
    setupDefaultFetch(articles);

    const { result } = renderHook(() => useArticlesPageState(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.articles).toHaveLength(3));

    // Select a1 and a3
    act(() => {
      result.current.toggleSelect("a1");
      result.current.toggleSelect("a3");
    });

    expect(result.current.selectedIds.size).toBe(2);

    // Publish a2 (not in selection)
    await act(async () => {
      await result.current.handlePublishOne("a2");
    });

    // a2 should now be published
    const a2 = result.current.articles.find((a) => a.id === "a2");
    expect(a2?.status).toBe("published");
    expect(a2?.published_at).not.toBeNull();

    // Other articles unchanged
    expect(result.current.articles.find((a) => a.id === "a1")?.status).toBe("draft");
    expect(result.current.articles.find((a) => a.id === "a3")?.status).toBe("draft");

    // selectedIds should NOT be cleared
    expect(result.current.selectedIds.size).toBe(2);
    expect(result.current.selectedIds.has("a1")).toBe(true);
    expect(result.current.selectedIds.has("a3")).toBe(true);

    // publishingIds should be cleared
    expect(result.current.publishingIds.size).toBe(0);
  });
});
