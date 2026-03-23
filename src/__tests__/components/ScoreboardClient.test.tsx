import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreboardClient from "@/components/scoreboard/ScoreboardClient";

// Mock nuqs
vi.mock("nuqs", () => ({
  useQueryState: vi.fn().mockImplementation((_key: string, _opts?: unknown) => {
    if (_key === "league") return ["nba", vi.fn()];
    if (_key === "date") return ["2026-03-23", vi.fn()];
    return ["", vi.fn()];
  }),
  parseAsString: {
    withDefault: (val: string) => ({ defaultValue: val }),
  },
}));

// Mock tanstack query
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: unknown) => mockUseQuery(opts),
}));

// Mock sub-components
vi.mock("@/components/scoreboard/ScoreCard", () => ({
  default: ({ game }: { game: { id: string } }) => (
    <div data-testid={`score-card-${game.id}`}>ScoreCard</div>
  ),
}));

vi.mock("@/components/scoreboard/ScoreCardSkeleton", () => ({
  default: () => <div data-testid="skeleton">Loading</div>,
}));

vi.mock("@/components/scoreboard/DatePicker", () => ({
  default: () => <div data-testid="date-picker" />,
  getTodayStr: () => "2026-03-23",
}));

vi.mock("@/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/constants")>();
  return { ...actual };
});

const defaultLeagues = [
  { key: "nba", label: "NBA" },
  { key: "mlb", label: "MLB" },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ScoreboardClient", () => {
  it("data.games 為 undefined 時顯示暫無比賽", () => {
    mockUseQuery.mockReturnValue({
      data: { league: "nba", label: "NBA", games: undefined },
      isLoading: false,
      dataUpdatedAt: Date.now(),
    });

    render(<ScoreboardClient initialLeagues={defaultLeagues} />);
    expect(screen.getByText("今日暫無比賽")).toBeInTheDocument();
  });

  it("data.games 為 null 時顯示暫無比賽", () => {
    mockUseQuery.mockReturnValue({
      data: { league: "nba", label: "NBA", games: null },
      isLoading: false,
      dataUpdatedAt: Date.now(),
    });

    render(<ScoreboardClient initialLeagues={defaultLeagues} />);
    expect(screen.getByText("今日暫無比賽")).toBeInTheDocument();
  });

  it("data 為 null 時顯示暫無比賽", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      dataUpdatedAt: Date.now(),
    });

    render(<ScoreboardClient initialLeagues={defaultLeagues} />);
    expect(screen.getByText("今日暫無比賽")).toBeInTheDocument();
  });

  it("data.games 為空陣列時顯示暫無比賽", () => {
    mockUseQuery.mockReturnValue({
      data: { league: "nba", label: "NBA", games: [] },
      isLoading: false,
      dataUpdatedAt: Date.now(),
    });

    render(<ScoreboardClient initialLeagues={defaultLeagues} />);
    expect(screen.getByText("今日暫無比賽")).toBeInTheDocument();
  });

  it("有比賽資料時正常渲染 ScoreCard", () => {
    mockUseQuery.mockReturnValue({
      data: {
        league: "nba",
        label: "NBA",
        games: [
          { id: "g1", homeTeam: {}, awayTeam: {}, status: "final" },
          { id: "g2", homeTeam: {}, awayTeam: {}, status: "in_progress" },
        ],
      },
      isLoading: false,
      dataUpdatedAt: Date.now(),
    });

    render(<ScoreboardClient initialLeagues={defaultLeagues} />);
    expect(screen.getByTestId("score-card-g1")).toBeInTheDocument();
    expect(screen.getByTestId("score-card-g2")).toBeInTheDocument();
  });

  it("isLoading 時顯示骨架屏", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: true,
      dataUpdatedAt: 0,
    });

    render(<ScoreboardClient initialLeagues={defaultLeagues} />);
    expect(screen.getAllByTestId("skeleton")).toHaveLength(6);
  });

  it("無聯賽時顯示即將上線", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      dataUpdatedAt: 0,
    });

    render(<ScoreboardClient initialLeagues={[]} />);
    expect(screen.getByText("即時比分功能即將上線")).toBeInTheDocument();
  });
});
