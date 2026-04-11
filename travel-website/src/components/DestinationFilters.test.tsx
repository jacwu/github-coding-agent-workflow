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

  it("renders a visible search label", () => {
    render(<DestinationFilters />);

    const label = screen.getByText("Search destinations");
    expect(label).toBeDefined();
    expect(label.className).not.toContain("sr-only");
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

  it("clears price_max when price_min is set above current price_max", async () => {
    mockSearchParams.set("price_max", "2");

    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.selectOptions(screen.getByLabelText("Min Price"), "4");

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("price_min=4");
    expect(calledUrl).not.toContain("price_max=");
  });

  it("clears price_min when price_max is set below current price_min", async () => {
    mockSearchParams.set("price_min", "4");

    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.selectOptions(screen.getByLabelText("Max Price"), "2");

    expect(mockPush).toHaveBeenCalledTimes(1);
    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("price_max=2");
    expect(calledUrl).not.toContain("price_min=");
  });

  it("keeps both price params when price_min equals price_max", async () => {
    mockSearchParams.set("price_max", "3");

    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.selectOptions(screen.getByLabelText("Min Price"), "3");

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("price_min=3");
    expect(calledUrl).toContain("price_max=3");
  });

  it("keeps both price params when price_min is below price_max", async () => {
    mockSearchParams.set("price_max", "4");

    const user = userEvent.setup();
    render(<DestinationFilters />);

    await user.selectOptions(screen.getByLabelText("Min Price"), "2");

    const calledUrl = mockPush.mock.calls[0][0] as string;
    expect(calledUrl).toContain("price_min=2");
    expect(calledUrl).toContain("price_max=4");
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
