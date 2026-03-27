import { describe, it, expect } from "vitest";

import {
  DEFAULT_DATABASE_URL,
  getDatabaseUrl,
  resolveDatabasePath,
} from "./utils";

describe("resolveDatabasePath", () => {
  it("strips the file: prefix from a file: URL", () => {
    expect(resolveDatabasePath("file:./sqlite.db")).toBe("./sqlite.db");
  });

  it("strips the file: prefix from an absolute file: URL", () => {
    expect(resolveDatabasePath("file:/tmp/data.db")).toBe("/tmp/data.db");
  });

  it("returns a bare path as-is", () => {
    expect(resolveDatabasePath("./my-database.db")).toBe("./my-database.db");
  });

  it("returns an absolute bare path as-is", () => {
    expect(resolveDatabasePath("/var/data/app.db")).toBe("/var/data/app.db");
  });

  it("returns a Windows drive path as-is", () => {
    expect(resolveDatabasePath("C:\\data\\app.db")).toBe("C:\\data\\app.db");
  });

  it("throws for an unsupported protocol", () => {
    expect(() => resolveDatabasePath("postgres://localhost/db")).toThrow(
      'Unsupported DATABASE_URL protocol: "postgres://localhost/db"'
    );
  });

  it("throws for an http: URL", () => {
    expect(() => resolveDatabasePath("http://example.com/db")).toThrow(
      "Only \"file:\" URLs or bare file paths are supported."
    );
  });
});

describe("getDatabaseUrl", () => {
  it("returns the provided DATABASE_URL when it is supported", () => {
    expect(getDatabaseUrl("file:./custom.db")).toBe("file:./custom.db");
  });

  it("falls back to the default DATABASE_URL", () => {
    expect(getDatabaseUrl(undefined)).toBe(DEFAULT_DATABASE_URL);
  });

  it("throws early for an unsupported DATABASE_URL", () => {
    expect(() => getDatabaseUrl("postgres://localhost/db")).toThrow(
      'Unsupported DATABASE_URL protocol: "postgres://localhost/db"'
    );
  });
});
