import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/destination-service", () => ({
  getDestinationById: vi.fn(),
}));

const { getDestinationById } = await import("@/lib/destination-service");
const { GET } = await import("./route");

const mockGetDestinationById = vi.mocked(getDestinationById);

const sampleDestination = {
  id: 1,
  name: "Bali",
  description: "A tropical paradise with stunning temples",
  country: "Indonesia",
  region: "Asia",
  category: "beach",
  price_level: 2,
  rating: 4.7,
  best_season: "Apr-Oct",
  latitude: -8.34,
  longitude: 115.09,
  image: "/images/destinations/bali.jpg",
};

function callGET(id: string): Promise<Response> {
  const request = new Request(`http://localhost/api/destinations/${id}`);
  return GET(request, { params: Promise.resolve({ id }) });
}

describe("GET /api/destinations/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with destination data when found", async () => {
    mockGetDestinationById.mockResolvedValue(sampleDestination);

    const res = await callGET("1");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual(sampleDestination);
  });

  it("returns 404 when destination does not exist", async () => {
    mockGetDestinationById.mockResolvedValue(null);

    const res = await callGET("999");
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Destination not found");
  });

  it("returns 400 for non-numeric id", async () => {
    const res = await callGET("abc");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid destination id");
  });

  it("returns 400 for zero id", async () => {
    const res = await callGET("0");
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative id", async () => {
    const res = await callGET("-1");
    expect(res.status).toBe(400);
  });

  it("returns 400 for floating-point id", async () => {
    const res = await callGET("1.5");
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    mockGetDestinationById.mockRejectedValue(new Error("DB error"));

    const res = await callGET("1");
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });
});
