import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";
import { destinations } from "./schema";
import { DESTINATION_SEED_DATA } from "./destination-seed-data";
import { downloadImage, upsertDestination } from "./seed";

// ---------------------------------------------------------------------------
// Test helper — in-memory DB with schema (mirrors schema.test.ts pattern)
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
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE INDEX destinations_region_idx ON destinations (region);
    CREATE INDEX destinations_category_idx ON destinations (category);

    CREATE TABLE trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    );
    CREATE INDEX trips_user_id_idx ON trips (user_id);

    CREATE TABLE trip_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
      sort_order INTEGER NOT NULL,
      arrival_date TEXT,
      departure_date TEXT,
      notes TEXT
    );
    CREATE INDEX trip_stops_trip_id_idx ON trip_stops (trip_id);
    CREATE INDEX trip_stops_destination_id_idx ON trip_stops (destination_id);
  `);

  return { db, sqliteDb };
}

// ---------------------------------------------------------------------------
// Seed data completeness
// ---------------------------------------------------------------------------

describe("DESTINATION_SEED_DATA", () => {
  it("contains exactly 30 entries", () => {
    expect(DESTINATION_SEED_DATA).toHaveLength(30);
  });

  it("has unique IDs from 1 to 30", () => {
    const ids = DESTINATION_SEED_DATA.map((d) => d.id);
    expect(new Set(ids).size).toBe(30);
    expect(Math.min(...ids)).toBe(1);
    expect(Math.max(...ids)).toBe(30);
  });

  it("has unique filenames for every entry", () => {
    const filenames = DESTINATION_SEED_DATA.map((d) => d.filename);
    expect(new Set(filenames).size).toBe(30);
  });

  it("has non-empty required fields for every entry", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.name.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
      expect(entry.country.length).toBeGreaterThan(0);
      expect(entry.region.length).toBeGreaterThan(0);
      expect(entry.category.length).toBeGreaterThan(0);
      expect(entry.bestSeason.length).toBeGreaterThan(0);
      expect(entry.sourceUrl.length).toBeGreaterThan(0);
      expect(entry.filename.length).toBeGreaterThan(0);
    }
  });

  it("has valid latitude and longitude for every entry", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.latitude).toBeGreaterThanOrEqual(-90);
      expect(entry.latitude).toBeLessThanOrEqual(90);
      expect(entry.longitude).toBeGreaterThanOrEqual(-180);
      expect(entry.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("has valid price levels (1-5) and ratings (0-5) for every entry", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.priceLevel).toBeGreaterThanOrEqual(1);
      expect(entry.priceLevel).toBeLessThanOrEqual(5);
      expect(entry.rating).toBeGreaterThanOrEqual(0);
      expect(entry.rating).toBeLessThanOrEqual(5);
    }
  });

  it("has valid categories for every entry", () => {
    const validCategories = ["beach", "mountain", "city", "countryside"];
    for (const entry of DESTINATION_SEED_DATA) {
      expect(validCategories).toContain(entry.category);
    }
  });
});

// ---------------------------------------------------------------------------
// downloadImage behavior (mocked fetch)
// ---------------------------------------------------------------------------

describe("downloadImage", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "seed-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("writes downloaded content to the target path", async () => {
    const fakeContent = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(fakeContent.buffer),
      }),
    );

    const destPath = path.join(tmpDir, "test.jpg");
    await downloadImage("https://example.com/image.jpg", destPath);

    const written = await fs.readFile(destPath);
    expect(Buffer.from(written)).toEqual(Buffer.from(fakeContent));
  });

  it("throws on non-OK HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    const destPath = path.join(tmpDir, "missing.jpg");
    await expect(
      downloadImage("https://example.com/missing.jpg", destPath),
    ).rejects.toThrow("HTTP 404");
  });
});

// ---------------------------------------------------------------------------
// upsertDestination — idempotent database writes
// ---------------------------------------------------------------------------

describe("upsertDestination", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let sqliteDb: Database.Database;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqliteDb = testDb.sqliteDb;
  });

  afterEach(() => {
    sqliteDb.close();
  });

  const sampleEntry = DESTINATION_SEED_DATA[0];

  it("inserts a new destination row", () => {
    upsertDestination(db, sampleEntry);

    const rows = db.select().from(destinations).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(sampleEntry.id);
    expect(rows[0].name).toBe(sampleEntry.name);
    expect(rows[0].image).toBe(sampleEntry.filename);
    expect(rows[0].description).toBe(sampleEntry.description);
    expect(rows[0].latitude).toBe(sampleEntry.latitude);
    expect(rows[0].longitude).toBe(sampleEntry.longitude);
  });

  it("stores filename (not sourceUrl) in the image column", () => {
    upsertDestination(db, sampleEntry);

    const row = db.select().from(destinations).all()[0];
    expect(row.image).toBe(sampleEntry.filename);
    expect(row.image).not.toContain("http");
    expect(row.image).not.toContain("/images/destinations/");
  });

  it("updates an existing row on second upsert", () => {
    upsertDestination(db, sampleEntry);

    const updatedEntry = {
      ...sampleEntry,
      description: "Updated description for testing.",
      rating: 3.0,
    };
    upsertDestination(db, updatedEntry);

    const rows = db.select().from(destinations).all();
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Updated description for testing.");
    expect(rows[0].rating).toBe(3.0);
  });

  it("keeps row count at 1 after two upserts of the same ID", () => {
    upsertDestination(db, sampleEntry);
    upsertDestination(db, sampleEntry);

    const rows = db.select().from(destinations).all();
    expect(rows).toHaveLength(1);
  });

  it("inserts all 30 destinations without errors", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      upsertDestination(db, entry);
    }

    const rows = db.select().from(destinations).all();
    expect(rows).toHaveLength(30);
  });
});
