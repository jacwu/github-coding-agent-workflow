import { describe, it, expect } from "vitest";

import { buildAuthPageHref, sanitizeCallbackUrl } from "./auth-utils";

describe("sanitizeCallbackUrl", () => {
  it("returns the URL when it starts with /", () => {
    expect(sanitizeCallbackUrl("/dashboard")).toBe("/dashboard");
  });

  it("returns the URL for nested paths", () => {
    expect(sanitizeCallbackUrl("/trips/123")).toBe("/trips/123");
  });

  it("returns / for null", () => {
    expect(sanitizeCallbackUrl(null)).toBe("/");
  });

  it("returns / for undefined", () => {
    expect(sanitizeCallbackUrl(undefined)).toBe("/");
  });

  it("returns / for empty string", () => {
    expect(sanitizeCallbackUrl("")).toBe("/");
  });

  it("returns / for protocol-relative URLs (//)", () => {
    expect(sanitizeCallbackUrl("//evil.com")).toBe("/");
  });

  it("returns / for absolute URLs", () => {
    expect(sanitizeCallbackUrl("https://evil.com")).toBe("/");
  });

  it("returns / for http URLs", () => {
    expect(sanitizeCallbackUrl("http://evil.com")).toBe("/");
  });

  it("returns / for plain text without leading /", () => {
    expect(sanitizeCallbackUrl("dashboard")).toBe("/");
  });

  it("accepts / alone", () => {
    expect(sanitizeCallbackUrl("/")).toBe("/");
  });

  it("accepts paths with query strings", () => {
    expect(sanitizeCallbackUrl("/search?q=test")).toBe("/search?q=test");
  });
});

describe("buildAuthPageHref", () => {
  it("adds a sanitized callback URL to auth page links", () => {
    expect(buildAuthPageHref("/login", "/trips")).toBe(
      "/login?callbackUrl=%2Ftrips"
    );
  });

  it("omits unsafe callback URLs and keeps other params", () => {
    expect(
      buildAuthPageHref("/login", "https://evil.com", { registered: "1" })
    ).toBe("/login?registered=1");
  });
});
