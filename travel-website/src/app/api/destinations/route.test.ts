import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";
import { destinations } from "@/db/schema";

vi.mock("server-only", () => ({}));

let testDb: ReturnType<typeof drizzle>;
let testSqlite: InstanceType<typeof Database>;
let currentDb: ReturnType<typeof drizzle>;

vi.mock("@/db", () => ({
  get db() {
    return currentDb;
  },
}));

const CREATE_TABLE_SQL = `
  CREATE TABLE destinations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    country TEXT NOT NULL,
    region TEXT,
    category TEXT NOT NULL,
    price_level INTEGER NOT NULL,
    rating REAL NOT NULL DEFAULT 0,
    best_season TEXT,
    latitude REAL,
    longitude REAL,
    image TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`;

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  sqlite.exec(CREATE_TABLE_SQL);
  return { db, sqlite };
}

function makeUrl(params: Record<string, string> = {}): string {
  const url = new URL("http://localhost/api/destinations");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return url.toString();
}

function makeRequest(params: Record<string, string> = {}): Request {
  return new Request(makeUrl(params), { method: "GET" });
}

function seedDestinations(db: ReturnType<typeof drizzle>): void {
  db.insert(destinations)
    .values([
      { name: "Bali", description: "Tropical paradise", country: "Indonesia", region: "Asia", category: "beach", priceLevel: 2, rating: 4.7, bestSeason: "Apr-Oct", latitude: -8.34, longitude: 115.09, image: "bali.jpg" },
      { name: "Paris", description: "City of lights", country: "France", region: "Europe", category: "city", priceLevel: 4, rating: 4.7, bestSeason: "Apr-Jun", latitude: 48.86, longitude: 2.35, image: "paris.jpg" },
      { name: "Swiss Alps", description: "Mountain paradise", country: "Switzerland", region: "Europe", category: "mountain", priceLevel: 5, rating: 4.8, bestSeason: "Jun-Sep", latitude: 46.82, longitude: 8.23, image: "swiss-alps.jpg" },
      { name: "Kyoto", description: "Ancient capital with temples", country: "Japan", region: "Asia", category: "city", priceLevel: 3, rating: 4.8, bestSeason: "Mar-May", latitude: 35.01, longitude: 135.77, image: "kyoto.jpg" },
      { name: "Cancún", description: "Beach resort paradise", country: "Mexico", region: "North America", category: "beach", priceLevel: 3, rating: 4.5, bestSeason: "Dec-Apr", latitude: 21.16, longitude: -86.85, image: "cancun.jpg" },
      { name: "Tuscany", description: "Rolling hills and vineyards", country: "Italy", region: "Europe", category: "countryside", priceLevel: 4, rating: 4.7, bestSeason: "Apr-Jun", latitude: 43.77, longitude: 11.25, image: "tuscany.jpg" },
    ])
    .run();
}

