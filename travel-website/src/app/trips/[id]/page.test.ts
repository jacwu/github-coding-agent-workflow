import { describe, it, expect, vi, beforeEach } from "vitest";

class RedirectError extends Error {
  url: string;
  constructor(url: string) {
    super(`NEXT_REDIRECT: ${url}`);
    this.url = url;
  }
}

const redirectMock = vi.fn((url: string) => {
  throw new RedirectError(url);
});
const notFoundMock = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

let mockSession: { user: { id: string; name?: string } } | null = null;

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(mockSession),
}));

const mockGetTripDetail = vi.fn();

vi.mock("@/lib/trip-service", () => ({
  get getTripDetail() {
    return mockGetTripDetail;
  },
}));

const mockGetDestinationOptions = vi.fn();

vi.mock("@/lib/destination-service", () => ({
  get getDestinationOptions() {
    return mockGetDestinationOptions;
  },
}));

const SAMPLE_TRIP = {
  id: 1,
  title: "Europe Trip",
  start_date: "2026-06-01",
  end_date: "2026-06-15",
  status: "draft",
  created_at: "2026-01-01",
  updated_at: "2026-01-02",
  stops: [],
};

const SAMPLE_DESTINATIONS = [
  { id: 1, name: "Kyoto", country: "Japan" },
  { id: 2, name: "Paris", country: "France" },
];

describe("/trips/[id] page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: "1", name: "Alice" } };
  });

  it("redirects unauthenticated users to login with callbackUrl", async () => {
    mockSession = null;
    const { default: TripDetailPage } = await import("./page");

    await expect(
      TripDetailPage({ params: Promise.resolve({ id: "1" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=/trips/1");
  });

  it("calls notFound for invalid id", async () => {
    const { default: TripDetailPage } = await import("./page");

    await expect(
      TripDetailPage({ params: Promise.resolve({ id: "abc" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalled();
  });

  it("calls notFound when trip is not found or not owned", async () => {
    mockGetTripDetail.mockReturnValue(null);
    const { default: TripDetailPage } = await import("./page");

    await expect(
      TripDetailPage({ params: Promise.resolve({ id: "999" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockGetTripDetail).toHaveBeenCalledWith(1, 999);
  });

  it("loads trip data and destination options for valid trip", async () => {
    mockGetTripDetail.mockReturnValue(SAMPLE_TRIP);
    mockGetDestinationOptions.mockReturnValue(SAMPLE_DESTINATIONS);

    const { default: TripDetailPage } = await import("./page");
    const result = await TripDetailPage({ params: Promise.resolve({ id: "1" }) });

    expect(mockGetTripDetail).toHaveBeenCalledWith(1, 1);
    expect(mockGetDestinationOptions).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
