// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";

import TripEditor from "./TripEditor";
import type { TripDetail } from "@/lib/trips";
import type { DestinationOption } from "@/lib/destination-service";

// Mock next/navigation
const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const SAMPLE_TRIP: TripDetail = {
  id: 1,
  title: "Europe Trip",
  start_date: "2026-06-01",
  end_date: "2026-06-15",
  status: "draft",
  created_at: "2026-01-01",
  updated_at: "2026-01-02",
  stops: [
    {
      id: 10,
      destination_id: 1,
      destination_name: "Kyoto",
      destination_country: "Japan",
      destination_image: "/images/destinations/kyoto.jpg",
      sort_order: 1,
      arrival_date: "2026-06-01",
      departure_date: "2026-06-05",
      notes: "Visit temples",
    },
    {
      id: 11,
      destination_id: 2,
      destination_name: "Paris",
      destination_country: "France",
      destination_image: "/images/destinations/paris.jpg",
      sort_order: 2,
      arrival_date: "2026-06-06",
      departure_date: "2026-06-10",
      notes: null,
    },
  ],
};

const SAMPLE_DESTINATIONS: DestinationOption[] = [
  { id: 1, name: "Kyoto", country: "Japan" },
  { id: 2, name: "Paris", country: "France" },
  { id: 3, name: "Bali", country: "Indonesia" },
];

describe("TripEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    global.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders trip metadata form with initial values", () => {
    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    expect(titleInput.value).toBe("Europe Trip");

    const statusSelect = screen.getByLabelText(/status/i) as HTMLSelectElement;
    expect(statusSelect.value).toBe("draft");
  });

  it("submits metadata update to PUT /api/trips/:id", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SAMPLE_TRIP),
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: "Updated Trip" } });

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trips/1",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("Updated Trip"),
        }),
      );
    });
  });

  it("shows error when metadata update fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Title too short" }),
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Title too short")).toBeTruthy();
    });
  });

  it("calls DELETE /api/trips/:id and navigates to /trips on delete", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    const deleteButton = screen.getByRole("button", { name: /delete trip/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trips/1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(pushMock).toHaveBeenCalledWith("/trips");
    });
  });

  it("submits add-stop form to POST /api/trips/:id/stops", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SAMPLE_TRIP),
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    // Click "Add Stop" to show form
    const addStopButton = screen.getByRole("button", { name: /add stop/i });
    fireEvent.click(addStopButton);

    // Select destination
    const destSelect = screen.getByLabelText(/destination/i) as HTMLSelectElement;
    fireEvent.change(destSelect, { target: { value: "3" } });

    // Submit
    const submitButton = screen.getByRole("button", { name: /^add stop$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trips/1/stops",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"destination_id":3'),
        }),
      );
    });
  });

  it("sends reorder payload when moving a stop down", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SAMPLE_TRIP),
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    // Find move-down buttons (first stop should have an enabled move-down)
    const moveDownButtons = screen.getAllByTitle("Move down");
    fireEvent.click(moveDownButtons[0]); // move first stop down

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trips/1/stops",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining("sort_order"),
        }),
      );
    });
  });

  it("shows an itinerary error when reordering fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Unable to reorder stops" }),
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    const moveDownButtons = screen.getAllByTitle("Move down");
    fireEvent.click(moveDownButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Unable to reorder stops")).toBeTruthy();
    });
  });

  it("calls DELETE /api/trips/:id/stops/:stopId for stop removal", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    const removeButtons = screen.getAllByTitle("Remove stop");
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trips/1/stops/10",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("shows an itinerary error when stop removal fails", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Unable to remove stop" }),
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    const removeButtons = screen.getAllByTitle("Remove stop");
    fireEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Unable to remove stop")).toBeTruthy();
    });
  });

  it("renders stop edit form and submits update", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(SAMPLE_TRIP),
    });

    render(
      <TripEditor trip={SAMPLE_TRIP} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    // Click edit on first stop
    const editButtons = screen.getAllByTitle("Edit stop");
    fireEvent.click(editButtons[0]);

    // Save the edit
    const saveButton = screen.getByRole("button", { name: /^save$/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/trips/1/stops/10",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
  });

  it("renders empty itinerary state", () => {
    const tripWithNoStops = { ...SAMPLE_TRIP, stops: [] };
    render(
      <TripEditor trip={tripWithNoStops} destinationOptions={SAMPLE_DESTINATIONS} />,
    );

    expect(
      screen.getByText(/no stops yet/i),
    ).toBeTruthy();
  });
});
