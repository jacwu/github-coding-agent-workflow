import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";
import { trips, destinations, tripStops } from "@/db/schema";

vi.mock("server-only", () => ({}));

let testDb: ReturnType<typeof drizzle>;
let testSqlite: InstanceType<typeof Database>;
let currentDb: ReturnType<typeof drizzle>;

vi.mock("@/db", () => ({
  get db() {
    return currentDb;
  },
}));

let mockSession: { user: { id: string } } | null = null;

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(mockSession),
}));

const CREATE_TABLES_SQL = `
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
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE trip_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    destination_id INTEGER NOT NULL REFERENCES destinations(id),
    sort_order INTEGER NOT NULL,
    arrival_date TEXT,
    departure_date TEXT,
    notes TEXT
  );
  CREATE UNIQUE INDEX trip_stops_trip_id_sort_order_idx ON trip_stops(trip_id, sort_order);
`;

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  sqlite.exec(CREATE_TABLES_SQL);
  return { db, sqlite };
}

function seedUser(db: ReturnType<typeof drizzle>, id?: number): void {
  db.insert(schema.users)
    .values({
      id: id ?? 1,
      email: `user${id ?? 1}@test.com`,
      passwordHash: "hashed",
      name: `User ${id ?? 1}`,
    })
    .run();
}

function seedDestination(db: ReturnType<typeof drizzle>, id?: number, name?: string): void {
  db.insert(destinations)
    .values({
      id: id ?? 1,
      name: name ?? "Kyoto",
      country: "Japan",
      category: "city",
      priceLevel: 3,
      rating: 4.8,
      image: "kyoto.jpg",
    })
    .run();
}

function seedTrip(db: ReturnType<typeof drizzle>, overrides: Partial<schema.NewTrip> = {}): void {
  db.insert(trips)
    .values({
      userId: 1,
      title: "Test Trip",
      status: "draft",
      ...overrides,
    })
    .run();
}

function seedStop(db: ReturnType<typeof drizzle>, overrides: Partial<schema.NewTripStop> = {}): void {
  db.insert(tripStops)
    .values({
      tripId: 1,
      destinationId: 1,
      sortOrder: 1,
      ...overrides,
    })
    .run();
}

describe("DELETE /api/trips/:id/stops/:stopId", () => {
  beforeEach(() => {
    ({ db: testDb, sqlite: testSqlite } = createTestDb());
    currentDb = testDb;
    mockSession = { user: { id: "1" } };
  });

  afterEach(() => {
    testSqlite.close();
  });

  it("returns 401 when not authenticated", async () => {
    mockSession = null;
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1/stops/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1", stopId: "1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid trip id", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/abc/stops/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "abc", stopId: "1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid stop id", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1/stops/abc", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1", stopId: "abc" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for non-owned trip", async () => {
    seedUser(testDb, 1);
    seedUser(testDb, 2);
    seedDestination(testDb);
    seedTrip(testDb, { userId: 2 });
    seedStop(testDb, { tripId: 1 });

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1/stops/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1", stopId: "1" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Trip not found");
  });

  it("returns 404 for stop not belonging to the trip", async () => {
    seedUser(testDb);
    seedDestination(testDb);
    seedTrip(testDb);

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1/stops/999", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1", stopId: "999" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Stop not found");
  });

  it("deletes a stop and returns 204", async () => {
    seedUser(testDb);
    seedDestination(testDb);
    seedTrip(testDb);
    seedStop(testDb, { sortOrder: 1 });

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1/stops/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1", stopId: "1" }) },
    );

    expect(response.status).toBe(204);

    const remainingStops = testDb.select().from(tripStops).all();
    expect(remainingStops).toHaveLength(0);
  });

  it("compacts sort order after deletion", async () => {
    seedUser(testDb);
    seedDestination(testDb, 1, "Kyoto");
    seedDestination(testDb, 2, "Tokyo");
    seedDestination(testDb, 3, "Osaka");
    seedTrip(testDb);
    seedStop(testDb, { sortOrder: 1, destinationId: 1 }); // id 1
    seedStop(testDb, { sortOrder: 2, destinationId: 2 }); // id 2
    seedStop(testDb, { sortOrder: 3, destinationId: 3 }); // id 3

    const { DELETE } = await import("./route");
    // Delete the middle stop (id=2, sort_order=2)
    const response = await DELETE(
      new Request("http://localhost/api/trips/1/stops/2", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1", stopId: "2" }) },
    );

    expect(response.status).toBe(204);

    const remaining = testDb
      .select()
      .from(tripStops)
      .orderBy(tripStops.sortOrder)
      .all();

    expect(remaining).toHaveLength(2);
    expect(remaining[0].id).toBe(1);
    expect(remaining[0].sortOrder).toBe(1);
    expect(remaining[1].id).toBe(3);
    expect(remaining[1].sortOrder).toBe(2);
  });

  it("compacts sort order when first stop is deleted", async () => {
    seedUser(testDb);
    seedDestination(testDb, 1, "Kyoto");
    seedDestination(testDb, 2, "Tokyo");
    seedTrip(testDb);
    seedStop(testDb, { sortOrder: 1, destinationId: 1 }); // id 1
    seedStop(testDb, { sortOrder: 2, destinationId: 2 }); // id 2

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1/stops/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1", stopId: "1" }) },
    );

    expect(response.status).toBe(204);

    const remaining = testDb
      .select()
      .from(tripStops)
      .orderBy(tripStops.sortOrder)
      .all();

    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe(2);
    expect(remaining[0].sortOrder).toBe(1);
  });
});
