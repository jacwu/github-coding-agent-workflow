import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";

vi.mock("server-only", () => ({}));

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

import * as schema from "./schema";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  // Apply schema by running the SQL statements directly
  sqlite.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

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
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (price_level >= 1 AND price_level <= 5),
      CHECK (rating >= 0 AND rating <= 5)
    );

    CREATE TABLE trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (status IN ('draft', 'planned', 'completed'))
    );
    CREATE INDEX trips_user_id_idx ON trips(user_id);

    CREATE TABLE trip_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
      sort_order INTEGER NOT NULL,
      arrival_date TEXT,
      departure_date TEXT,
      notes TEXT
    );
    CREATE INDEX trip_stops_trip_id_idx ON trip_stops(trip_id);
    CREATE UNIQUE INDEX trip_stops_trip_id_sort_order_idx ON trip_stops(trip_id, sort_order);
  `);
  return { db, sqlite };
}

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

describe("table creation and basic inserts", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("inserts and reads a user", () => {
    db.insert(users).values({
      email: "test@example.com",
      passwordHash: "hashed_password",
      name: "Test User",
    }).run();

    const result = db.select().from(users).all();
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe("test@example.com");
    expect(result[0].name).toBe("Test User");
    expect(result[0].createdAt).toBeDefined();
  });

  it("inserts and reads a destination", () => {
    db.insert(destinations).values({
      name: "Bali",
      country: "Indonesia",
      category: "beach",
      priceLevel: 2,
      rating: 4.7,
      image: "bali.jpg",
    }).run();

    const result = db.select().from(destinations).all();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bali");
    expect(result[0].priceLevel).toBe(2);
    expect(result[0].rating).toBe(4.7);
  });

  it("inserts and reads a trip", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    db.insert(trips).values({
      userId: 1,
      title: "My Trip",
    }).run();

    const result = db.select().from(trips).all();
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("My Trip");
    expect(result[0].status).toBe("draft");
    expect(result[0].createdAt).toBeDefined();
    expect(result[0].updatedAt).toBeDefined();
  });

  it("inserts and reads a trip stop", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    db.insert(destinations).values({
      name: "Bali",
      country: "Indonesia",
      category: "beach",
      priceLevel: 2,
      image: "bali.jpg",
    }).run();

    db.insert(trips).values({
      userId: 1,
      title: "My Trip",
    }).run();

    db.insert(tripStops).values({
      tripId: 1,
      destinationId: 1,
      sortOrder: 1,
    }).run();

    const result = db.select().from(tripStops).all();
    expect(result).toHaveLength(1);
    expect(result[0].tripId).toBe(1);
    expect(result[0].sortOrder).toBe(1);
  });
});

describe("email uniqueness", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("rejects duplicate email addresses", () => {
    db.insert(users).values({
      email: "dup@example.com",
      passwordHash: "hash1",
      name: "User 1",
    }).run();

    expect(() => {
      db.insert(users).values({
        email: "dup@example.com",
        passwordHash: "hash2",
        name: "User 2",
      }).run();
    }).toThrow();
  });
});

describe("foreign key enforcement", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("rejects a trip referencing a non-existent user", () => {
    expect(() => {
      db.insert(trips).values({
        userId: 999,
        title: "Orphan Trip",
      }).run();
    }).toThrow();
  });
});

describe("cascade delete — user → trips → stops", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("deletes trips and stops when a user is deleted", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    db.insert(destinations).values({
      name: "Bali",
      country: "Indonesia",
      category: "beach",
      priceLevel: 2,
      image: "bali.jpg",
    }).run();

    db.insert(trips).values({
      userId: 1,
      title: "Trip",
    }).run();

    db.insert(tripStops).values({
      tripId: 1,
      destinationId: 1,
      sortOrder: 1,
    }).run();

    // Verify data exists
    expect(db.select().from(trips).all()).toHaveLength(1);
    expect(db.select().from(tripStops).all()).toHaveLength(1);

    // Delete the user
    db.delete(users).where(sql`${users.id} = 1`).run();

    // Verify cascade
    expect(db.select().from(users).all()).toHaveLength(0);
    expect(db.select().from(trips).all()).toHaveLength(0);
    expect(db.select().from(tripStops).all()).toHaveLength(0);
  });
});

describe("cascade delete — trip → stops", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("deletes stops when a trip is deleted", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    db.insert(destinations).values({
      name: "Bali",
      country: "Indonesia",
      category: "beach",
      priceLevel: 2,
      image: "bali.jpg",
    }).run();

    db.insert(trips).values({
      userId: 1,
      title: "Trip",
    }).run();

    db.insert(tripStops).values({
      tripId: 1,
      destinationId: 1,
      sortOrder: 1,
    }).run();

    expect(db.select().from(tripStops).all()).toHaveLength(1);

    db.delete(trips).where(sql`${trips.id} = 1`).run();

    expect(db.select().from(trips).all()).toHaveLength(0);
    expect(db.select().from(tripStops).all()).toHaveLength(0);
    // User and destination should remain
    expect(db.select().from(users).all()).toHaveLength(1);
    expect(db.select().from(destinations).all()).toHaveLength(1);
  });
});

describe("restrict delete — destination in use", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("blocks deletion of a destination referenced by trip stops", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    db.insert(destinations).values({
      name: "Bali",
      country: "Indonesia",
      category: "beach",
      priceLevel: 2,
      image: "bali.jpg",
    }).run();

    db.insert(trips).values({
      userId: 1,
      title: "Trip",
    }).run();

    db.insert(tripStops).values({
      tripId: 1,
      destinationId: 1,
      sortOrder: 1,
    }).run();

    expect(() => {
      db.delete(destinations).where(sql`${destinations.id} = 1`).run();
    }).toThrow();

    // Destination should still exist
    expect(db.select().from(destinations).all()).toHaveLength(1);
  });
});

describe("unique sort order", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("rejects duplicate (trip_id, sort_order) combinations", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    db.insert(destinations).values({
      name: "Bali",
      country: "Indonesia",
      category: "beach",
      priceLevel: 2,
      image: "bali.jpg",
    }).run();

    db.insert(destinations).values({
      name: "Paris",
      country: "France",
      category: "city",
      priceLevel: 4,
      image: "paris.jpg",
    }).run();

    db.insert(trips).values({
      userId: 1,
      title: "Trip",
    }).run();

    db.insert(tripStops).values({
      tripId: 1,
      destinationId: 1,
      sortOrder: 1,
    }).run();

    expect(() => {
      db.insert(tripStops).values({
        tripId: 1,
        destinationId: 2,
        sortOrder: 1, // same sort_order for same trip
      }).run();
    }).toThrow();
  });
});

describe("check constraints", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("rejects price_level below 1", () => {
    expect(() => {
      db.insert(destinations).values({
        name: "Cheap",
        country: "Test",
        category: "beach",
        priceLevel: 0,
        image: "cheap.jpg",
      }).run();
    }).toThrow();
  });

  it("rejects price_level above 5", () => {
    expect(() => {
      db.insert(destinations).values({
        name: "Expensive",
        country: "Test",
        category: "beach",
        priceLevel: 6,
        image: "expensive.jpg",
      }).run();
    }).toThrow();
  });

  it("rejects rating below 0", () => {
    expect(() => {
      db.insert(destinations).values({
        name: "Bad",
        country: "Test",
        category: "beach",
        priceLevel: 1,
        rating: -1,
        image: "bad.jpg",
      }).run();
    }).toThrow();
  });

  it("rejects rating above 5", () => {
    expect(() => {
      db.insert(destinations).values({
        name: "Too Good",
        country: "Test",
        category: "beach",
        priceLevel: 1,
        rating: 6,
        image: "toogood.jpg",
      }).run();
    }).toThrow();
  });

  it("rejects invalid trip status", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    expect(() => {
      db.insert(trips).values({
        userId: 1,
        title: "Trip",
        status: "invalid_status",
      }).run();
    }).toThrow();
  });

  it("accepts valid trip status values", () => {
    db.insert(users).values({
      email: "user@test.com",
      passwordHash: "hash",
      name: "User",
    }).run();

    for (const status of ["draft", "planned", "completed"]) {
      db.insert(trips).values({
        userId: 1,
        title: `Trip ${status}`,
        status,
      }).run();
    }

    const result = db.select().from(trips).all();
    expect(result).toHaveLength(3);
  });
});
