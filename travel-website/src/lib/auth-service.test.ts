import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";
import { createUser, findUserByEmail, verifyPasswordLogin } from "./auth-service";

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
// Tests
// ---------------------------------------------------------------------------

describe("auth-service", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let sqliteDb: ReturnType<typeof createTestDb>["sqliteDb"];

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqliteDb = testDb.sqliteDb;
  });

  // ---- createUser ----

  describe("createUser", () => {
    it("creates a user and returns safe fields (no passwordHash)", async () => {
      const user = await createUser(db, {
        email: "alice@example.com",
        password: "securepassword",
        name: "Alice",
      });

      expect(user).toEqual({
        id: expect.any(Number),
        email: "alice@example.com",
        name: "Alice",
      });
      expect(user).not.toHaveProperty("passwordHash");
    });

    it("hashes the password (stored value differs from plaintext)", async () => {
      await createUser(db, {
        email: "bob@example.com",
        password: "mypassword",
        name: "Bob",
      });

      const row = sqliteDb
        .prepare("SELECT password_hash FROM users WHERE email = ?")
        .get("bob@example.com") as { password_hash: string } | undefined;

      expect(row).toBeDefined();
      expect(row!.password_hash).not.toBe("mypassword");
      expect(row!.password_hash).toMatch(/^\$2[aby]?\$/); // bcrypt hash prefix
    });

    it("rejects duplicate emails", async () => {
      await createUser(db, {
        email: "dup@example.com",
        password: "password123",
        name: "First",
      });

      await expect(
        createUser(db, {
          email: "dup@example.com",
          password: "password456",
          name: "Second",
        }),
      ).rejects.toThrow();
    });
  });

  // ---- findUserByEmail ----

  describe("findUserByEmail", () => {
    it("returns the user when found", async () => {
      await createUser(db, {
        email: "find@example.com",
        password: "password123",
        name: "Findable",
      });

      const user = await findUserByEmail(db, "find@example.com");
      expect(user).not.toBeNull();
      expect(user!.email).toBe("find@example.com");
      expect(user!.name).toBe("Findable");
    });

    it("returns null for unknown email", async () => {
      const user = await findUserByEmail(db, "unknown@example.com");
      expect(user).toBeNull();
    });

    it("finds user with mixed-case email lookup", async () => {
      await createUser(db, {
        email: "mixed@example.com",
        password: "password123",
        name: "Mixed",
      });

      const user = await findUserByEmail(db, "  MIXED@Example.COM  ");
      expect(user).not.toBeNull();
      expect(user!.email).toBe("mixed@example.com");
    });
  });

  // ---- verifyPasswordLogin ----

  describe("verifyPasswordLogin", () => {
    beforeEach(async () => {
      await createUser(db, {
        email: "login@example.com",
        password: "correctpassword",
        name: "LoginUser",
      });
    });

    it("succeeds with correct credentials", async () => {
      const result = await verifyPasswordLogin(db, "login@example.com", "correctpassword");
      expect(result).toEqual({
        id: expect.any(Number),
        email: "login@example.com",
        name: "LoginUser",
      });
    });

    it("returns null for unknown email", async () => {
      const result = await verifyPasswordLogin(db, "nope@example.com", "correctpassword");
      expect(result).toBeNull();
    });

    it("returns null for wrong password", async () => {
      const result = await verifyPasswordLogin(db, "login@example.com", "wrongpassword");
      expect(result).toBeNull();
    });

    it("succeeds with mixed-case email", async () => {
      const result = await verifyPasswordLogin(db, "LOGIN@Example.COM", "correctpassword");
      expect(result).not.toBeNull();
      expect(result!.email).toBe("login@example.com");
    });
  });
});
