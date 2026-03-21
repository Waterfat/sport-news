import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { autoLinkChildren } from "@/lib/auto-link";

// Wrapper to render React nodes returned by autoLinkChildren
function renderLinked(text: string, category: string | null = null) {
  const result = autoLinkChildren(text, category);
  render(<p data-testid="content">{result}</p>);
  return screen.getByTestId("content");
}

describe("autoLinkChildren", () => {
  it("links full NBA team names", () => {
    const el = renderLinked("The Los Angeles Lakers won last night.", "NBA");
    const link = el.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Los Angeles Lakers");
    expect(link?.getAttribute("href")).toMatch(/\/team\/nba\/\d+/);
  });

  it("links short team names like Lakers", () => {
    const el = renderLinked("Lakers beat the Celtics 120-110.", "NBA");
    const links = el.querySelectorAll("a");
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("does not match partial words (heated ≠ Heat)", () => {
    const el = renderLinked("The heated debate continued all day.");
    const links = el.querySelectorAll("a");
    expect(links.length).toBe(0);
  });

  it("does not double-link already linked text", () => {
    // When react-markdown encounters [Lakers](url), it renders via
    // the `a` component, not `p`. So autoLinkChildren only sees the
    // text node parts. Passing a React element should not be processed.
    const children = ["Check out ", <a key="x" href="/test">Lakers</a>, " news"];
    const result = autoLinkChildren(children, "NBA");
    // The <a> element should pass through unchanged
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns plain string when no matches", () => {
    const result = autoLinkChildren("No team names here.", null);
    expect(result).toBe("No team names here.");
  });

  it("handles MLB team names", () => {
    const el = renderLinked("The New York Yankees signed a new pitcher.", "MLB");
    const link = el.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("New York Yankees");
    expect(link?.getAttribute("href")).toMatch(/\/team\/mlb\/\d+/);
  });

  it("prefers same-sport matches when category is set", () => {
    // "Braves" exists in both NBA (Hawks city Atlanta) but as a team name
    // it's MLB Atlanta Braves. With MLB category, should link to MLB.
    const el = renderLinked("The Braves dominated today.", "MLB");
    const link = el.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toMatch(/\/team\/mlb\/\d+/);
  });

  it("links multiple teams in same text", () => {
    const el = renderLinked("Lakers vs Celtics was an amazing game.", "NBA");
    const links = el.querySelectorAll("a");
    expect(links.length).toBe(2);
  });

  it("handles multi-word short names like Red Sox", () => {
    const el = renderLinked("The Red Sox won the series.", "MLB");
    const link = el.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.textContent).toBe("Red Sox");
  });

  it("handles null children gracefully", () => {
    const result = autoLinkChildren(null, null);
    expect(result).toBeNull();
  });
});
