import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { GameSummaryTab } from "@/components/game/GameSummaryTab";
import type { GameInfo, SeasonSeriesData } from "@/types/game";

// Mock recharts to avoid SSR issues in jsdom
vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ReferenceLine: () => <div />,
}));

vi.mock("@/components/auth/MemberGate", () => ({
  MemberGate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockGame: GameInfo = {
  id: "test-1",
  date: "2026-03-23",
  status: "final",
  statusDetail: "Final",
  homeTeam: { id: "1", name: "Lakers", abbreviation: "LAL", logo: "", score: "110", record: "40-20" },
  awayTeam: { id: "2", name: "Celtics", abbreviation: "BOS", logo: "", score: "105", record: "45-15" },
};

describe("GameSummaryTab", () => {
  const defaultProps = {
    game: mockGame,
    leaders: [],
    winProb: [],
    seasonSeries: null,
    pickCenter: [],
  };

  it("seasonSeries 為 null 時正常渲染", () => {
    const { container } = render(
      <GameSummaryTab {...defaultProps} seasonSeries={null} />
    );
    expect(container).toBeTruthy();
    // 不應顯示交手紀錄區塊
    expect(screen.queryByText("本季交手紀錄")).not.toBeInTheDocument();
  });

  it("seasonSeries.games 為 undefined 時不 crash", () => {
    const incompleteData = {
      summary: "Lakers lead 2-1",
      seriesScore: "2-1",
    } as SeasonSeriesData; // games 未定義

    const { container } = render(
      <GameSummaryTab {...defaultProps} seasonSeries={incompleteData} />
    );
    expect(container).toBeTruthy();
    // 仍顯示標題和 summary
    expect(screen.getByText("本季交手紀錄")).toBeInTheDocument();
    expect(screen.getByText("Lakers lead 2-1")).toBeInTheDocument();
  });

  it("seasonSeries.games 為空陣列時渲染空區塊", () => {
    const emptyGames: SeasonSeriesData = {
      summary: "No games yet",
      seriesScore: "0-0",
      games: [],
    };

    render(<GameSummaryTab {...defaultProps} seasonSeries={emptyGames} />);
    expect(screen.getByText("本季交手紀錄")).toBeInTheDocument();
  });

  it("正常渲染比分資訊且主客隊配對正確", () => {
    render(<GameSummaryTab {...defaultProps} />);
    // 驗證比分存在
    expect(screen.getByText("110")).toBeInTheDocument();
    expect(screen.getByText("105")).toBeInTheDocument();
    // 驗證主客隊縮寫存在
    expect(screen.getByText("LAL")).toBeInTheDocument();
    expect(screen.getByText("BOS")).toBeInTheDocument();
    // 驗證 VS 分隔符
    expect(screen.getByText("VS")).toBeInTheDocument();
  });
});
