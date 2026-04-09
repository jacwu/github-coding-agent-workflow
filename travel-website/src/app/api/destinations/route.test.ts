import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/destination-service", () => ({
  listDestinations: vi.fn(),
  isValidSort: vi.fn(),
}));

const { listDestinations, isValidSort } = await import(
  "@/lib/destination-service"
);
const { GET } = await import("./route");

const mockListDestinations = vi.mocked(listDestinations);
const mockIsValidSort = vi.mocked(isValidSort);

function makeRequest(queryString = ""): Request {
  return new Request(`http://localhost/api/destinations${queryString}`);
}

const emptyResult = {
  data: [],
  total: 0,
  page: 1,
  limit: 12,
};

const sampleResult = {
  data: [
    {
      id: 1,
      name: "Bali",
      country: "Indonesia",
      category: "beach",
      price_level: 2,
      rating: 4.7,
      image: "/images/destinations/bali.jpg",
    },
  ],
  total: 1,
  page: 1,
  limit: 12,
};

describe("GET /api/destinations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // By default, isValidSort behaves realistically
    mockIsValidSort.mockImplementation(
      (v: string) => ["rating", "price", "popularity"].includes(v),
    );
  });

  it("returns 200 with paginated data on success", async () => {
    mockListDestinations.mockResolvedValue(sampleResult);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(1);
    expect(data.total).toBe(1);
    expect(data.page).toBe(1);
    expect(data.limit).toBe(12);
  });

  it("returns 200 with empty data when no results", async () => {
    mockListDestinations.mockResolvedValue(emptyResult);

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it("passes query parameters to service", async () => {
    mockListDestinations.mockResolvedValue(emptyResult);

    await GET(makeRequest("?q=beach&region=Asia&category=beach&price_min=1&price_max=3&sort=rating&page=2&limit=5"));

    expect(mockListDestinations).toHaveBeenCalledWith({
      q: "beach",
      region: "Asia",
      category: "beach",
      priceMin: 1,
      priceMax: 3,
      sort: "rating",
      page: 2,
      limit: 5,
    });
  });

  it("returns 400 for invalid page (non-numeric)", async () => {
    const res = await GET(makeRequest("?page=abc"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid page parameter");
  });

  it("returns 400 for invalid page (zero)", async () => {
    const res = await GET(makeRequest("?page=0"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid page parameter");
  });

  it("returns 400 for invalid page (negative)", async () => {
    const res = await GET(makeRequest("?page=-1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid limit (non-numeric)", async () => {
    const res = await GET(makeRequest("?limit=abc"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid limit parameter");
  });

  it("returns 400 for invalid limit (zero)", async () => {
    const res = await GET(makeRequest("?limit=0"));
    expect(res.status).toBe(400);
  });

  it("clamps limit to 100", async () => {
    mockListDestinations.mockResolvedValue(emptyResult);

    await GET(makeRequest("?limit=200"));

    expect(mockListDestinations).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 100 }),
    );
  });

  it("returns 400 for invalid sort", async () => {
    const res = await GET(makeRequest("?sort=invalid"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid sort parameter");
  });

  it("returns 400 for invalid price_min", async () => {
    const res = await GET(makeRequest("?price_min=0"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid price_min parameter");
  });

  it("returns 400 for price_min > 5", async () => {
    const res = await GET(makeRequest("?price_min=6"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid price_max", async () => {
    const res = await GET(makeRequest("?price_max=abc"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid price_max parameter");
  });

  it("returns 400 when price_min > price_max", async () => {
    const res = await GET(makeRequest("?price_min=4&price_max=2"));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("price_min must not exceed price_max");
  });

  it("returns 400 for floating point page", async () => {
    const res = await GET(makeRequest("?page=1.5"));
    expect(res.status).toBe(400);
  });

  it("returns 500 on unexpected error", async () => {
    mockListDestinations.mockRejectedValue(new Error("DB error"));

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Internal server error");
  });
});
