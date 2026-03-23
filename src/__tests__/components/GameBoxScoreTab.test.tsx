import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameBoxScoreTab } from "@/components/game/GameBoxScoreTab";
import type { BoxScoreData } from "@/types/game";

describe("GameBoxScoreTab", () => {
  it("boxScore 為 null 時顯示暫無數據", () => {
    render(<GameBoxScoreTab boxScore={null} />);
    expect(screen.getByText("暫無數據")).toBeInTheDocument();
  });

  it("boxScore.players 為 undefined 時不 crash", () => {
    const incompleteBoxScore = {
      teams: [
        { teamName: "Lakers", stats: [{ label: "PTS", value: "110" }] },
        { teamName: "Celtics", stats: [{ label: "PTS", value: "105" }] },
      ],
    } as BoxScoreData; // players 未定義

    const { container } = render(
      <GameBoxScoreTab boxScore={incompleteBoxScore} />
    );
    expect(container).toBeTruthy();
    // 球隊對比仍正常渲染
    expect(screen.getByText("球隊數據對比")).toBeInTheDocument();
    expect(screen.getByText("Lakers")).toBeInTheDocument();
    expect(screen.getByText("Celtics")).toBeInTheDocument();
  });

  it("boxScore.teams[0].stats 為 undefined 時不 crash", () => {
    const noStats = {
      teams: [
        { teamName: "Lakers" },
        { teamName: "Celtics" },
      ],
      players: [],
    } as unknown as BoxScoreData;

    const { container } = render(
      <GameBoxScoreTab boxScore={noStats} />
    );
    expect(container).toBeTruthy();
  });

  it("boxScore.players 為空陣列時不 crash", () => {
    const emptyPlayers: BoxScoreData = {
      teams: [
        { teamName: "Lakers", stats: [] },
        { teamName: "Celtics", stats: [] },
      ],
      players: [],
    };

    const { container } = render(
      <GameBoxScoreTab boxScore={emptyPlayers} />
    );
    expect(container).toBeTruthy();
  });

  it("正常渲染完整 boxScore", () => {
    const fullBoxScore: BoxScoreData = {
      teams: [
        { teamName: "Lakers", stats: [{ label: "FG%", value: "48.5" }] },
        { teamName: "Celtics", stats: [{ label: "FG%", value: "45.2" }] },
      ],
      players: [
        {
          teamName: "Lakers",
          labels: ["MIN", "PTS", "REB"],
          athletes: [
            { name: "LeBron", position: "SF", starter: true, stats: ["36", "30", "8"] },
            { name: "AD", position: "PF", starter: true, stats: ["34", "25", "12"] },
          ],
        },
      ],
    };

    render(<GameBoxScoreTab boxScore={fullBoxScore} />);
    expect(screen.getByText("LeBron")).toBeInTheDocument();
    expect(screen.getByText("AD")).toBeInTheDocument();
    expect(screen.getByText("先發")).toBeInTheDocument();
  });
});
