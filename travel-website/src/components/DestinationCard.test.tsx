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

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
}));

import DestinationCard from "./DestinationCard";

const defaultProps = {
  id: 1,
  name: "Bali",
  country: "Indonesia",
  category: "beach",
  price_level: 2,
  rating: 4.7,
  image: "/images/destinations/bali.jpg",
};

describe("DestinationCard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders destination name", () => {
    render(<DestinationCard {...defaultProps} />);
    expect(screen.getByText("Bali")).toBeDefined();
  });

  it("renders country", () => {
    render(<DestinationCard {...defaultProps} />);
    expect(screen.getByText("Indonesia")).toBeDefined();
  });

  it("renders category badge", () => {
    render(<DestinationCard {...defaultProps} />);
    expect(screen.getByText("beach")).toBeDefined();
  });

  it("renders rating with star", () => {
    render(<DestinationCard {...defaultProps} />);
    expect(screen.getByText("★ 4.7")).toBeDefined();
  });

  it("renders price level as dollar signs", () => {
    render(<DestinationCard {...defaultProps} />);
    expect(screen.getByText("$$")).toBeDefined();
  });

  it("renders image with descriptive alt text", () => {
    render(<DestinationCard {...defaultProps} />);
    const img = screen.getByAltText("Bali, Indonesia");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("/images/destinations/bali.jpg");
  });

  it("links to the correct detail page", () => {
    render(<DestinationCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/destinations/1");
  });

  it("applies expected card styling classes", () => {
    render(<DestinationCard {...defaultProps} />);
    const link = screen.getByRole("link");
    expect(link.className).toContain("rounded-3xl");
    expect(link.className).toContain("shadow-sm");
    expect(link.className).toContain("hover:-translate-y-1");
    expect(link.className).toContain("hover:shadow-xl");
    expect(link.className).toContain("transition-all");
  });

  it("renders five dollar signs for price level 5", () => {
    render(<DestinationCard {...defaultProps} price_level={5} />);
    expect(screen.getByText("$$$$$")).toBeDefined();
  });
});
