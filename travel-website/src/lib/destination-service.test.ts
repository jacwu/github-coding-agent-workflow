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

describe("getDestinations", () => {
  beforeEach(() => {
    ({ db: testDb, sqlite: testSqlite } = createTestDb());
    currentDb = testDb;
  });

  afterEach(() => {
    testSqlite.close();
  });

  it("returns paginated results with correct shape when no filters are applied", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ page: 1, limit: 12 });

    expect(result.total).toBe(6);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(12);
    expect(result.data).toHaveLength(6);

    const item = result.data[0];
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("name");
    expect(item).toHaveProperty("country");
    expect(item).toHaveProperty("region");
    expect(item).toHaveProperty("category");
    expect(item).toHaveProperty("price_level");
    expect(item).toHaveProperty("rating");
    expect(item).toHaveProperty("image");
  });

  it("keyword search filters destinations by name", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ q: "bali", page: 1, limit: 12 });

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe("Bali");
  });

  it("region filter returns only matching destinations", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ region: "Asia", page: 1, limit: 12 });

    expect(result.total).toBe(2);
    const names = result.data.map((d) => d.name);
    expect(names).toContain("Bali");
    expect(names).toContain("Kyoto");
  });

  it("category filter returns only matching destinations", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ category: "beach", page: 1, limit: 12 });

    expect(result.total).toBe(2);
    const names = result.data.map((d) => d.name);
    expect(names).toContain("Bali");
    expect(names).toContain("Cancún");
  });

  it("price range filter returns destinations within range", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ priceMin: 3, priceMax: 4, page: 1, limit: 12 });

    expect(result.total).toBe(4);
    for (const d of result.data) {
      expect(d.price_level).toBeGreaterThanOrEqual(3);
      expect(d.price_level).toBeLessThanOrEqual(4);
    }
  });

  it("sort=price_asc orders results by price ascending", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ sort: "price_asc", page: 1, limit: 12 });

    const prices = result.data.map((d) => d.price_level);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });

  it("pagination returns the correct slice", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ page: 2, limit: 5 });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(5);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(6);
  });

  it("combined filters narrow results correctly", async () => {
    seedDestinations(testDb);
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ region: "Europe", category: "city", page: 1, limit: 12 });

    expect(result.total).toBe(1);
    expect(result.data[0].name).toBe("Paris");
  });

  it("returns empty data when no destinations exist", async () => {
    const { getDestinations } = await import("./destination-service");
    const result = getDestinations({ page: 1, limit: 12 });

    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("getDestinationById", () => {
  beforeEach(() => {
    ({ db: testDb, sqlite: testSqlite } = createTestDb());
    currentDb = testDb;
  });

  afterEach(() => {
    testSqlite.close();
  });

  it("returns full detail payload for a valid id", async () => {
    seedDestinations(testDb);
    const { getDestinationById } = await import("./destination-service");
    const result = getDestinationById(1);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.name).toBe("Bali");
    expect(result!.description).toBe("Tropical paradise");
    expect(result!.country).toBe("Indonesia");
    expect(result!.region).toBe("Asia");
    expect(result!.category).toBe("beach");
    expect(result!.price_level).toBe(2);
    expect(result!.rating).toBe(4.7);
    expect(result!.best_season).toBe("Apr-Oct");
    expect(result!.latitude).toBe(-8.34);
    expect(result!.longitude).toBe(115.09);
    expect(result!.image).toBe("/images/destinations/bali.jpg");
  });

  it("returns null for a non-existent id", async () => {
    const { getDestinationById } = await import("./destination-service");
    const result = getDestinationById(9999);

    expect(result).toBeNull();
  });
});
