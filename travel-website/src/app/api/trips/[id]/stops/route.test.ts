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

describe("POST /api/trips/:id/stops", () => {
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
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_id: 1 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid trip id", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/abc/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_id: 1 }),
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when destination_id is missing", async () => {
    seedUser(testDb);
    seedTrip(testDb);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("destination_id");
  });

  it("returns 404 for non-owned trip", async () => {
    seedUser(testDb, 1);
    seedUser(testDb, 2);
    seedDestination(testDb);
    seedTrip(testDb, { userId: 2 });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_id: 1 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Trip not found");
  });

  it("returns 404 for non-existent destination", async () => {
    seedUser(testDb);
    seedTrip(testDb);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_id: 9999 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Destination not found");
  });

  it("adds a stop with sort_order 1 to an empty trip", async () => {
    seedUser(testDb);
    seedDestination(testDb);
    seedTrip(testDb);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: 1,
          arrival_date: "2026-07-01",
          departure_date: "2026-07-04",
          notes: "Temple district first",
        }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.stops).toHaveLength(1);
    expect(body.stops[0].sort_order).toBe(1);
    expect(body.stops[0].destination_name).toBe("Kyoto");
    expect(body.stops[0].destination_image).toBe("/images/destinations/kyoto.jpg");
    expect(body.stops[0].notes).toBe("Temple district first");
  });

  it("appends the next sort_order when stops already exist", async () => {
    seedUser(testDb);
    seedDestination(testDb, 1, "Kyoto");
    seedDestination(testDb, 2, "Tokyo");
    seedTrip(testDb);
    seedStop(testDb, { sortOrder: 1, destinationId: 1 });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_id: 2 }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.stops).toHaveLength(2);
    expect(body.stops[0].sort_order).toBe(1);
    expect(body.stops[1].sort_order).toBe(2);
  });

  it("returns 400 when arrival_date > departure_date", async () => {
    seedUser(testDb);
    seedDestination(testDb);
    seedTrip(testDb);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination_id: 1,
          arrival_date: "2026-07-10",
          departure_date: "2026-07-05",
        }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("trims notes and stores null when empty", async () => {
    seedUser(testDb);
    seedDestination(testDb);
    seedTrip(testDb);

    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips/1/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination_id: 1, notes: "   " }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.stops[0].notes).toBeNull();
  });
});

describe("PUT /api/trips/:id/stops (reorder)", () => {
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
    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: [{ id: 1, sort_order: 1 }] }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when stops array is empty", async () => {
    seedUser(testDb);
    seedTrip(testDb);

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: [] }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for duplicate stop ids", async () => {
    seedUser(testDb);
    seedTrip(testDb);

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: [{ id: 1, sort_order: 1 }, { id: 1, sort_order: 2 }] }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("unique");
  });

  it("returns 400 for duplicate sort_order values", async () => {
    seedUser(testDb);
    seedTrip(testDb);

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 1 }] }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("unique");
  });

  it("returns 400 for non-contiguous sort orders", async () => {
    seedUser(testDb);
    seedTrip(testDb);

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: [{ id: 1, sort_order: 1 }, { id: 2, sort_order: 3 }] }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("contiguous");
  });

  it("returns 400 when stops array does not include all trip stops", async () => {
    seedUser(testDb);
    seedDestination(testDb, 1, "Kyoto");
    seedDestination(testDb, 2, "Tokyo");
    seedTrip(testDb);
    seedStop(testDb, { sortOrder: 1, destinationId: 1 });
    seedStop(testDb, { sortOrder: 2, destinationId: 2 });

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: [{ id: 1, sort_order: 1 }] }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("all stops");
  });

  it("returns 400 when referenced stop ids do not belong to the trip", async () => {
    seedUser(testDb);
    seedDestination(testDb, 1, "Kyoto");
    seedTrip(testDb);
    seedStop(testDb, { sortOrder: 1, destinationId: 1 });

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stops: [{ id: 999, sort_order: 1 }] }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("successfully reorders stops", async () => {
    seedUser(testDb);
    seedDestination(testDb, 1, "Kyoto");
    seedDestination(testDb, 2, "Tokyo");
    seedDestination(testDb, 3, "Osaka");
    seedTrip(testDb);
    seedStop(testDb, { sortOrder: 1, destinationId: 1 }); // id 1
    seedStop(testDb, { sortOrder: 2, destinationId: 2 }); // id 2
    seedStop(testDb, { sortOrder: 3, destinationId: 3 }); // id 3

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1/stops", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stops: [
            { id: 3, sort_order: 1 },
            { id: 1, sort_order: 2 },
            { id: 2, sort_order: 3 },
          ],
        }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.stops).toHaveLength(3);
    expect(body.stops[0].destination_name).toBe("Osaka");
    expect(body.stops[0].sort_order).toBe(1);
    expect(body.stops[1].destination_name).toBe("Kyoto");
    expect(body.stops[1].sort_order).toBe(2);
    expect(body.stops[2].destination_name).toBe("Tokyo");
    expect(body.stops[2].sort_order).toBe(3);
  });
});
