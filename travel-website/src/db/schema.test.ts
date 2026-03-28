import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";
import {
  users,
  destinations,
  trips,
  tripStops,
  usersRelations,
  destinationsRelations,
  tripsRelations,
  tripStopsRelations,
} from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestDb() {
  const sqliteDb = new Database(":memory:");
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
  const db = drizzle(sqliteDb, { schema });

  // Push schema to the in-memory database using raw SQL derived from the
  // Drizzle table definitions.
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
// Export verification
// ---------------------------------------------------------------------------

describe("schema exports", () => {
  it("exports all four table definitions", () => {
    expect(users).toBeDefined();
    expect(destinations).toBeDefined();
    expect(trips).toBeDefined();
    expect(tripStops).toBeDefined();
  });

  it("exports all four relation definitions", () => {
    expect(usersRelations).toBeDefined();
    expect(destinationsRelations).toBeDefined();
    expect(tripsRelations).toBeDefined();
    expect(tripStopsRelations).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Column verification
// ---------------------------------------------------------------------------

describe("table columns", () => {
  it("users table has expected columns", () => {
    const columnNames = Object.keys(users);
    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "email",
        "passwordHash",
        "name",
        "avatarUrl",
        "createdAt",
      ]),
    );
  });

  it("destinations table has expected columns", () => {
    const columnNames = Object.keys(destinations);
    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "name",
        "description",
        "country",
        "region",
        "category",
        "priceLevel",
        "rating",
        "bestSeason",
        "latitude",
        "longitude",
        "image",
        "createdAt",
      ]),
    );
  });

  it("trips table has expected columns", () => {
    const columnNames = Object.keys(trips);
    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "userId",
        "title",
        "startDate",
        "endDate",
        "status",
        "createdAt",
        "updatedAt",
      ]),
    );
  });

  it("tripStops table has expected columns", () => {
    const columnNames = Object.keys(tripStops);
    expect(columnNames).toEqual(
      expect.arrayContaining([
        "id",
        "tripId",
        "destinationId",
        "sortOrder",
        "arrivalDate",
        "departureDate",
        "notes",
      ]),
    );
  });
});

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

