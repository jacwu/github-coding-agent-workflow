import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/trip-service", () => ({
  getTripByIdForUser: vi.fn(),
  updateTripForUser: vi.fn(),
  deleteTripForUser: vi.fn(),
}));

const mockGetAuthUserId = vi.fn<() => Promise<number | null>>();
vi.mock("../_helpers", () => ({
  getAuthenticatedUserId: (...args: unknown[]) => mockGetAuthUserId(...(args as [])),
  parsePositiveInt: (value: string) => {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) return null;
    return num;
  },
}));

const { getTripByIdForUser, updateTripForUser, deleteTripForUser } =
  await import("@/lib/trip-service");
const { GET, PUT, DELETE: DEL } = await import("./route");

const mockGetTrip = vi.mocked(getTripByIdForUser);
const mockUpdateTrip = vi.mocked(updateTripForUser);
const mockDeleteTrip = vi.mocked(deleteTripForUser);

const sampleTrip = {
  id: 1,
  title: "Asia Trip",
  start_date: "2026-07-01",
  end_date: "2026-07-15",
  status: "draft",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
  stops: [],
};

function callGET(id: string): Promise<Response> {
  const req = new Request(`http://localhost/api/trips/${id}`);
  return GET(req, { params: Promise.resolve({ id }) });
}

function callPUT(id: string, body: unknown): Promise<Response> {
  const req = new Request(`http://localhost/api/trips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PUT(req, { params: Promise.resolve({ id }) });
}

function callDELETE(id: string): Promise<Response> {
  const req = new Request(`http://localhost/api/trips/${id}`, {
    method: "DELETE",
  });
  return DEL(req, { params: Promise.resolve({ id }) });
}

describe("GET /api/trips/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await callGET("1");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callGET("abc");
    expect(res.status).toBe(400);
  });

  it("returns 404 when trip not found", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockGetTrip.mockResolvedValue(null);
    const res = await callGET("999");
    expect(res.status).toBe(404);
  });

  it("returns 200 with trip detail", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockGetTrip.mockResolvedValue(sampleTrip);
    const res = await callGET("1");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(sampleTrip);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockGetTrip.mockRejectedValue(new Error("DB error"));
    const res = await callGET("1");
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/trips/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await callPUT("1", { title: "X" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("abc", { title: "X" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty title", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", { title: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", { status: "cancelled" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid status");
  });

  it("returns 400 for unknown fields", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", { title: "Updated", unexpected: true });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Unknown field: unexpected");
  });

  it("returns 400 for invalid start_date format", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", { start_date: "bad" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when start_date > end_date", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", { start_date: "2026-08-01", end_date: "2026-07-01" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when provided end_date is before the existing start_date", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockGetTrip.mockResolvedValue(sampleTrip);
    const res = await callPUT("1", { end_date: "2026-06-30" });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("start_date must not be after end_date");
  });

  it("returns 404 when trip not found", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockGetTrip.mockResolvedValue(null);
    mockUpdateTrip.mockResolvedValue(null);
    const res = await callPUT("1", { title: "X" });
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated trip", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockGetTrip.mockResolvedValue(sampleTrip);
    const updated = { ...sampleTrip, title: "Updated" };
    mockUpdateTrip.mockResolvedValue(updated);
    const res = await callPUT("1", { title: "Updated" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe("Updated");
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockGetTrip.mockRejectedValue(new Error("DB error"));
    mockUpdateTrip.mockRejectedValue(new Error("DB error"));
    const res = await callPUT("1", { title: "X" });
    expect(res.status).toBe(500);
  });
});

describe("DELETE /api/trips/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await callDELETE("1");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callDELETE("abc");
    expect(res.status).toBe(400);
  });

  it("returns 404 when trip not found", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockDeleteTrip.mockResolvedValue(false);
    const res = await callDELETE("1");
    expect(res.status).toBe(404);
  });

  it("returns 204 on successful deletion", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockDeleteTrip.mockResolvedValue(true);
    const res = await callDELETE("1");
    expect(res.status).toBe(204);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockDeleteTrip.mockRejectedValue(new Error("DB error"));
    const res = await callDELETE("1");
    expect(res.status).toBe(500);
  });
});
