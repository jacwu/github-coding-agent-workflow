// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/destinations",
  useSearchParams: () => mockSearchParams,
}));

// Mock @base-ui/react/input to avoid jsdom issues
vi.mock("@base-ui/react/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

import DestinationFilters from "./DestinationFilters";

describe("DestinationFilters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset search params to empty
    for (const key of [...mockSearchParams.keys()]) {
      mockSearchParams.delete(key);
    }
  });

  afterEach(() => {
    cleanup();
  });

  it("renders search input", () => {
    render(<DestinationFilters />);
    expect(screen.getByPlaceholderText("Search destinations...")).toBeDefined();
  });

  it("renders region select", () => {
    render(<DestinationFilters />);
    expect(screen.getByLabelText("Region")).toBeDefined();
  });

  it("renders category select", () => {
    render(<DestinationFilters />);
    expect(screen.getByLabelText("Category")).toBeDefined();
  });

  it("renders sort select", () => {
    render(<DestinationFilters />);
    expect(screen.getByLabelText("Sort by")).toBeDefined();
  });

  it("renders price selects", () => {
    render(<DestinationFilters />);
    expect(screen.getByLabelText("Min Price")).toBeDefined();
    expect(screen.getByLabelText("Max Price")).toBeDefined();
  });

  it("renders reset button", () => {
    render(<DestinationFilters />);
    expect(screen.getByText("Reset")).toBeDefined();
  });

  it("pushes updated query string on search submit", async () => {
    const user = userEvent.setup();
    render(<DestinationFilters />);

    const input = screen.getByPlaceholderText("Search destinations...");
    await user.clear(input);
    await user.type(input, "beach");
    await user.click(screen.getByText("Search"));

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("q=beach");
  });

  it("pushes updated query string on region change", async () => {
    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.selectOptions(screen.getByLabelText("Region"), "Asia");

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("region=Asia");
  });

  it("resets page when filter changes", async () => {
    mockSearchParams.set("page", "3");
    mockSearchParams.set("region", "Europe");

    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.selectOptions(screen.getByLabelText("Category"), "beach");

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("page=");
  });

  it("clears all filters when reset is clicked", async () => {
    mockSearchParams.set("q", "beach");
    mockSearchParams.set("region", "Asia");

    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.click(screen.getByText("Reset"));

    expect(mockPush).toHaveBeenCalledWith("/destinations");
  });

  it("preserves existing filter values when only one filter changes", async () => {
    mockSearchParams.set("q", "resort");
    mockSearchParams.set("region", "Europe");

    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.selectOptions(screen.getByLabelText("Category"), "city");

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("q=resort");
    expect(calledUrl).toContain("region=Europe");
    expect(calledUrl).toContain("category=city");
  });

  it("initializes controls from current URL params", () => {
    mockSearchParams.set("region", "Asia");
    mockSearchParams.set("sort", "price");

    render(<DestinationFilters />);

    const regionSelect = screen.getByLabelText("Region") as HTMLSelectElement;
    expect(regionSelect.value).toBe("Asia");

    const sortSelect = screen.getByLabelText("Sort by") as HTMLSelectElement;
    expect(sortSelect.value).toBe("price");
  });
});
