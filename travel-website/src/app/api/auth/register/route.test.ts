import { describe, it, expect, vi, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";
import { createUser } from "@/lib/auth-service";

/**
 * Registration route tests.
 *
 * The route handler cannot be directly imported in Vitest because it depends
 * on `next/server` (NextResponse) and `@/db` (server-only). Instead we test
 * the underlying service and validation functions that the route composes,
 * and add integration-style tests that mock the DB module.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestDb() {
  const sqliteDb = new Database(":memory:");
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
  const db = drizzle(sqliteDb, { schema });

  sqliteDb.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE UNIQUE INDEX users_email_unique ON users (email);
  `);

  return { db, sqliteDb };
}

// ---------------------------------------------------------------------------
// Mock-based route handler tests
// ---------------------------------------------------------------------------

let testDb: ReturnType<typeof createTestDb>["db"];

vi.mock("@/db", () => ({
  get db() {
    return testDb;
  },
}));

// Must mock next/server's NextResponse for the route handler
vi.mock("next/server", () => {
  return {
    NextResponse: {
      json(data: unknown, init?: { status?: number }) {
        return {
          status: init?.status ?? 200,
          json: async () => data,
          _data: data,
        };
      },
    },
  };
});

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    const created = createTestDb();
    testDb = created.db;
  });

  async function importRoute() {
    // Dynamic import so it picks up the fresh mock
    const mod = await import("./route");
    return mod.POST;
  }

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 201 and safe user fields on success", async () => {
    const POST = await importRoute();
    const response = await POST(
      makeRequest({
        email: "new@example.com",
        password: "securepassword",
        name: "New User",
      }),
    );

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data).toEqual({
      id: expect.any(Number),
      email: "new@example.com",
      name: "New User",
    });
    expect(data).not.toHaveProperty("passwordHash");
    expect(data).not.toHaveProperty("password_hash");
  });

  it("returns 409 for duplicate email", async () => {
    const POST = await importRoute();

    // Create the first user
    await createUser(testDb, {
      email: "dup@example.com",
      password: "password123",
      name: "First",
    });

    const response = await POST(
      makeRequest({
        email: "dup@example.com",
        password: "password456",
        name: "Second",
      }),
    );

    expect(response.status).toBe(409);
    const data = await response.json();
    expect(data.error).toBe("Email already registered");
  });

  it("returns 422 for invalid email format", async () => {
    const POST = await importRoute();
    const response = await POST(
      makeRequest({
        email: "not-an-email",
        password: "securepassword",
        name: "Test",
      }),
    );

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBe("email format is invalid");
  });

  it("returns 422 for short password", async () => {
    const POST = await importRoute();
    const response = await POST(
      makeRequest({
        email: "test@example.com",
        password: "short",
        name: "Test",
      }),
    );

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toContain("password must be at least");
  });

  it("returns 422 for missing fields", async () => {
    const POST = await importRoute();
    const response = await POST(
      makeRequest({
        email: "test@example.com",
      }),
    );

    expect(response.status).toBe(422);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it("returns 400 for invalid JSON", async () => {
    const POST = await importRoute();
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe("Invalid JSON body");
  });
});
