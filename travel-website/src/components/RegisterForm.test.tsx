// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// Mock next-auth/react
const mockSignIn = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

// Mock @base-ui/react button to avoid duplicate DOM
vi.mock("@base-ui/react/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
}));

// Mock @base-ui/react input to avoid rendering issues
vi.mock("@base-ui/react/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import RegisterForm from "./RegisterForm";

describe("RegisterForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders name, email, and password fields", () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText("Name")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("renders a submit button", () => {
    render(<RegisterForm />);
    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeDefined();
  });

  it("renders a link to login", () => {
    render(<RegisterForm />);
    const link = screen.getByText("Log in");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/login");
  });

  it("shows error for short password", async () => {
    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Name"), "Test");
    await user.type(screen.getByLabelText("Email"), "t@example.com");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    expect(
      await screen.findByText("Password must be at least 8 characters")
    ).toBeDefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("posts to register API and auto-signs in on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: 1, email: "t@example.com", name: "Test" }),
    });
    mockSignIn.mockResolvedValue({ ok: true });

    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Name"), "Test");
    await user.type(screen.getByLabelText("Email"), "t@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "t@example.com",
        password: "password123",
        name: "Test",
      }),
    });

    // Wait for signIn to be called
    await vi.waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("credentials", {
        email: "t@example.com",
        password: "password123",
        redirect: false,
      });
    });
  });

  it("shows error on 409 duplicate email", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Email already in use" }),
    });

    const user = userEvent.setup();

    render(<RegisterForm />);

    await user.type(screen.getByLabelText("Name"), "Test");
    await user.type(screen.getByLabelText("Email"), "dup@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(
      screen.getByRole("button", { name: "Create Account" })
    );

    expect(
      await screen.findByText("Email already in use")
    ).toBeDefined();
  });
});
