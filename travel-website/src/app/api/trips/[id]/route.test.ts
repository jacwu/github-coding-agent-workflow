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

function seedDestination(db: ReturnType<typeof drizzle>): void {
  db.insert(destinations)
    .values({
      name: "Kyoto",
      country: "Japan",
      category: "city",
      priceLevel: 3,
      rating: 4.8,
      image: "kyoto.jpg",
    })
    .run();
}

function seedTripWithStops(db: ReturnType<typeof drizzle>): void {
  seedDestination(db);
  db.insert(trips)
    .values({
      userId: 1,
      title: "Japan Trip",
      startDate: "2026-07-01",
      endDate: "2026-07-15",
      status: "draft",
      createdAt: "2026-03-20 10:00:00",
      updatedAt: "2026-03-20 10:00:00",
    })
    .run();
  db.insert(tripStops)
    .values({
      tripId: 1,
      destinationId: 1,
      sortOrder: 1,
      arrivalDate: "2026-07-01",
      departureDate: "2026-07-04",
      notes: "Temple district first",
    })
    .run();
}

describe("GET /api/trips/:id", () => {
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
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/trips/1"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for non-numeric id", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/trips/abc"),
      { params: Promise.resolve({ id: "abc" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for id=0", async () => {
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/trips/0"),
      { params: Promise.resolve({ id: "0" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for another user's trip", async () => {
    seedUser(testDb, 1);
    seedUser(testDb, 2);
    testDb.insert(trips).values({ userId: 2, title: "Other Trip", status: "draft" }).run();

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/trips/1"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Trip not found");
  });

  it("returns trip detail with ordered stops and destination data", async () => {
    seedUser(testDb);
    seedTripWithStops(testDb);

    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/trips/1"),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.title).toBe("Japan Trip");
    expect(body.start_date).toBe("2026-07-01");
    expect(body.end_date).toBe("2026-07-15");
    expect(body.status).toBe("draft");
    expect(body.stops).toHaveLength(1);

    const stop = body.stops[0];
    expect(stop.destination_id).toBe(1);
    expect(stop.destination_name).toBe("Kyoto");
    expect(stop.destination_country).toBe("Japan");
    expect(stop.destination_image).toBe("/images/destinations/kyoto.jpg");
    expect(stop.sort_order).toBe(1);
    expect(stop.arrival_date).toBe("2026-07-01");
    expect(stop.departure_date).toBe("2026-07-04");
    expect(stop.notes).toBe("Temple district first");
  });

  it("returns 404 for non-existent trip", async () => {
    seedUser(testDb);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/trips/9999"),
      { params: Promise.resolve({ id: "9999" }) },
    );

    expect(response.status).toBe(404);
  });
});

describe("PUT /api/trips/:id", () => {
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
      new Request("http://localhost/api/trips/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid trip id", async () => {
    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/abc", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 404 for non-owned trip", async () => {
    seedUser(testDb, 1);
    seedUser(testDb, 2);
    testDb.insert(trips).values({ userId: 2, title: "Other Trip", status: "draft" }).run();

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated", status: "draft" }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 for invalid status", async () => {
    seedUser(testDb);
    testDb.insert(trips).values({ userId: 1, title: "Trip", status: "draft" }).run();

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Trip", status: "cancelled" }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 when status is missing for full PUT updates", async () => {
    seedUser(testDb);
    testDb.insert(trips).values({ userId: 1, title: "Trip", status: "draft" }).run();

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated Title" }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("status");
  });

  it("updates trip metadata and returns updated detail", async () => {
    seedUser(testDb);
    testDb.insert(trips).values({
      userId: 1,
      title: "Old Title",
      startDate: "2026-01-01",
      endDate: "2026-01-10",
      status: "draft",
    }).run();

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Title",
          start_date: "2026-07-01",
          end_date: "2026-07-15",
          status: "planned",
        }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.title).toBe("New Title");
    expect(body.start_date).toBe("2026-07-01");
    expect(body.end_date).toBe("2026-07-15");
    expect(body.status).toBe("planned");
    expect(body.stops).toEqual([]);
  });

  it("returns 400 when start_date > end_date", async () => {
    seedUser(testDb);
    testDb.insert(trips).values({ userId: 1, title: "Trip", status: "draft" }).run();

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("http://localhost/api/trips/1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Trip",
          start_date: "2026-08-01",
          end_date: "2026-07-01",
          status: "draft",
        }),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
  });
});

describe("DELETE /api/trips/:id", () => {
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
      new Request("http://localhost/api/trips/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(401);
  });

  it("returns 404 for non-owned trip", async () => {
    seedUser(testDb, 1);
    seedUser(testDb, 2);
    testDb.insert(trips).values({ userId: 2, title: "Other Trip", status: "draft" }).run();

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(404);
  });

  it("deletes a trip and returns 204", async () => {
    seedUser(testDb);
    testDb.insert(trips).values({ userId: 1, title: "Trip", status: "draft" }).run();

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(204);

    // Verify trip is gone
    const remaining = testDb.select().from(trips).all();
    expect(remaining).toHaveLength(0);
  });

  it("cascade deletes stops when trip is deleted", async () => {
    seedUser(testDb);
    seedTripWithStops(testDb);

    const { DELETE } = await import("./route");
    const response = await DELETE(
      new Request("http://localhost/api/trips/1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(204);
    const remainingStops = testDb.select().from(tripStops).all();
    expect(remainingStops).toHaveLength(0);
  });
});
