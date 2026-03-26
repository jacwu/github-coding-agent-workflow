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

function seedOne(db: ReturnType<typeof drizzle>): void {
  db.insert(destinations)
    .values({
      name: "Bali",
      description: "A tropical paradise with beautiful beaches",
      country: "Indonesia",
      region: "Asia",
      category: "beach",
      priceLevel: 2,
      rating: 4.7,
      bestSeason: "Apr-Oct",
      latitude: -8.34,
      longitude: 115.09,
      image: "bali.jpg",
    })
    .run();
}

function seedWithNulls(db: ReturnType<typeof drizzle>): void {
  db.insert(destinations)
    .values({
      name: "Mystery Place",
      country: "Unknown",
      category: "city",
      priceLevel: 1,
      rating: 3.0,
      image: "mystery.jpg",
    })
    .run();
}

describe("GET /api/destinations/:id", () => {
  beforeEach(() => {
    ({ db: testDb, sqlite: testSqlite } = createTestDb());
    currentDb = testDb;
  });

  afterEach(() => {
    testSqlite.close();
  });

  // ── Success ───────────────────────────────────────────────────────────────

  it("returns a destination detail with correct field serialization", async () => {
    seedOne(testDb);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/1"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      id: 1,
      name: "Bali",
      description: "A tropical paradise with beautiful beaches",
      country: "Indonesia",
      region: "Asia",
      category: "beach",
      price_level: 2,
      rating: 4.7,
      best_season: "Apr-Oct",
      latitude: -8.34,
      longitude: 115.09,
      image: "/images/destinations/bali.jpg",
    });
  });

  it("returns null for nullable fields when they are null in the database", async () => {
    seedWithNulls(testDb);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/1"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.description).toBeNull();
    expect(body.region).toBeNull();
    expect(body.best_season).toBeNull();
    expect(body.latitude).toBeNull();
    expect(body.longitude).toBeNull();
  });

  it("does not expose createdAt in the response", async () => {
    seedOne(testDb);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/1"),
      { params: Promise.resolve({ id: "1" }) },
    );

    const body = await response.json();
    expect(body.createdAt).toBeUndefined();
    expect(body.created_at).toBeUndefined();
  });

  // ── Invalid ID ────────────────────────────────────────────────────────────

  it("returns 400 for non-numeric id", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/abc"),
      { params: Promise.resolve({ id: "abc" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for id=0", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/0"),
      { params: Promise.resolve({ id: "0" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for negative id", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/-1"),
      { params: Promise.resolve({ id: "-1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for float id", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/1.5"),
      { params: Promise.resolve({ id: "1.5" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  // ── Not found ─────────────────────────────────────────────────────────────

  it("returns 404 for a non-existent id", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/9999"),
      { params: Promise.resolve({ id: "9999" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Destination not found");
  });

  // ── Async params ──────────────────────────────────────────────────────────

  it("correctly handles async params Promise", async () => {
    seedOne(testDb);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/destinations/1"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.name).toBe("Bali");
  });
});
