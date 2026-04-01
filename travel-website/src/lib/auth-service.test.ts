import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";

import * as schema from "@/db/schema";

// Dynamically import auth-service to bypass "server-only" guard
vi.mock("server-only", () => ({}));

const { createUser, findUserByEmail, verifyPasswordLogin } = await import(
  "./auth-service"
);

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const testDb = drizzle(sqlite, { schema });

  testDb.run(sql`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);

  return testDb;
}

describe("auth-service", () => {
  let testDb: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    testDb = createTestDb();
  });

  describe("createUser", () => {
    it("inserts a user and returns user without password hash", async () => {
      const user = await createUser(
        { email: "test@example.com", password: "password123", name: "Test User" },
        testDb
      );

      expect(user.id).toBeDefined();
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
      expect(user.createdAt).toBeDefined();
      expect("passwordHash" in user).toBe(false);
    });

    it("throws on duplicate email", async () => {
      await createUser(
        { email: "dup@example.com", password: "password123", name: "User 1" },
        testDb
      );

      await expect(
        createUser(
          { email: "dup@example.com", password: "password456", name: "User 2" },
          testDb
        )
      ).rejects.toThrow();
    });
  });

  describe("findUserByEmail", () => {
    it("returns the user with password hash when found", async () => {
      await createUser(
        { email: "find@example.com", password: "password123", name: "Find Me" },
        testDb
      );

      const user = await findUserByEmail("find@example.com", testDb);
      expect(user).not.toBeNull();
      expect(user?.email).toBe("find@example.com");
      expect(user?.passwordHash).toBeDefined();
    });

    it("returns null when not found", async () => {
      const user = await findUserByEmail("nobody@example.com", testDb);
      expect(user).toBeNull();
    });
  });

  describe("verifyPasswordLogin", () => {
    it("returns user without hash on valid credentials", async () => {
      await createUser(
        { email: "verify@example.com", password: "correctpass", name: "Verify" },
        testDb
      );

      const user = await verifyPasswordLogin(
        "verify@example.com",
        "correctpass",
        testDb
      );

      expect(user).not.toBeNull();
      expect(user?.email).toBe("verify@example.com");
      expect(user?.name).toBe("Verify");
      expect("passwordHash" in (user ?? {})).toBe(false);
    });

    it("returns null on wrong password", async () => {
      await createUser(
        { email: "wrong@example.com", password: "correctpass", name: "Wrong" },
        testDb
      );

      const user = await verifyPasswordLogin(
        "wrong@example.com",
        "wrongpass",
        testDb
      );

      expect(user).toBeNull();
    });

    it("returns null when user does not exist", async () => {
      const user = await verifyPasswordLogin(
        "ghost@example.com",
        "somepass",
        testDb
      );

      expect(user).toBeNull();
    });
  });
});
