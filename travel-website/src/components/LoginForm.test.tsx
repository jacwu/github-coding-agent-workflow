// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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

import LoginForm from "./LoginForm";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("renders a submit button", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
  });

  it("renders a link to register", () => {
    render(<LoginForm />);
    const link = screen.getByText("Register");
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toBe("/register");
  });

  it("preserves the callback URL in the register link", () => {
    render(<LoginForm callbackUrl="/trips" />);
    const link = screen.getByText("Register");
    expect(link.getAttribute("href")).toBe("/register?callbackUrl=%2Ftrips");
  });

  it("calls signIn on form submission", async () => {
    mockSignIn.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirect: false,
    });
  });

  it("shows error message on failed login", async () => {
    mockSignIn.mockResolvedValue({ ok: false, error: "CredentialsSignin" });
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "test@example.com");
    await user.type(screen.getByLabelText("Password"), "wrongpass");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Invalid email or password")).toBeDefined();
  });

  it("renders a success prompt when provided", () => {
    render(<LoginForm successMessage="Account created. Please sign in." />);
    expect(screen.getByText("Account created. Please sign in.")).toBeDefined();
  });
});
