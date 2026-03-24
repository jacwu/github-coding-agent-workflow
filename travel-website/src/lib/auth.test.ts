import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { hash } from "bcryptjs";

import * as schema from "@/db/schema";

vi.mock("server-only", () => ({}));

let testDb: ReturnType<typeof drizzle>;
let testSqlite: InstanceType<typeof Database>;

vi.mock("@/db", () => ({
  get db() {
    return testDb;
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

async function insertTestUser(
  db: ReturnType<typeof drizzle>,
  email: string,
  password: string,
  name: string,
) {
  const passwordHash = await hash(password, 10);
  db.insert(schema.users)
    .values({ email, passwordHash, name })
    .run();
}

// Extract the authorize function and callbacks from the auth config
// We can't directly import them since NextAuth wraps them, so we re-import the module
// and extract the credentials provider logic.
async function getAuthConfig() {
  // We need to mock next-auth to intercept the config
  const configCapture: { config: Record<string, unknown> | null } = { config: null };

  vi.doMock("next-auth", () => ({
    default: (config: Record<string, unknown>) => {
      configCapture.config = config;
      return {
        handlers: { GET: vi.fn(), POST: vi.fn() },
        auth: vi.fn(),
        signIn: vi.fn(),
        signOut: vi.fn(),
      };
    },
  }));

  vi.doMock("next-auth/providers/credentials", () => ({
    default: (opts: Record<string, unknown>) => ({ ...opts, type: "credentials" }),
  }));

  // Force fresh import
  const mod = await import("./auth");

  // Restore mocks for next tests
  vi.doUnmock("next-auth");
  vi.doUnmock("next-auth/providers/credentials");

  return { config: configCapture.config, mod };
}

describe("auth module — credentials authorize", () => {
  let authorizeFunction: (
    credentials: Record<string, unknown>,
  ) => Promise<{ id: string; email: string; name: string } | null>;

  beforeEach(async () => {
    vi.resetModules();
    ({ db: testDb, sqlite: testSqlite } = createTestDb());

    const { config } = await getAuthConfig();
    const providers = config?.providers as Array<{ authorize?: typeof authorizeFunction }>;
    const credentialsProvider = providers.find(
      (p: Record<string, unknown>) => p.type === "credentials",
    );
    authorizeFunction = credentialsProvider!.authorize as typeof authorizeFunction;
  });

  afterEach(() => {
    testSqlite.close();
    vi.resetModules();
  });

  it("returns a user object for valid email/password", async () => {
    await insertTestUser(testDb, "alice@example.com", "correctpass", "Alice");

    const result = await authorizeFunction({
      email: "alice@example.com",
      password: "correctpass",
    });

    expect(result).not.toBeNull();
    expect(result!.email).toBe("alice@example.com");
    expect(result!.name).toBe("Alice");
  });

  it("returns null for an unknown email", async () => {
    const result = await authorizeFunction({
      email: "nobody@example.com",
      password: "somepass",
    });

    expect(result).toBeNull();
  });

  it("returns null for a wrong password", async () => {
    await insertTestUser(testDb, "bob@example.com", "correctpass", "Bob");

    const result = await authorizeFunction({
      email: "bob@example.com",
      password: "wrongpass",
    });

    expect(result).toBeNull();
  });

  it("normalizes email to lowercase for credential lookup", async () => {
    await insertTestUser(testDb, "carol@example.com", "mypassword", "Carol");

    const result = await authorizeFunction({
      email: "  CAROL@Example.COM  ",
      password: "mypassword",
    });

    expect(result).not.toBeNull();
    expect(result!.email).toBe("carol@example.com");
  });

  it("returns user ID as a string (not an integer)", async () => {
    await insertTestUser(testDb, "dave@example.com", "password123", "Dave");

    const result = await authorizeFunction({
      email: "dave@example.com",
      password: "password123",
    });

    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe("string");
    expect(result!.id).toBe("1");
  });

  it("returns null for missing email", async () => {
    const result = await authorizeFunction({
      password: "somepass",
    });

    expect(result).toBeNull();
  });

  it("returns null for missing password", async () => {
    await insertTestUser(testDb, "test@example.com", "password123", "Test");

    const result = await authorizeFunction({
      email: "test@example.com",
    });

    expect(result).toBeNull();
  });
});

describe("auth module — session callbacks", () => {
  let callbacks: {
    jwt: (params: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Record<string, unknown>;
    session: (params: { session: { user: Record<string, unknown> }; token: Record<string, unknown> }) => { user: Record<string, unknown> };
  };

  beforeEach(async () => {
    vi.resetModules();
    ({ db: testDb, sqlite: testSqlite } = createTestDb());

    const { config } = await getAuthConfig();
    callbacks = config?.callbacks as typeof callbacks;
  });

  afterEach(() => {
    testSqlite.close();
    vi.resetModules();
  });

  it("jwt callback copies user.id onto token.id during initial sign-in", () => {
    const token = { sub: "some-sub" };
    const user = { id: "42", email: "test@example.com", name: "Test" };

    const result = callbacks.jwt({ token, user });

    expect(result.id).toBe("42");
  });

  it("jwt callback preserves existing token when no user is present", () => {
    const token = { sub: "some-sub", id: "42" };

    const result = callbacks.jwt({ token });

    expect(result.id).toBe("42");
  });

  it("session callback copies token.id onto session.user.id", () => {
    const session = { user: { name: "Test", email: "test@example.com" } };
    const token = { id: "42", sub: "some-sub" };

    const result = callbacks.session({ session, token });

    expect(result.user.id).toBe("42");
  });
});

describe("auth module — configuration", () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ db: testDb, sqlite: testSqlite } = createTestDb());
  });

  afterEach(() => {
    testSqlite.close();
    vi.resetModules();
  });

  it("uses JWT session strategy", async () => {
    const { config } = await getAuthConfig();
    const session = config?.session as { strategy: string };
    expect(session.strategy).toBe("jwt");
  });

  it("sets signIn page to /login", async () => {
    const { config } = await getAuthConfig();
    const pages = config?.pages as { signIn: string };
    expect(pages.signIn).toBe("/login");
  });

  it("sets trustHost to true", async () => {
    const { config } = await getAuthConfig();
    expect(config?.trustHost).toBe(true);
  });
});
