import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseDestinationSearchParams } from "./destination-query-params";

describe("parseDestinationSearchParams", () => {
  it("returns correct defaults when no params are provided", () => {
    const result = parseDestinationSearchParams({});
    expect(result.params).toEqual({
      q: undefined,
      region: undefined,
      category: undefined,
      priceMin: undefined,
      priceMax: undefined,
      sort: undefined,
      page: 1,
      limit: 12,
    });
  });

  it("parses valid page value", () => {
    const result = parseDestinationSearchParams({ page: "3" });
    expect(result.params.page).toBe(3);
  });

  it("parses valid limit value", () => {
    const result = parseDestinationSearchParams({ limit: "24" });
    expect(result.params.limit).toBe(24);
  });

  it("clamps limit to maximum of 100", () => {
    const result = parseDestinationSearchParams({ limit: "500" });
    expect(result.params.limit).toBe(100);
  });

  it("parses valid sort values", () => {
    expect(parseDestinationSearchParams({ sort: "rating" }).params.sort).toBe("rating");
    expect(parseDestinationSearchParams({ sort: "price" }).params.sort).toBe("price");
    expect(parseDestinationSearchParams({ sort: "popularity" }).params.sort).toBe("popularity");
  });

  it("degrades invalid sort to undefined", () => {
    const result = parseDestinationSearchParams({ sort: "unknown" });
    expect(result.params.sort).toBeUndefined();
  });

  it("parses valid price_min and price_max values", () => {
    const result = parseDestinationSearchParams({ price_min: "2", price_max: "4" });
    expect(result.params.priceMin).toBe(2);
    expect(result.params.priceMax).toBe(4);
  });

  it("degrades invalid price values to undefined", () => {
    const result = parseDestinationSearchParams({ price_min: "0", price_max: "6" });
    expect(result.params.priceMin).toBeUndefined();
    expect(result.params.priceMax).toBeUndefined();
  });

  it("degrades non-integer page to default", () => {
    const result = parseDestinationSearchParams({ page: "abc" });
    expect(result.params.page).toBe(1);
  });

  it("degrades negative page to default", () => {
    const result = parseDestinationSearchParams({ page: "-1" });
    expect(result.params.page).toBe(1);
  });

  it("degrades fractional page to default", () => {
    const result = parseDestinationSearchParams({ page: "1.5" });
    expect(result.params.page).toBe(1);
  });

  it("validates price_min <= price_max constraint", () => {
    const result = parseDestinationSearchParams({ price_min: "4", price_max: "2" });
    expect(result.params.priceMin).toBeUndefined();
    expect(result.params.priceMax).toBeUndefined();
  });

  it("preserves string params as-is", () => {
    const result = parseDestinationSearchParams({
      q: "beach resort",
      region: "Asia",
      category: "beach",
    });
    expect(result.params.q).toBe("beach resort");
    expect(result.params.region).toBe("Asia");
    expect(result.params.category).toBe("beach");
  });

  it("returns raw string values in raw field", () => {
    const result = parseDestinationSearchParams({
      q: "test",
      region: "Europe",
      category: "city",
      price_min: "2",
      price_max: "4",
      sort: "rating",
      page: "3",
      limit: "24",
    });
    expect(result.raw).toEqual({
      q: "test",
      region: "Europe",
      category: "city",
      priceMin: "2",
      priceMax: "4",
      sort: "rating",
      page: "3",
      limit: "24",
    });
  });

  it("handles array values by taking the first element", () => {
    const result = parseDestinationSearchParams({
      q: ["first", "second"],
      page: ["2", "5"],
    });
    expect(result.params.q).toBe("first");
    expect(result.params.page).toBe(2);
  });

  it("handles empty string values as undefined params", () => {
    const result = parseDestinationSearchParams({
      q: "",
      region: "",
      category: "",
    });
    expect(result.params.q).toBeUndefined();
    expect(result.params.region).toBeUndefined();
    expect(result.params.category).toBeUndefined();
  });
});
