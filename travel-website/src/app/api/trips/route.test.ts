import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/trip-service", () => ({
  listTripsForUser: vi.fn(),
  createTrip: vi.fn(),
}));

const { auth } = await import("@/lib/auth");
const { listTripsForUser, createTrip } = await import("@/lib/trip-service");
const { GET, POST } = await import("./route");

const mockAuth = vi.mocked(auth);
const mockListTrips = vi.mocked(listTripsForUser);
const mockCreateTrip = vi.mocked(createTrip);

function makeSession(userId: string) {
  return { user: { id: userId, email: "a@b.com", name: "A" }, expires: "" };
}

function makePostRequest(body: unknown): Request {
  return new Request("http://localhost/api/trips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/trips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 401 when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {}, expires: "" } as ReturnType<typeof auth> extends Promise<infer T> ? T : never);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with trips list", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    const trips = [
      { id: 1, title: "Trip 1", start_date: null, end_date: null, status: "draft", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" },
    ];
    mockListTrips.mockResolvedValue(trips);

    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(trips);
    expect(mockListTrips).toHaveBeenCalledWith(1);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    mockListTrips.mockRejectedValue(new Error("DB error"));

    const res = await GET();
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });
});

describe("POST /api/trips", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await POST(makePostRequest({ title: "T" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when title is missing", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Title is required");
  });

  it("returns 400 when title is empty string", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    const res = await POST(makePostRequest({ title: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid start_date format", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    const res = await POST(makePostRequest({ title: "T", start_date: "not-a-date" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid start_date format");
  });

  it("returns 400 for invalid end_date format", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    const res = await POST(makePostRequest({ title: "T", end_date: "bad" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when start_date > end_date", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    const res = await POST(
      makePostRequest({ title: "T", start_date: "2026-08-01", end_date: "2026-07-01" }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("start_date must not be after end_date");
  });

  it("returns 201 with created trip", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    const created = {
      id: 1,
      title: "My Trip",
      start_date: "2026-07-01",
      end_date: "2026-07-15",
      status: "draft",
      created_at: "2026-01-01 00:00:00",
      updated_at: "2026-01-01 00:00:00",
      stops: [],
    };
    mockCreateTrip.mockResolvedValue(created);

    const res = await POST(
      makePostRequest({ title: "My Trip", start_date: "2026-07-01", end_date: "2026-07-15" }),
    );

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual(created);
  });

  it("returns 500 on unexpected error", async () => {
    mockAuth.mockResolvedValue(makeSession("1") as Awaited<ReturnType<typeof auth>>);
    mockCreateTrip.mockRejectedValue(new Error("DB error"));

    const res = await POST(makePostRequest({ title: "T" }));
    expect(res.status).toBe(500);
  });
});
