import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "@/db/schema";
import { trips } from "@/db/schema";

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

function seedTrip(
  db: ReturnType<typeof drizzle>,
  overrides: Partial<schema.NewTrip> = {},
): void {
  db.insert(trips)
    .values({
      userId: 1,
      title: "Test Trip",
      status: "draft",
      ...overrides,
    })
    .run();
}

describe("GET /api/trips", () => {
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
    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Authentication required");
  });

  it("returns empty data array when user has no trips", async () => {
    seedUser(testDb);
    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toEqual([]);
  });

  it("returns only the current user's trips", async () => {
    seedUser(testDb, 1);
    seedUser(testDb, 2);
    seedTrip(testDb, { userId: 1, title: "User 1 Trip" });
    seedTrip(testDb, { userId: 2, title: "User 2 Trip" });

    const { GET } = await import("./route");
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe("User 1 Trip");
  });

  it("includes stop_count in trip list items", async () => {
    seedUser(testDb);
    seedTrip(testDb);
    testDb.insert(schema.destinations).values({
      name: "Bali", country: "Indonesia", category: "beach", priceLevel: 2, rating: 4.7, image: "bali.jpg",
    }).run();
    testDb.insert(schema.tripStops).values({ tripId: 1, destinationId: 1, sortOrder: 1 }).run();
    testDb.insert(schema.tripStops).values({ tripId: 1, destinationId: 1, sortOrder: 2 }).run();

    const { GET } = await import("./route");
    const response = await GET();

    const body = await response.json();
    expect(body.data[0].stop_count).toBe(2);
  });

  it("serializes trip list items with correct field names", async () => {
    seedUser(testDb);
    seedTrip(testDb, {
      title: "Asia Trip",
      startDate: "2026-07-01",
      endDate: "2026-07-15",
      status: "planned",
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();
    const trip = body.data[0];

    expect(trip.title).toBe("Asia Trip");
    expect(trip.start_date).toBe("2026-07-01");
    expect(trip.end_date).toBe("2026-07-15");
    expect(trip.status).toBe("planned");
    expect(trip.created_at).toBeDefined();
    expect(trip.updated_at).toBeDefined();
    expect(trip.stop_count).toBe(0);
    // Should not expose internal field names
    expect(trip.startDate).toBeUndefined();
    expect(trip.endDate).toBeUndefined();
    expect(trip.createdAt).toBeUndefined();
    expect(trip.updatedAt).toBeUndefined();
    expect(trip.userId).toBeUndefined();
    expect(trip.user_id).toBeUndefined();
  });

  it("orders trips by updated_at DESC", async () => {
    seedUser(testDb);
    seedTrip(testDb, { title: "Old Trip", updatedAt: "2026-01-01 00:00:00" });
    seedTrip(testDb, { title: "New Trip", updatedAt: "2026-06-01 00:00:00" });

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.data[0].title).toBe("New Trip");
    expect(body.data[1].title).toBe("Old Trip");
  });
});

describe("POST /api/trips", () => {
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
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test" }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("title");
  });

  it("returns 400 when title is empty after trimming", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "   " }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid date format", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Trip", start_date: "not-a-date" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("start_date");
  });

  it("returns 400 when start_date > end_date", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Trip", start_date: "2026-08-01", end_date: "2026-07-01" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("start_date");
  });

  it("returns 400 for invalid status", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Trip", status: "invalid" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("status");
  });

  it("creates a trip with 201 and returns detail with empty stops", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Southeast Asia 2026",
          start_date: "2026-07-01",
          end_date: "2026-07-15",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(1);
    expect(body.title).toBe("Southeast Asia 2026");
    expect(body.start_date).toBe("2026-07-01");
    expect(body.end_date).toBe("2026-07-15");
    expect(body.status).toBe("draft");
    expect(body.stops).toEqual([]);
    expect(body.created_at).toBeDefined();
    expect(body.updated_at).toBeDefined();
  });

  it("defaults status to draft when not provided", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Quick Trip" }),
      }),
    );

    const body = await response.json();
    expect(body.status).toBe("draft");
  });

  it("trims the title", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "  My Trip  " }),
      }),
    );

    const body = await response.json();
    expect(body.title).toBe("My Trip");
  });

  it("returns 400 for invalid JSON body", async () => {
    seedUser(testDb);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      }),
    );

    expect(response.status).toBe(400);
  });
});