describe("GET /api/destinations", () => {
  beforeEach(() => {
    ({ db: testDb, sqlite: testSqlite } = createTestDb());
    currentDb = testDb;
  });

  afterEach(() => {
    testSqlite.close();
  });

  // ── Default listing ───────────────────────────────────────────────────────

  it("returns default page with metadata when no params are provided", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBe(6);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(12);
    expect(body.data).toHaveLength(6);
  });

  it("returns empty data array with 200 when no destinations exist", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  // ── Serialization ─────────────────────────────────────────────────────────

  it("serializes list items with correct field names and image URLs", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest());
    const body = await response.json();

    const bali = body.data.find((d: Record<string, unknown>) => d.name === "Bali");
    expect(bali).toBeDefined();
    expect(bali.price_level).toBe(2);
    expect(bali.image).toBe("/images/destinations/bali.jpg");
    expect(bali.region).toBe("Asia");
    // Should not expose internal field names
    expect(bali.priceLevel).toBeUndefined();
    expect(bali.createdAt).toBeUndefined();
    expect(bali.created_at).toBeUndefined();
    expect(bali.description).toBeUndefined();
  });

  // ── Keyword search ────────────────────────────────────────────────────────

  it("keyword search matches name case-insensitively", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ q: "bali" }));
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.data[0].name).toBe("Bali");
  });

  it("keyword search matches country", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ q: "Japan" }));
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.data[0].name).toBe("Kyoto");
  });

  it("keyword search matches description", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ q: "temple" }));
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.data[0].name).toBe("Kyoto");
  });

  it("keyword search with empty string is ignored", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ q: "  " }));
    const body = await response.json();

    expect(body.total).toBe(6);
  });

  // ── Category filter ───────────────────────────────────────────────────────

  it("category filter narrows results case-insensitively", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ category: "Beach" }));
    const body = await response.json();

    expect(body.total).toBe(2);
    const names = body.data.map((d: Record<string, unknown>) => d.name);
    expect(names).toContain("Bali");
    expect(names).toContain("Cancún");
  });

  // ── Region filter ─────────────────────────────────────────────────────────

  it("region filter narrows results case-insensitively", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ region: "europe" }));
    const body = await response.json();

    expect(body.total).toBe(3);
    const names = body.data.map((d: Record<string, unknown>) => d.name);
    expect(names).toContain("Paris");
    expect(names).toContain("Swiss Alps");
    expect(names).toContain("Tuscany");
  });

  // ── Price range filter ────────────────────────────────────────────────────

  it("price_min and price_max filter correctly", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ price_min: "3", price_max: "4" }));
    const body = await response.json();

    expect(body.total).toBe(4);
    for (const d of body.data) {
      expect(d.price_level).toBeGreaterThanOrEqual(3);
      expect(d.price_level).toBeLessThanOrEqual(4);
    }
  });

  it("price_min alone filters correctly", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ price_min: "4" }));
    const body = await response.json();

    expect(body.total).toBe(3);
    for (const d of body.data) {
      expect(d.price_level).toBeGreaterThanOrEqual(4);
    }
  });

  // ── Combined filters ──────────────────────────────────────────────────────

  it("combines multiple filters with AND", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ region: "Europe", category: "city" }));
    const body = await response.json();

    expect(body.total).toBe(1);
    expect(body.data[0].name).toBe("Paris");
  });

  // ── Sorting ───────────────────────────────────────────────────────────────

  it("sort=rating returns destinations ordered by rating DESC", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ sort: "rating" }));
    const body = await response.json();

    const ratings = body.data.map((d: Record<string, unknown>) => d.rating);
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
    }
  });

  it("sort=price returns destinations ordered by price ASC", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ sort: "price" }));
    const body = await response.json();

    const prices = body.data.map((d: Record<string, unknown>) => d.price_level);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("sort=price_desc returns destinations ordered by price DESC", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ sort: "price_desc" }));
    const body = await response.json();

    const prices = body.data.map((d: Record<string, unknown>) => d.price_level);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
    }
  });

  it("sort=popularity uses rating DESC fallback", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ sort: "popularity" }));
    const body = await response.json();

    const ratings = body.data.map((d: Record<string, unknown>) => d.rating);
    for (let i = 1; i < ratings.length; i++) {
      expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
    }
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  it("pagination returns correct page and limit", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ page: "1", limit: "2" }));
    const body = await response.json();

    expect(body.page).toBe(1);
    expect(body.limit).toBe(2);
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(6);
  });

  it("pagination page 2 returns remaining results", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ page: "2", limit: "4" }));
    const body = await response.json();

    expect(body.page).toBe(2);
    expect(body.data).toHaveLength(2);
    expect(body.total).toBe(6);
  });

  it("limit is capped at 50", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ limit: "100" }));
    const body = await response.json();

    expect(body.limit).toBe(50);
  });

  it("returns empty data when page exceeds total pages", async () => {
    seedDestinations(testDb);
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ page: "100" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(6);
  });

  // ── Validation errors ─────────────────────────────────────────────────────

  it("returns 400 for invalid page value", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ page: "abc" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("page");
  });

  it("returns 400 for page=0", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ page: "0" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("page");
  });

  it("returns 400 for negative page", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ page: "-1" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("page");
  });

  it("returns 400 for invalid limit value", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ limit: "0" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("limit");
  });

  it("returns 400 for price_min out of range", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ price_min: "0" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("price_min");
  });

  it("returns 400 for price_max out of range", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ price_max: "6" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("price_max");
  });

  it("returns 400 for non-numeric price_min", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ price_min: "abc" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("price_min");
  });

  it("returns 400 when price_min > price_max", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ price_min: "4", price_max: "2" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("price_min");
  });

  it("returns 400 for invalid sort value", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeRequest({ sort: "invalid" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("sort");
  });
});
