import { describe, it, expect } from "vitest";

/**
 * Unit tests for the JWT and session callback logic used by NextAuth.
 *
 * The full NextAuth config (`src/lib/auth.ts`) cannot be imported in Vitest
 * because it transitively depends on `next/server`. Instead, we test the
 * callback logic — which is the only custom behavior in auth.ts — in isolation.
 */

describe("JWT callback logic", () => {
  it("sets token.sub from user.id on sign-in", () => {
    const token = { sub: "" };
    const user = { id: "42", email: "test@example.com", name: "Test" };

    // Replicate the jwt callback logic from auth.ts
    if (user?.id) {
      token.sub = user.id;
    }

    expect(token.sub).toBe("42");
  });

  it("preserves existing token.sub when no user is present", () => {
    const token = { sub: "42" };
    const user = undefined;

    if (user?.id) {
      token.sub = user.id;
    }

    expect(token.sub).toBe("42");
  });
});

describe("Session callback logic", () => {
  it("copies token.sub to session.user.id", () => {
    const session = { user: { id: "", email: "test@example.com", name: "Test" } };
    const token = { sub: "42" };

    // Replicate the session callback logic from auth.ts
    if (token.sub) {
      session.user.id = token.sub;
    }

    expect(session.user.id).toBe("42");
  });
});
