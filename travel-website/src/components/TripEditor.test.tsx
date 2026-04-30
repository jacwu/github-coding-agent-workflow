// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: mockRefresh,
  }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} />
  ),
}));

// Mock @base-ui/react button to avoid duplicate DOM
vi.mock("@base-ui/react/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
}));

import TripEditor from "./TripEditor";

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
      departure_date: "2026-07-05",
      notes: "Visit temples",
      destination: {
        id: 1,
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        image: "/images/destinations/bali.jpg",
      },
    },
    {
      id: 11,
      destination_id: 2,
      sort_order: 2,
      arrival_date: "2026-07-06",
      departure_date: "2026-07-10",
      notes: null,
      destination: {
        id: 2,
        name: "Paris",
        country: "France",
        category: "city",
        image: "/images/destinations/paris.jpg",
      },
    },
  ],
};

const destinationOptions = [
  { id: 1, name: "Bali", country: "Indonesia", category: "beach" },
  { id: 2, name: "Paris", country: "France", category: "city" },
  { id: 3, name: "Banff", country: "Canada", category: "mountain" },
];

function renderEditor(trip = sampleTrip) {
  return render(
    <TripEditor initialTrip={trip} destinationOptions={destinationOptions} />,
  );
}

describe("TripEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders trip title and status", () => {
    renderEditor();
    expect(screen.getByText("Asia Trip")).toBeDefined();
    expect(screen.getByText("draft")).toBeDefined();
  });

  it("renders back link to trips page", () => {
    renderEditor();
    const link = screen.getByText("← Back to My Trips");
    expect(link.getAttribute("href")).toBe("/trips");
  });

  it("renders stop cards with destination info", () => {
    renderEditor();
    expect(screen.getByText("Bali")).toBeDefined();
    expect(screen.getByText("Paris")).toBeDefined();
    expect(screen.getByText("Stop 1")).toBeDefined();
    expect(screen.getByText("Stop 2")).toBeDefined();
  });

  it("renders empty state when no stops", () => {
    renderEditor({ ...sampleTrip, stops: [] });
    expect(
      screen.getByText("No stops yet. Add your first destination above!"),
    ).toBeDefined();
  });

  it("renders itinerary count", () => {
    renderEditor();
    expect(screen.getByText("Itinerary (2 stops)")).toBeDefined();
  });

  it("disables move up for first stop", () => {
    renderEditor();
    const upBtn = screen.getByLabelText("Move Bali up");
    expect(upBtn.hasAttribute("disabled")).toBe(true);
  });

  it("disables move down for last stop", () => {
    renderEditor();
    const downBtn = screen.getByLabelText("Move Paris down");
    expect(downBtn.hasAttribute("disabled")).toBe(true);
  });

  it("calls PUT /api/trips/:id on trip update", async () => {
    const user = userEvent.setup();
    const updatedTrip = { ...sampleTrip, title: "Updated Title" };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedTrip),
    });

    renderEditor();
    const titleInput = screen.getByLabelText("Title");
    await user.clear(titleInput);
    await user.type(titleInput, "Updated Title");
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/trips/1",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("calls POST /api/trips/:id/stops to add a stop", async () => {
    const user = userEvent.setup();
    const updatedTrip = { ...sampleTrip, stops: [...sampleTrip.stops] };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedTrip),
    });

    renderEditor();
    const select = screen.getByLabelText("Destination");
    await user.selectOptions(select, "3");
    await user.click(screen.getByRole("button", { name: "Add Stop" }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/trips/1/stops",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls PUT /api/trips/:id/stops on reorder (move down)", async () => {
    const user = userEvent.setup();
    const reorderedTrip = { ...sampleTrip };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(reorderedTrip),
    });

    renderEditor();
    await user.click(screen.getByLabelText("Move Bali down"));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/trips/1/stops",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("calls DELETE /api/trips/:id/stops/:stopId on remove", async () => {
    const user = userEvent.setup();
    const updatedTrip = {
      ...sampleTrip,
      stops: [sampleTrip.stops[1]],
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedTrip),
    });

    renderEditor();
    const removeButtons = screen.getAllByText("Remove");
    await user.click(removeButtons[0]);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/trips/1/stops/10",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("shows edit form on 'Edit dates & notes' click", async () => {
    const user = userEvent.setup();
    renderEditor();

    const editButtons = screen.getAllByText("Edit dates & notes");
    await user.click(editButtons[0]);

    expect(screen.getByLabelText("Arrival")).toBeDefined();
    expect(screen.getByLabelText("Departure")).toBeDefined();
    // The stop edit notes field has a specific id
    expect(document.getElementById("stop-notes-10")).not.toBeNull();
  });

  it("calls PUT /api/trips/:id/stops/:stopId on stop update", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(sampleTrip),
    });

    renderEditor();
    const editButtons = screen.getAllByText("Edit dates & notes");
    await user.click(editButtons[0]);

    const notesInput = document.getElementById("stop-notes-10") as HTMLInputElement;
    await user.clear(notesInput);
    await user.type(notesInput, "Updated notes");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/trips/1/stops/10",
      expect.objectContaining({ method: "PUT" }),
    );
  });

  it("shows trip update error on API failure", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    renderEditor();
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Server error")).toBeDefined();
  });

  it("shows add stop error when no destination selected", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Add Stop" }));

    expect(screen.getByText("Please select a destination")).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
