import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/trip-service", () => ({
  addTripStop: vi.fn(),
  reorderTripStops: vi.fn(),
  DestinationNotFoundError: class DestinationNotFoundError extends Error {
    constructor(id: number) {
      super(`Destination ${id} not found`);
      this.name = "DestinationNotFoundError";
    }
  },
}));

const mockGetAuthUserId = vi.fn<() => Promise<number | null>>();
vi.mock("../../_helpers", () => ({
  getAuthenticatedUserId: (...args: unknown[]) => mockGetAuthUserId(...(args as [])),
  parsePositiveInt: (value: string) => {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) return null;
    return num;
  },
}));

const { addTripStop, reorderTripStops, DestinationNotFoundError } =
  await import("@/lib/trip-service");
const { POST, PUT } = await import("./route");

const mockAddStop = vi.mocked(addTripStop);
const mockReorder = vi.mocked(reorderTripStops);

const sampleTrip = {
  id: 1,
  title: "Asia Trip",
  start_date: "2026-07-01",
  end_date: "2026-07-15",
  status: "draft",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
  stops: [
    {
      id: 10,
      destination_id: 1,
      sort_order: 1,
      arrival_date: "2026-07-01",
      departure_date: "2026-07-03",
      notes: "Visit temples",
      destination: {
        id: 1,
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        image: "/images/destinations/bali.jpg",
      },
    },
  ],
};

function callPOST(id: string, body: unknown): Promise<Response> {
  const req = new Request(`http://localhost/api/trips/${id}/stops`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ id }) });
}

function callPUT(id: string, body: unknown): Promise<Response> {
  const req = new Request(`http://localhost/api/trips/${id}/stops`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return PUT(req, { params: Promise.resolve({ id }) });
}

describe("POST /api/trips/:id/stops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await callPOST("1", { destination_id: 1 });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid trip id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPOST("abc", { destination_id: 1 });
    expect(res.status).toBe(400);
  });

  it("returns 400 when destination_id is missing", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPOST("1", {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("destination_id must be a positive integer");
  });

  it("returns 400 for invalid arrival_date format", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPOST("1", { destination_id: 1, arrival_date: "bad" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when arrival_date > departure_date", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPOST("1", {
      destination_id: 1,
      arrival_date: "2026-08-01",
      departure_date: "2026-07-01",
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when trip not found", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockAddStop.mockResolvedValue(null);
    const res = await callPOST("1", { destination_id: 1 });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Trip not found");
  });

  it("returns 404 when destination not found", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockAddStop.mockRejectedValue(new DestinationNotFoundError(999));
    const res = await callPOST("1", { destination_id: 999 });
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Destination not found");
  });

  it("returns 201 with trip detail on success", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockAddStop.mockResolvedValue(sampleTrip);
    const res = await callPOST("1", { destination_id: 1 });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toEqual(sampleTrip);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockAddStop.mockRejectedValue(new Error("DB error"));
    const res = await callPOST("1", { destination_id: 1 });
    expect(res.status).toBe(500);
  });
});

describe("PUT /api/trips/:id/stops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetAuthUserId.mockResolvedValue(null);
    const res = await callPUT("1", { stops: [{ id: 1, sort_order: 1 }] });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid trip id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("abc", { stops: [{ id: 1, sort_order: 1 }] });
    expect(res.status).toBe(400);
  });

  it("returns 400 when stops is empty", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", { stops: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for duplicate stop ids", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", {
      stops: [
        { id: 1, sort_order: 1 },
        { id: 1, sort_order: 2 },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Duplicate stop id in reorder payload");
  });

  it("returns 400 for duplicate sort_orders", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", {
      stops: [
        { id: 1, sort_order: 1 },
        { id: 2, sort_order: 1 },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Duplicate sort_order in reorder payload");
  });

  it("returns 400 when sort_orders are not contiguous", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", {
      stops: [
        { id: 1, sort_order: 1 },
        { id: 2, sort_order: 3 },
      ],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("sort_order values must be contiguous from 1 to 2");
  });

  it("returns 400 when stop has non-integer id", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    const res = await callPUT("1", {
      stops: [{ id: "abc", sort_order: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when trip not found", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockReorder.mockResolvedValue(null);
    const res = await callPUT("1", {
      stops: [{ id: 1, sort_order: 1 }],
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when stops do not belong to trip", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockReorder.mockRejectedValue(new Error("Stop 999 does not belong to trip 1"));
    const res = await callPUT("1", {
      stops: [{ id: 999, sort_order: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for partial stop subsets", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockReorder.mockRejectedValue(
      new Error("Reorder payload must include all stops for the trip"),
    );
    const res = await callPUT("1", {
      stops: [{ id: 1, sort_order: 1 }],
    });
    expect(res.status).toBe(400);
  });

  it("returns 200 with reordered trip on success", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockReorder.mockResolvedValue(sampleTrip);
    const res = await callPUT("1", {
      stops: [{ id: 10, sort_order: 1 }],
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(sampleTrip);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetAuthUserId.mockResolvedValue(1);
    mockReorder.mockRejectedValue(new Error("DB error"));
    const res = await callPUT("1", {
      stops: [{ id: 1, sort_order: 1 }],
    });
    expect(res.status).toBe(500);
  });
});
