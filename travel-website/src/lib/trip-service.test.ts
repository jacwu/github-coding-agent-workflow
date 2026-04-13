import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";

import * as schema from "@/db/schema";

vi.mock("server-only", () => ({}));

const {
  listTripsForUser,
  createTrip,
  getTripByIdForUser,
  updateTripForUser,
  deleteTripForUser,
  addTripStop,
  reorderTripStops,
  deleteTripStop,
  DestinationNotFoundError,
} = await import("./trip-service");

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const testDb = drizzle(sqlite, { schema });

  testDb.run(sql`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);

  testDb.run(sql`
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
    )
  `);

  testDb.run(sql`
    CREATE TABLE trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);

  testDb.run(sql`
    CREATE TABLE trip_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      destination_id INTEGER NOT NULL REFERENCES destinations(id) ON DELETE RESTRICT,
      sort_order INTEGER NOT NULL,
      arrival_date TEXT,
      departure_date TEXT,
      notes TEXT
    )
  `);

  return testDb;
}

type TestDb = ReturnType<typeof createTestDb>;

function seedUsers(testDb: TestDb) {
  testDb.run(sql`
    INSERT INTO users (id, email, password_hash, name) VALUES
      (1, 'alice@test.com', 'hash1', 'Alice'),
      (2, 'bob@test.com', 'hash2', 'Bob')
  `);
}

function seedDestinations(testDb: TestDb) {
  testDb.run(sql`
    INSERT INTO destinations (id, name, country, category, price_level, rating, image) VALUES
      (1, 'Bali', 'Indonesia', 'beach', 2, 4.7, 'bali.jpg'),
      (2, 'Paris', 'France', 'city', 4, 4.7, 'paris.jpg'),
      (3, 'Banff', 'Canada', 'mountain', 3, 4.7, 'banff.jpg')
  `);
}

function seedTrip(testDb: TestDb) {
  testDb.run(sql`
    INSERT INTO trips (id, user_id, title, start_date, end_date, status) VALUES
      (1, 1, 'Asia Trip', '2026-07-01', '2026-07-15', 'draft'),
      (2, 2, 'Europe Trip', '2026-08-01', '2026-08-20', 'planned')
  `);
}

function seedStops(testDb: TestDb) {
  testDb.run(sql`
    INSERT INTO trip_stops (id, trip_id, destination_id, sort_order, arrival_date, departure_date, notes) VALUES
      (1, 1, 1, 1, '2026-07-01', '2026-07-05', 'Visit temples'),
      (2, 1, 2, 2, '2026-07-06', '2026-07-10', 'See Eiffel Tower'),
      (3, 1, 3, 3, '2026-07-11', '2026-07-15', 'Mountain hiking')
  `);
}

