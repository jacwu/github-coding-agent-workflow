// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import TripSummaryCard from "./TripSummaryCard";

const defaultProps = {
  id: 1,
  title: "Asia Trip",
  start_date: "2026-07-01",
  end_date: "2026-07-15",
  status: "draft",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-02 12:00:00",
};

describe("TripSummaryCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders trip title", () => {
    render(<TripSummaryCard {...defaultProps} />);
    expect(screen.getByText("Asia Trip")).toBeDefined();
  });

  it("renders status badge", () => {
    render(<TripSummaryCard {...defaultProps} />);
    expect(screen.getByText("draft")).toBeDefined();
  });

  it("renders trip dates", () => {
    render(<TripSummaryCard {...defaultProps} />);
    expect(screen.getByText("2026-07-01 → 2026-07-15")).toBeDefined();
  });

  it("renders updated timestamp", () => {
    render(<TripSummaryCard {...defaultProps} />);
    expect(screen.getByText("Updated 2026-01-02 12:00:00")).toBeDefined();
  });

  it("renders created timestamp", () => {
    render(<TripSummaryCard {...defaultProps} />);
    expect(screen.getByText("Created 2026-01-01 00:00:00")).toBeDefined();
  });

  it("renders link to trip detail", () => {
    render(<TripSummaryCard {...defaultProps} />);
    const link = screen.getByText("Open trip");
    expect(link.getAttribute("href")).toBe("/trips/1");
  });

  it("does not render dates when both are null", () => {
    render(
      <TripSummaryCard
        {...defaultProps}
        start_date={null}
        end_date={null}
      />,
    );
    expect(screen.queryByText(/→/)).toBeNull();
  });

  it("renders planned status styling", () => {
    render(<TripSummaryCard {...defaultProps} status="planned" />);
    expect(screen.getByText("planned")).toBeDefined();
  });
});
