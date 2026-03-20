import { describe, expect, it, vi, beforeEach } from "vitest";

// vi.mock is hoisted — use vi.hoisted to create the mock fn
const { mockPermanentRedirect } = vi.hoisted(() => ({
  mockPermanentRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  permanentRedirect: mockPermanentRedirect,
}));

import TeamPage, {
  generateMetadata,
} from "@/app/(public)/team/[sport]/[id]/page";

describe("TeamPage slug redirect", () => {
  beforeEach(() => {
    mockPermanentRedirect.mockReset();
  });

  describe("generateMetadata", () => {
    it("returns noindex for slug URLs", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ sport: "nba", id: "los-angeles-lakers" }),
      });
      expect(metadata).toEqual({ robots: { index: false } });
    });

    it("returns full metadata for numeric ID URLs", async () => {
      const metadata = await generateMetadata({
        params: Promise.resolve({ sport: "nba", id: "13" }),
      });
      expect(metadata).toHaveProperty("title");
      expect(metadata.title).toContain("13");
    });
  });

  describe("page component", () => {
    it("calls permanentRedirect for known NBA slug", async () => {
      mockPermanentRedirect.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      await expect(
        TeamPage({
          params: Promise.resolve({ sport: "nba", id: "los-angeles-lakers" }),
        })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockPermanentRedirect).toHaveBeenCalledWith("/team/nba/13");
    });

    it("calls permanentRedirect for MLB slug", async () => {
      mockPermanentRedirect.mockImplementation(() => {
        throw new Error("NEXT_REDIRECT");
      });

      await expect(
        TeamPage({
          params: Promise.resolve({ sport: "mlb", id: "new-york-yankees" }),
        })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockPermanentRedirect).toHaveBeenCalledWith("/team/mlb/10");
    });

    it("does not redirect for numeric ID", async () => {
      const result = await TeamPage({
        params: Promise.resolve({ sport: "nba", id: "13" }),
      });
      expect(mockPermanentRedirect).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it("does not redirect for unknown slug (falls through to normal render)", async () => {
      const result = await TeamPage({
        params: Promise.resolve({ sport: "nba", id: "nonexistent-team" }),
      });
      expect(mockPermanentRedirect).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    });
  });
});
