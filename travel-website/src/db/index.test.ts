// @vitest-environment node
import path from "node:path";
import { fileURLToPath } from "node:url";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("resolveDatabasePath", () => {
  const originalEnv = process.env.DATABASE_URL;
  const originalCwd = process.cwd();

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalEnv;
    }
    process.chdir(originalCwd);
    vi.resetModules();
  });

  it("returns default path when DATABASE_URL is not set", async () => {
    delete process.env.DATABASE_URL;
    const { resolveDatabasePath } = await import("./index");
    const result = resolveDatabasePath();
    expect(result).toBe(path.resolve(appRoot, "data", "app.db"));
  });

  it("keeps the default path anchored to the app root when cwd changes", async () => {
    delete process.env.DATABASE_URL;
    process.chdir("/tmp");
    const { resolveDatabasePath } = await import("./index");
    const result = resolveDatabasePath();
    expect(result).toBe(path.resolve(appRoot, "data", "app.db"));
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
    expect(result).toBe(path.resolve(appRoot, "relative/path.db"));
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
    const row = db.get<{ value: number }>(sql`select 1 as value`);
    expect(row.value).toBe(1);
  });
});
