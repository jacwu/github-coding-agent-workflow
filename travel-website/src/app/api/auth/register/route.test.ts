import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { compare } from "bcryptjs";

import * as schema from "@/db/schema";
import { users } from "@/db/schema";

vi.mock("server-only", () => ({}));

let testDb: ReturnType<typeof drizzle>;
let testSqlite: InstanceType<typeof Database>;
let currentDb: ReturnType<typeof drizzle>;

vi.mock("@/db", () => ({
  get db() {
    return currentDb;
  },
}));

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return { db, sqlite };
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createDuplicateInsertDbMock(): ReturnType<typeof drizzle> {
  return {
    select() {
      return {
        from() {
          return {
            where() {
              return {
                get() {
                  return undefined;
                },
              };
            },
          };
        },
      };
    },
    insert() {
      return {
        values() {
          return {
            returning() {
              return {
                get() {
                  throw Object.assign(
                    new Error("UNIQUE constraint failed: users.email"),
                    {
                      code: "SQLITE_CONSTRAINT_UNIQUE",
                    },
                  );
                },
              };
            },
          };
        },
      };
    },
  } as unknown as ReturnType<typeof drizzle>;
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    ({ db: testDb, sqlite: testSqlite } = createTestDb());
    currentDb = testDb;
  });

  afterEach(() => {
    testSqlite.close();
  });

  it("creates a new user and returns 201 with id, email, name", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.email).toBe("test@example.com");
    expect(body.name).toBe("Test User");
    expect(body.passwordHash).toBeUndefined();
    expect(body.password_hash).toBeUndefined();
    expect(body.password).toBeUndefined();
  });

  it("stores a bcrypt hash (not the raw password) in the database", async () => {
    const { POST } = await import("./route");
    await POST(
      makeRequest({
        email: "test@example.com",
        password: "password123",
        name: "Test User",
      }),
    );

    const dbUser = testDb.select().from(users).all()[0];
    expect(dbUser.passwordHash).not.toBe("password123");
    const isValid = await compare("password123", dbUser.passwordHash);
    expect(isValid).toBe(true);
  });

  it("rejects missing email with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({ password: "password123", name: "Test" }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects missing password with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({ email: "test@example.com", name: "Test" }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects missing name with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({ email: "test@example.com", password: "password123" }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects password shorter than 8 characters with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        email: "test@example.com",
        password: "short",
        name: "Test",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("8");
  });

  it("rejects invalid email format with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        email: "not-an-email",
        password: "password123",
        name: "Test",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("email");
  });

  it("rejects duplicate emails with 409", async () => {
    const { POST } = await import("./route");
    await POST(
      makeRequest({
        email: "dup@example.com",
        password: "password123",
        name: "First User",
      }),
    );

    const response = await POST(
      makeRequest({
        email: "dup@example.com",
        password: "password456",
        name: "Second User",
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Email already registered");
  });

  it("normalizes email to lowercase before checking and inserting", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        email: "  TEST@Example.COM  ",
        password: "password123",
        name: "Test",
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.email).toBe("test@example.com");
  });

  it("trims whitespace from name", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        email: "test@example.com",
        password: "password123",
        name: "  Test User  ",
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.name).toBe("Test User");
  });

  it("rejects malformed JSON with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects empty string name with 400", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      makeRequest({
        email: "test@example.com",
        password: "password123",
        name: "   ",
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("detects duplicate even when email casing differs", async () => {
    const { POST } = await import("./route");
    await POST(
      makeRequest({
        email: "user@example.com",
        password: "password123",
        name: "User One",
      }),
    );

    const response = await POST(
      makeRequest({
        email: "USER@Example.COM",
        password: "password456",
        name: "User Two",
      }),
    );

    expect(response.status).toBe(409);
  });

  it("returns 409 when the insert hits a duplicate email constraint", async () => {
    const { POST } = await import("./route");

    currentDb = createDuplicateInsertDbMock();

    const response = await POST(
      makeRequest({
        email: "race@example.com",
        password: "password123",
        name: "Race Condition",
      }),
    );

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Email already registered");
  });
});
