import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TelegramBanner, TelegramArticleCTA } from "@/components/TelegramCTA";

describe("TelegramBanner", () => {
  it("renders the banner with correct heading", () => {
    render(<TelegramBanner />);
    expect(screen.getByText("即時體育新聞直送手機")).toBeInTheDocument();
  });

  it("renders the CTA button with correct text", () => {
    render(<TelegramBanner />);
    expect(screen.getByText("立即加入頻道")).toBeInTheDocument();
  });

  it("links to the correct Telegram channel URL", () => {
    render(<TelegramBanner />);
    const link = screen.getByText("立即加入頻道").closest("a");
    expect(link).toHaveAttribute("href", "https://t.me/howger_sport_news");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("contains channel description mentioning NBA", () => {
    render(<TelegramBanner />);
    expect(
      screen.getByText(/加入我們的 Telegram 頻道/)
    ).toBeInTheDocument();
  });
});

describe("TelegramArticleCTA", () => {
  it("renders the article CTA with correct heading", () => {
    render(<TelegramArticleCTA />);
    expect(screen.getByText("喜歡這篇報導？")).toBeInTheDocument();
  });

  it("renders the subscribe button", () => {
    render(<TelegramArticleCTA />);
    expect(screen.getByText("加入 Telegram 頻道")).toBeInTheDocument();
  });

  it("links to the correct Telegram channel URL", () => {
    render(<TelegramArticleCTA />);
    const link = screen.getByText("加入 Telegram 頻道").closest("a");
    expect(link).toHaveAttribute("href", "https://t.me/howger_sport_news");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("contains description text about receiving latest news", () => {
    render(<TelegramArticleCTA />);
    expect(
      screen.getByText(/第一時間收到最新體育新聞/)
    ).toBeInTheDocument();
  });
});
