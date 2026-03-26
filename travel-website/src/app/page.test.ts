import { describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("Home", () => {
  it("redirects visitors to the destinations page", async () => {
    const { default: Home } = await import("./page");

    Home();

    expect(redirectMock).toHaveBeenCalledWith("/destinations");
  });
});