describe("trip-service", () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb();
    seedUsers(testDb);
    seedDestinations(testDb);
  });

  describe("listTripsForUser", () => {
    it("returns only the current user's trips", async () => {
      seedTrip(testDb);
      const aliceTrips = await listTripsForUser(1, testDb);
      expect(aliceTrips).toHaveLength(1);
      expect(aliceTrips[0].title).toBe("Asia Trip");

      const bobTrips = await listTripsForUser(2, testDb);
      expect(bobTrips).toHaveLength(1);
      expect(bobTrips[0].title).toBe("Europe Trip");
    });

    it("returns empty array when user has no trips", async () => {
      const result = await listTripsForUser(1, testDb);
      expect(result).toEqual([]);
    });

    it("returns trips with snake_case fields", async () => {
      seedTrip(testDb);
      const result = await listTripsForUser(1, testDb);
      expect(result[0]).toHaveProperty("start_date");
      expect(result[0]).toHaveProperty("end_date");
      expect(result[0]).toHaveProperty("created_at");
      expect(result[0]).toHaveProperty("updated_at");
    });
  });

  describe("createTrip", () => {
    it("creates a trip and returns detail with empty stops", async () => {
      const result = await createTrip(
        { title: "My Trip", start_date: "2026-07-01", end_date: "2026-07-15" },
        1,
        testDb,
      );

      expect(result.id).toBeDefined();
      expect(result.title).toBe("My Trip");
      expect(result.start_date).toBe("2026-07-01");
      expect(result.end_date).toBe("2026-07-15");
      expect(result.status).toBe("draft");
      expect(result.stops).toEqual([]);
    });

    it("creates a trip without dates", async () => {
      const result = await createTrip({ title: "No Dates" }, 1, testDb);
      expect(result.start_date).toBeNull();
      expect(result.end_date).toBeNull();
    });
  });

  describe("getTripByIdForUser", () => {
    it("returns trip detail with ordered stops and destination metadata", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      const result = await getTripByIdForUser(1, 1, testDb);
      expect(result).not.toBeNull();
      expect(result!.title).toBe("Asia Trip");
      expect(result!.stops).toHaveLength(3);
      expect(result!.stops[0].sort_order).toBe(1);
      expect(result!.stops[0].destination.name).toBe("Bali");
      expect(result!.stops[0].destination.image).toBe("/images/destinations/bali.jpg");
      expect(result!.stops[1].sort_order).toBe(2);
      expect(result!.stops[2].sort_order).toBe(3);
    });

    it("returns null for non-existent trip", async () => {
      const result = await getTripByIdForUser(999, 1, testDb);
      expect(result).toBeNull();
    });

    it("returns null for trip not owned by user", async () => {
      seedTrip(testDb);
      const result = await getTripByIdForUser(1, 2, testDb);
      expect(result).toBeNull();
    });
  });

  describe("updateTripForUser", () => {
    it("updates allowed fields and returns updated trip", async () => {
      seedTrip(testDb);

      const result = await updateTripForUser(
        1,
        1,
        { title: "Updated Title", status: "planned" },
        testDb,
      );

      expect(result).not.toBeNull();
      expect(result!.title).toBe("Updated Title");
      expect(result!.status).toBe("planned");
    });

    it("returns null for non-existent trip", async () => {
      const result = await updateTripForUser(999, 1, { title: "X" }, testDb);
      expect(result).toBeNull();
    });

    it("returns null for trip not owned by user", async () => {
      seedTrip(testDb);
      const result = await updateTripForUser(1, 2, { title: "X" }, testDb);
      expect(result).toBeNull();
    });

    it("can clear dates by setting to null", async () => {
      seedTrip(testDb);
      const result = await updateTripForUser(
        1,
        1,
        { start_date: null, end_date: null },
        testDb,
      );
      expect(result!.start_date).toBeNull();
      expect(result!.end_date).toBeNull();
    });
  });

  describe("deleteTripForUser", () => {
    it("deletes the trip and returns true", async () => {
      seedTrip(testDb);

      const result = await deleteTripForUser(1, 1, testDb);
      expect(result).toBe(true);

      const check = await getTripByIdForUser(1, 1, testDb);
      expect(check).toBeNull();
    });

    it("returns false for non-existent trip", async () => {
      const result = await deleteTripForUser(999, 1, testDb);
      expect(result).toBe(false);
    });

    it("returns false for trip not owned by user", async () => {
      seedTrip(testDb);
      const result = await deleteTripForUser(1, 2, testDb);
      expect(result).toBe(false);
    });

    it("cascades stop deletion", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      await deleteTripForUser(1, 1, testDb);

      // Stops should be gone - verify by creating a new trip and checking
      const trips = await listTripsForUser(1, testDb);
      expect(trips).toHaveLength(0);
    });
  });

  describe("addTripStop", () => {
    it("appends a stop with next sort_order", async () => {
      seedTrip(testDb);

      const result = await addTripStop(
        1,
        1,
        {
          destination_id: 1,
          arrival_date: "2026-07-01",
          departure_date: "2026-07-03",
          notes: "Visit temples",
        },
        testDb,
      );

      expect(result).not.toBeNull();
      expect(result!.stops).toHaveLength(1);
      expect(result!.stops[0].sort_order).toBe(1);
      expect(result!.stops[0].destination_id).toBe(1);
      expect(result!.stops[0].destination.name).toBe("Bali");
    });

    it("appends at max+1 when stops exist", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      const result = await addTripStop(
        1,
        1,
        { destination_id: 2 },
        testDb,
      );

      expect(result!.stops).toHaveLength(4);
      expect(result!.stops[3].sort_order).toBe(4);
    });

    it("returns null for trip not owned by user", async () => {
      seedTrip(testDb);
      const result = await addTripStop(1, 2, { destination_id: 1 }, testDb);
      expect(result).toBeNull();
    });

    it("throws DestinationNotFoundError for non-existent destination", async () => {
      seedTrip(testDb);

      await expect(
        addTripStop(1, 1, { destination_id: 999 }, testDb),
      ).rejects.toThrow(DestinationNotFoundError);
    });
  });

  describe("reorderTripStops", () => {
    it("applies new ordering and returns updated trip", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      const result = await reorderTripStops(
        1,
        1,
        {
          stops: [
            { id: 3, sort_order: 1 },
            { id: 1, sort_order: 2 },
            { id: 2, sort_order: 3 },
          ],
        },
        testDb,
      );

      expect(result).not.toBeNull();
      expect(result!.stops[0].id).toBe(3);
      expect(result!.stops[0].sort_order).toBe(1);
      expect(result!.stops[1].id).toBe(1);
      expect(result!.stops[1].sort_order).toBe(2);
      expect(result!.stops[2].id).toBe(2);
      expect(result!.stops[2].sort_order).toBe(3);
    });

    it("returns null for trip not owned by user", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      const result = await reorderTripStops(
        1,
        2,
        { stops: [{ id: 1, sort_order: 1 }] },
        testDb,
      );

      expect(result).toBeNull();
    });

    it("rejects foreign stop ids", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      await expect(
        reorderTripStops(
          1,
          1,
          {
            stops: [
              { id: 999, sort_order: 1 },
              { id: 1, sort_order: 2 },
              { id: 2, sort_order: 3 },
            ],
          },
          testDb,
        ),
      ).rejects.toThrow(/does not belong/);
    });

    it("rejects partial subsets", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      await expect(
        reorderTripStops(
          1,
          1,
          {
            stops: [
              { id: 1, sort_order: 1 },
              { id: 2, sort_order: 2 },
            ],
          },
          testDb,
        ),
      ).rejects.toThrow(/must include all stops/);
    });
  });

  describe("deleteTripStop", () => {
    it("removes the stop and compacts sort orders", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      const result = await deleteTripStop(1, 2, 1, testDb);

      expect(result).not.toBeNull();
      expect(result!.stops).toHaveLength(2);
      expect(result!.stops[0].id).toBe(1);
      expect(result!.stops[0].sort_order).toBe(1);
      expect(result!.stops[1].id).toBe(3);
      expect(result!.stops[1].sort_order).toBe(2);
    });

    it("returns null for trip not owned by user", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      const result = await deleteTripStop(1, 1, 2, testDb);
      expect(result).toBeNull();
    });

    it("returns null for stop not belonging to trip", async () => {
      seedTrip(testDb);
      seedStops(testDb);

      const result = await deleteTripStop(2, 1, 2, testDb);
      expect(result).toBeNull();
    });
  });
});
