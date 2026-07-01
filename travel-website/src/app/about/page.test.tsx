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

import AboutPage from "./page";

describe("AboutPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the page heading", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "About Travel Website" })
    ).toBeDefined();
  });

  it("renders the story section", () => {
    render(<AboutPage />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Our Story" })
    ).toBeDefined();
  });

  it("renders value pillar cards", () => {
    render(<AboutPage />);

    expect(screen.getByText("Discover Destinations")).toBeDefined();
    expect(screen.getByText("Plan Your Trips")).toBeDefined();
    expect(screen.getByText("Travel with Confidence")).toBeDefined();
  });

  it("renders CTA link to destinations", () => {
    render(<AboutPage />);

    const ctaLink = screen.getByText("Browse Destinations");
    expect(ctaLink).toBeDefined();
    expect(ctaLink.getAttribute("href")).toBe("/destinations");
  });

  it("renders CTA link to register", () => {
    render(<AboutPage />);

    const registerLink = screen.getByText("Create an Account");
    expect(registerLink).toBeDefined();
    expect(registerLink.getAttribute("href")).toBe("/register");
  });
});