describe("CRUD operations", () => {
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

  it("inserts and selects a user", () => {
    const inserted = db
      .insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .returning()
      .get();

    expect(inserted.id).toBe(1);
    expect(inserted.email).toBe("a@b.com");
    expect(inserted.name).toBe("Alice");
    expect(inserted.createdAt).toBeTruthy();
  });

  it("inserts and selects a destination", () => {
    const inserted = db
      .insert(destinations)
      .values({
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        priceLevel: 2,
        image: "bali.jpg",
      })
      .returning()
      .get();

    expect(inserted.id).toBe(1);
    expect(inserted.name).toBe("Bali");
    expect(inserted.rating).toBe(0);
    expect(inserted.createdAt).toBeTruthy();
  });

  it("inserts and selects a trip", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();

    const inserted = db
      .insert(trips)
      .values({ userId: 1, title: "My Trip" })
      .returning()
      .get();

    expect(inserted.id).toBe(1);
    expect(inserted.userId).toBe(1);
    expect(inserted.status).toBe("draft");
    expect(inserted.createdAt).toBeTruthy();
    expect(inserted.updatedAt).toBeTruthy();
  });

  it("inserts and selects a trip stop", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();
    db.insert(destinations)
      .values({
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        priceLevel: 2,
        image: "bali.jpg",
      })
      .run();
    db.insert(trips).values({ userId: 1, title: "My Trip" }).run();

    const inserted = db
      .insert(tripStops)
      .values({ tripId: 1, destinationId: 1, sortOrder: 1 })
      .returning()
      .get();

    expect(inserted.id).toBe(1);
    expect(inserted.tripId).toBe(1);
    expect(inserted.destinationId).toBe(1);
    expect(inserted.sortOrder).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Relational queries
// ---------------------------------------------------------------------------

describe("relational queries", () => {
  let db: ReturnType<typeof createTestDb>["db"];
  let sqliteDb: Database.Database;

  beforeEach(() => {
    const testDb = createTestDb();
    db = testDb.db;
    sqliteDb = testDb.sqliteDb;

    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();
    db.insert(destinations)
      .values({
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        priceLevel: 2,
        image: "bali.jpg",
      })
      .run();
    db.insert(trips).values({ userId: 1, title: "Asia Trip" }).run();
    db.insert(tripStops)
      .values({ tripId: 1, destinationId: 1, sortOrder: 1 })
      .run();
  });

  afterEach(() => {
    sqliteDb.close();
  });

  it("loads user with trips via relational query", async () => {
    const result = await db.query.users.findFirst({
      with: { trips: true },
    });

    expect(result).toBeDefined();
    expect(result!.trips).toHaveLength(1);
    expect(result!.trips[0].title).toBe("Asia Trip");
  });

  it("loads trip with user and stops via relational query", async () => {
    const result = await db.query.trips.findFirst({
      with: { user: true, stops: true },
    });

    expect(result).toBeDefined();
    expect(result!.user.name).toBe("Alice");
    expect(result!.stops).toHaveLength(1);
  });

  it("loads trip stop with trip and destination via relational query", async () => {
    const result = await db.query.tripStops.findFirst({
      with: { trip: true, destination: true },
    });

    expect(result).toBeDefined();
    expect(result!.trip.title).toBe("Asia Trip");
    expect(result!.destination.name).toBe("Bali");
  });

  it("loads destination with tripStops via relational query", async () => {
    const result = await db.query.destinations.findFirst({
      with: { tripStops: true },
    });

    expect(result).toBeDefined();
    expect(result!.tripStops).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Foreign key constraints
// ---------------------------------------------------------------------------

describe("foreign key constraints", () => {
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

  it("cascades trip deletion when user is deleted", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();
    db.insert(trips).values({ userId: 1, title: "My Trip" }).run();

    db.delete(users).run();

    const remainingTrips = db.select().from(trips).all();
    expect(remainingTrips).toHaveLength(0);
  });

  it("cascades trip stop deletion when trip is deleted", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();
    db.insert(destinations)
      .values({
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        priceLevel: 2,
        image: "bali.jpg",
      })
      .run();
    db.insert(trips).values({ userId: 1, title: "My Trip" }).run();
    db.insert(tripStops)
      .values({ tripId: 1, destinationId: 1, sortOrder: 1 })
      .run();

    db.delete(trips).run();

    const remainingStops = db.select().from(tripStops).all();
    expect(remainingStops).toHaveLength(0);
  });

  it("cascades trip stop deletion when user is deleted (full cascade)", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();
    db.insert(destinations)
      .values({
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        priceLevel: 2,
        image: "bali.jpg",
      })
      .run();
    db.insert(trips).values({ userId: 1, title: "My Trip" }).run();
    db.insert(tripStops)
      .values({ tripId: 1, destinationId: 1, sortOrder: 1 })
      .run();

    db.delete(users).run();

    const remainingTrips = db.select().from(trips).all();
    const remainingStops = db.select().from(tripStops).all();
    expect(remainingTrips).toHaveLength(0);
    expect(remainingStops).toHaveLength(0);
  });

  it("restricts destination deletion when referenced by a trip stop", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();
    db.insert(destinations)
      .values({
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        priceLevel: 2,
        image: "bali.jpg",
      })
      .run();
    db.insert(trips).values({ userId: 1, title: "My Trip" }).run();
    db.insert(tripStops)
      .values({ tripId: 1, destinationId: 1, sortOrder: 1 })
      .run();

    expect(() => db.delete(destinations).run()).toThrow();
  });

  it("allows destination deletion when not referenced by any trip stop", () => {
    db.insert(destinations)
      .values({
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        priceLevel: 2,
        image: "bali.jpg",
      })
      .run();

    db.delete(destinations).run();

    const remaining = db.select().from(destinations).all();
    expect(remaining).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Unique constraints
// ---------------------------------------------------------------------------

describe("unique constraints", () => {
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

  it("rejects duplicate user email", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();

    expect(() =>
      db
        .insert(users)
        .values({ email: "a@b.com", passwordHash: "hash2", name: "Bob" })
        .run(),
    ).toThrow();
  });

  it("allows different user emails", () => {
    db.insert(users)
      .values({ email: "a@b.com", passwordHash: "hash", name: "Alice" })
      .run();
    db.insert(users)
      .values({ email: "b@c.com", passwordHash: "hash2", name: "Bob" })
      .run();

    const allUsers = db.select().from(users).all();
    expect(allUsers).toHaveLength(2);
  });
});
