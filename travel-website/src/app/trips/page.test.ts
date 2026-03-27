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

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: vi.fn(),
}));

let mockSession: { user: { id: string; name?: string } } | null = null;

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(mockSession),
}));

const mockGetUserTrips = vi.fn();

vi.mock("@/lib/trip-service", () => ({
  get getUserTrips() {
    return mockGetUserTrips;
  },
}));

describe("/trips page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession = { user: { id: "1", name: "Alice" } };
  });

  it("redirects unauthenticated users to login", async () => {
    mockSession = null;
    const { default: TripsPage } = await import("./page");

    await expect(TripsPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?callbackUrl=/trips");
  });

  it("calls getUserTrips with the correct user id", async () => {
    mockGetUserTrips.mockReturnValue({ data: [] });
    const { default: TripsPage } = await import("./page");
    await TripsPage();

    expect(mockGetUserTrips).toHaveBeenCalledWith(1);
  });

  it("does not redirect when authenticated", async () => {
    mockGetUserTrips.mockReturnValue({ data: [] });
    const { default: TripsPage } = await import("./page");
    await TripsPage();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("passes trip data to rendering", async () => {
    const trips = [
      {
        id: 1,
        title: "Europe Trip",
        start_date: "2026-06-01",
        end_date: "2026-06-15",
        status: "draft",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
        stop_count: 3,
      },
    ];
    mockGetUserTrips.mockReturnValue({ data: trips });
    const { default: TripsPage } = await import("./page");
    const result = await TripsPage();

    // The page should return some JSX (not throw/redirect)
    expect(result).toBeDefined();
  });
});
