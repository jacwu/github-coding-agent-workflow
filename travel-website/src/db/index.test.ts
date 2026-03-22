import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("server-only", () => ({}));

describe("db module", () => {
  beforeAll(() => {
    process.env.DATABASE_URL = ":memory:";
  });

  it("exports a defined db instance", async () => {
    const { db } = await import("./index");
    expect(db).toBeDefined();
  });

  it("can execute a basic SQLite query", async () => {
    const { db } = await import("./index");
    const result = db.run(/* sql */ `SELECT 1 AS value`);
    expect(result).toBeDefined();
  });

  it("returns the same instance on repeated imports (singleton)", async () => {
    const mod1 = await import("./index");
    const mod2 = await import("./index");
    expect(mod1.db).toBe(mod2.db);
  });
});
