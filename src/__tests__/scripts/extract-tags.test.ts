import { describe, expect, it } from "vitest";
import { extractTagsFromContent } from "../../../scripts/shared-tags";

describe("extractTagsFromContent", () => {
  it("extracts NBA league and team names", () => {
    const tags = extractTagsFromContent(
      "LeBron James 30 分力克火箭",
      "NBA 賽季中 Lakers 以 120-110 擊敗 Rockets"
    );
    expect(tags).toContain("NBA");
    expect(tags).toContain("Los Angeles Lakers");
    expect(tags).toContain("Houston Rockets");
  });

  it("extracts MLB teams", () => {
    const tags = extractTagsFromContent(
      "MLB 春訓最新",
      "Dodgers 與 Yankees 春訓對決"
    );
    expect(tags).toContain("MLB");
    expect(tags).toContain("Los Angeles Dodgers");
    expect(tags).toContain("New York Yankees");
  });

  it("handles short team names like Cavs, Mavs, Wolves", () => {
    const tags = extractTagsFromContent(
      "Cavs vs Wolves",
      "The Cavs defeated the Wolves in overtime"
    );
    expect(tags).toContain("Cleveland Cavaliers");
    expect(tags).toContain("Minnesota Timberwolves");
  });

  it("does not match partial words (e.g., 'heated' should not match 'Heat')", () => {
    const tags = extractTagsFromContent(
      "heated debate",
      "The heated argument continued all day"
    );
    expect(tags).not.toContain("Miami Heat");
  });

  it("returns empty array for unrecognized content", () => {
    const tags = extractTagsFromContent(
      "天氣預報",
      "今天天氣晴朗，適合出門"
    );
    expect(tags).toHaveLength(0);
  });

  it("deduplicates when both short and long names appear", () => {
    const tags = extractTagsFromContent(
      "Lakers game",
      "Los Angeles Lakers played well. The Lakers dominated."
    );
    const lakerCount = tags.filter(t => t === "Los Angeles Lakers").length;
    expect(lakerCount).toBe(1);
  });

  it("extracts from title even if content is empty", () => {
    const tags = extractTagsFromContent("NBA Celtics 大勝", "");
    expect(tags).toContain("NBA");
    expect(tags).toContain("Boston Celtics");
  });

  it("handles 76ers / Sixers aliases", () => {
    const tags1 = extractTagsFromContent("76ers win", "");
    const tags2 = extractTagsFromContent("Sixers win", "");
    expect(tags1).toContain("Philadelphia 76ers");
    expect(tags2).toContain("Philadelphia 76ers");
  });
});
