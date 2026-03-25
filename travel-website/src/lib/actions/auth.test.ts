import { describe, it, expect, vi, beforeEach } from "vitest";

/* ---------- mocks (vi.hoisted runs before vi.mock hoisting) ---------- */

const mockSignIn = vi.fn();

const MockAuthError = vi.hoisted(() => {
  class AuthError extends Error {
    type: string;
    constructor(message?: string) {
      super(message);
      this.name = "AuthError";
      this.type = "AuthError";
    }
  }
  return AuthError;
});

vi.mock("@/lib/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}));

vi.mock("next-auth", () => ({
  AuthError: MockAuthError,
}));

import { loginAction } from "./auth";

/* ---------- helpers ---------- */

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

/* ---------- tests ---------- */

describe("loginAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls signIn with the correct credentials and redirectTo", async () => {
    mockSignIn.mockResolvedValue(undefined);

    const fd = makeFormData({
      email: "user@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });

    await loginAction(undefined, fd);

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("defaults redirectTo to '/' when not provided", async () => {
    mockSignIn.mockResolvedValue(undefined);

    const fd = makeFormData({
      email: "user@example.com",
      password: "password123",
    });

    await loginAction(undefined, fd);

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "password123",
      redirectTo: "/",
    });
  });

  it("falls back to '/' when redirectTo is an external URL", async () => {
    mockSignIn.mockResolvedValue(undefined);

    const fd = makeFormData({
      email: "user@example.com",
      password: "password123",
      redirectTo: "https://evil.example/steal-session",
    });

    await loginAction(undefined, fd);

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "password123",
      redirectTo: "/",
    });
  });

  it("falls back to '/' when redirectTo starts with '//'", async () => {
    mockSignIn.mockResolvedValue(undefined);

    const fd = makeFormData({
      email: "user@example.com",
      password: "password123",
      redirectTo: "//evil.example",
    });

    await loginAction(undefined, fd);

    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "password123",
      redirectTo: "/",
    });
  });

  it("returns an error state when signIn throws an AuthError", async () => {
    mockSignIn.mockRejectedValue(new MockAuthError("CredentialsSignin"));

    const fd = makeFormData({
      email: "bad@example.com",
      password: "wrongpassword",
    });

    const result = await loginAction(undefined, fd);

    expect(result).toEqual({ error: "Invalid email or password" });
  });

  it("re-throws non-AuthError errors (e.g. NEXT_REDIRECT)", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    mockSignIn.mockRejectedValue(redirectError);

    const fd = makeFormData({
      email: "user@example.com",
      password: "password123",
    });

    await expect(loginAction(undefined, fd)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns empty object on successful signIn (no redirect thrown)", async () => {
    mockSignIn.mockResolvedValue({ ok: true });

    const fd = makeFormData({
      email: "user@example.com",
      password: "password123",
    });

    const result = await loginAction(undefined, fd);

    expect(result).toEqual({});
  });
});
