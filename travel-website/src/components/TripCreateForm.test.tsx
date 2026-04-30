// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

// Mock @base-ui/react button to avoid duplicate DOM
vi.mock("@base-ui/react/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
}));

import TripCreateForm from "./TripCreateForm";

describe("TripCreateForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders title input and submit button", () => {
    render(<TripCreateForm />);
    expect(screen.getByLabelText("Title")).toBeDefined();
    expect(screen.getByRole("button", { name: "Create Trip" })).toBeDefined();
  });

  it("renders date inputs", () => {
    render(<TripCreateForm />);
    expect(screen.getByLabelText("Start date")).toBeDefined();
    expect(screen.getByLabelText("End date")).toBeDefined();
  });

  it("shows error when title is only whitespace", async () => {
    const user = userEvent.setup();
    render(<TripCreateForm />);

    await user.type(screen.getByLabelText("Title"), "   ");
    await user.click(screen.getByRole("button", { name: "Create Trip" }));

    expect(screen.getByRole("alert").textContent).toBe("Title is required");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("shows error when start date is after end date", async () => {
    const user = userEvent.setup();
    render(<TripCreateForm />);

    await user.type(screen.getByLabelText("Title"), "My Trip");
    const startInput = screen.getByLabelText("Start date");
    const endInput = screen.getByLabelText("End date");
    await user.clear(startInput);
    await user.type(startInput, "2026-08-10");
    await user.clear(endInput);
    await user.type(endInput, "2026-08-01");
    await user.click(screen.getByRole("button", { name: "Create Trip" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "Start date must not be after end date",
    );
  });

  it("calls API and navigates on success", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 42, title: "My Trip" }),
    });

    render(<TripCreateForm />);
    await user.type(screen.getByLabelText("Title"), "My Trip");
    await user.click(screen.getByRole("button", { name: "Create Trip" }));

    expect(global.fetch).toHaveBeenCalledWith("/api/trips", expect.objectContaining({
      method: "POST",
    }));
    expect(mockPush).toHaveBeenCalledWith("/trips/42");
  });

  it("shows error on API failure", async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Bad request" }),
    });

    render(<TripCreateForm />);
    await user.type(screen.getByLabelText("Title"), "My Trip");
    await user.click(screen.getByRole("button", { name: "Create Trip" }));

    expect(await screen.findByText("Bad request")).toBeDefined();
  });
});
