// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

// Mock auth
const mockAuth = vi.fn();
const mockSignOut = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

// Mock Button (since it uses @base-ui/react which may not render in jsdom)
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    variant?: string;
    size?: string;
    type?: string;
    className?: string;
  }) => <button {...props}>{children}</button>,
}));

// Import after mocks
import Navbar from "./Navbar";

describe("Navbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Login and Register links when no session", async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await Navbar();
    render(Component);

    expect(screen.getByText("Login")).toBeDefined();
    expect(screen.getByText("Register")).toBeDefined();
    expect(screen.getByText("Travel Website")).toBeDefined();
  });

  it("renders user name and Logout when session exists", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Alice", email: "alice@example.com" },
    });

    const Component = await Navbar();
    render(Component);

    expect(screen.getByText("Alice")).toBeDefined();
    expect(screen.getByText("Logout")).toBeDefined();
    expect(screen.queryByText("Login")).toBeNull();
    expect(screen.queryByText("Register")).toBeNull();
  });

  it("shows email when name is null", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: null, email: "anon@example.com" },
    });

    const Component = await Navbar();
    render(Component);

    expect(screen.getByText("anon@example.com")).toBeDefined();
  });

  it("renders brand link to home", async () => {
    mockAuth.mockResolvedValue(null);

    const Component = await Navbar();
    render(Component);

    const brandLink = screen.getByText("Travel Website");
    expect(brandLink.getAttribute("href")).toBe("/");
  });
});
