import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/trip-service", () => ({
  deleteTripStop: vi.fn(),
}));

const mockGetAuthUserId = vi.fn<() => Promise<number | null>>();
vi.mock("../../../_helpers", () => ({
  getAuthenticatedUserId: (...args: unknown[]) => mockGetAuthUserId(...(args as [])),
  parsePositiveInt: (value: string) => {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) return null;
    return num;
  },
}));

const { deleteTripStop } = await import("@/lib/trip-service");
const { DELETE: DEL } = await import("./route");

const mockDeleteStop = vi.mocked(deleteTripStop);

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

function callDELETE(id: string, stopId: string): Promise<Response> {
  const req = new Request(
    `http://localhost/api/trips/${id}/stops/${stopId}`,
    { method: "DELETE" },
  );
  return DEL(req, { params: Promise.resolve({ id, stopId }) });
}

describe("DELETE /api/trips/:id/stops/:stopId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await callDELETE("1", "1");
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid trip id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callDELETE("abc", "1");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid trip id");
  });

  it("returns 400 for invalid stop id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callDELETE("1", "xyz");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid stop id");
  });

  it("returns 404 when trip or stop not found", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockDeleteStop.mockResolvedValue(null);
    const res = await callDELETE("1", "1");
    expect(res.status).toBe(404);
  });

  it("returns 200 with updated trip on success", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockDeleteStop.mockResolvedValue(sampleTrip);
    const res = await callDELETE("1", "1");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(sampleTrip);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockDeleteStop.mockRejectedValue(new Error("DB error"));
    const res = await callDELETE("1", "1");
    expect(res.status).toBe(500);
  });
});
