// @vitest-environment node
import { describe, it, expect, afterEach, vi } from "vitest";
import path from "node:path";

describe("resolveDatabasePath", () => {
  const originalEnv = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalEnv;
    }
    vi.resetModules();
  });

  it("returns default path when DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;
    const { resolveDatabasePath } = await import("./index");
    const result = resolveDatabasePath();
    expect(result).toBe(path.resolve(process.cwd(), "data", "app.db"));
  });

  it("returns resolved absolute path when DATABASE_URL is set", async () => {
    process.env.DATABASE_URL = "/tmp/test-travel/custom.db";
    const { resolveDatabasePath } = await import("./index");
    const result = resolveDatabasePath();
    expect(result).toBe("/tmp/test-travel/custom.db");
  });

  it("resolves relative DATABASE_URL to absolute path", async () => {
    process.env.DATABASE_URL = "relative/path.db";
    const { resolveDatabasePath } = await import("./index");
    const result = resolveDatabasePath();
    expect(result).toBe(path.resolve("relative/path.db"));
  });
});

describe("db client", () => {
  afterEach(() => {
    delete process.env.DATABASE_URL;
    vi.resetModules();
  });

  it("exports a usable Drizzle client that can execute a basic query", async () => {
    process.env.DATABASE_URL = "/tmp/test-travel-db-client/test.db";
    const { db } = await import("./index");
    // Access the underlying better-sqlite3 client
    const client = (db as unknown as { $client: import("better-sqlite3").Database }).$client;
    const row = client.prepare("SELECT 1 as value").get() as { value: number };
    expect(row.value).toBe(1);
  });
});

