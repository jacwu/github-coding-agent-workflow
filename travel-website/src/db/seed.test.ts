import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

vi.mock("server-only", () => ({}));
vi.mock("fs/promises", () => {
  const mock = {
    mkdir: vi.fn(),
    access: vi.fn(),
    writeFile: vi.fn(),
  };
  return { ...mock, default: mock };
});

import * as fsMock from "fs/promises";
import * as schema from "./schema";
import { destinations } from "./schema";
import {
  isAllowedHost,
  resolveImagePath,
  isImageContentType,
  downloadAllImages,
  seedDestinations,
} from "./seed";
import type { DestinationSeedEntry } from "./destination-seed-data";

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  sqlite.exec(`
    CREATE TABLE destinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      country TEXT NOT NULL,
      region TEXT,
      category TEXT NOT NULL,
      price_level INTEGER NOT NULL,
      rating REAL NOT NULL DEFAULT 0,
      best_season TEXT,
      latitude REAL,
      longitude REAL,
      image TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CHECK (price_level >= 1 AND price_level <= 5),
      CHECK (rating >= 0 AND rating <= 5)
    );
  `);
  return { db, sqlite };
}

function makeEntry(overrides: Partial<DestinationSeedEntry> = {}): DestinationSeedEntry {
  return {
    name: "Test Destination",
    description: "A test description",
    country: "Testland",
    region: "Test Region",
    category: "beach",
    priceLevel: 3,
    rating: 4.0,
    bestSeason: "Year-round",
    latitude: 0,
    longitude: 0,
    image: {
      sourceUrl: "https://images.unsplash.com/photo-test?w=800&q=80",
      filename: "test.jpg",
    },
    ...overrides,
  };
}

// ─── Helper validation tests ────────────────────────────────────────────────

describe("isAllowedHost", () => {
  it("accepts images.unsplash.com", () => {
    expect(isAllowedHost("https://images.unsplash.com/photo-123?w=800")).toBe(true);
  });

  it("accepts images.pexels.com", () => {
    expect(isAllowedHost("https://images.pexels.com/photos/123.jpg")).toBe(true);
  });

  it("rejects unknown hosts", () => {
    expect(isAllowedHost("https://evil.example.com/image.jpg")).toBe(false);
  });

  it("rejects non-http protocols", () => {
    expect(isAllowedHost("ftp://images.unsplash.com/photo-123")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(isAllowedHost("not-a-url")).toBe(false);
  });

  it("accepts http protocol", () => {
    expect(isAllowedHost("http://images.unsplash.com/photo-123")).toBe(true);
  });
});

describe("resolveImagePath", () => {
  it("resolves a simple filename within the base directory", () => {
    const result = resolveImagePath("/tmp/images", "bali.jpg");
    expect(result).toBe("/tmp/images/bali.jpg");
  });

  it("rejects path traversal attempts", () => {
    expect(() => resolveImagePath("/tmp/images", "../etc/passwd")).toThrow(
      /resolves outside the target directory/,
    );
  });

  it("rejects absolute path in filename", () => {
    expect(() => resolveImagePath("/tmp/images", "/etc/passwd")).toThrow(
      /resolves outside the target directory/,
    );
  });
});

describe("isImageContentType", () => {
  it("accepts image/jpeg", () => {
    expect(isImageContentType("image/jpeg")).toBe(true);
  });

  it("accepts image/png", () => {
    expect(isImageContentType("image/png")).toBe(true);
  });

  it("accepts image/webp", () => {
    expect(isImageContentType("image/webp")).toBe(true);
  });

  it("rejects text/html", () => {
    expect(isImageContentType("text/html")).toBe(false);
  });

  it("rejects null", () => {
    expect(isImageContentType(null)).toBe(false);
  });
});

// ─── Download orchestration tests ───────────────────────────────────────────

describe("downloadAllImages", () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  const mockedFs = vi.mocked(fsMock);

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    mockedFs.mkdir.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips download when file already exists", async () => {
    mockedFs.access.mockResolvedValue(undefined); // File exists

    const entry = makeEntry();
    await downloadAllImages([entry], "/tmp/test-images");

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("downloads and writes file when it does not exist", async () => {
    mockedFs.access.mockRejectedValue(new Error("ENOENT"));
    mockedFs.writeFile.mockResolvedValue(undefined);

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "image/jpeg" }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
    });

    const entry = makeEntry();
    await downloadAllImages([entry], "/tmp/test-images");

    expect(mockFetch).toHaveBeenCalledWith(entry.image.sourceUrl);
    expect(mockedFs.writeFile).toHaveBeenCalled();
  });

  it("throws on disallowed host", async () => {
    const entry = makeEntry({
      image: {
        sourceUrl: "https://evil.example.com/image.jpg",
        filename: "evil.jpg",
      },
    });

    await expect(downloadAllImages([entry], "/tmp/test-images")).rejects.toThrow(
      /host not allowed/,
    );
  });

  it("throws on failed HTTP response", async () => {
    mockedFs.access.mockRejectedValue(new Error("ENOENT"));

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const entry = makeEntry();
    await expect(downloadAllImages([entry], "/tmp/test-images")).rejects.toThrow(
      /Failed to download/,
    );
  });

  it("throws on non-image content type", async () => {
    mockedFs.access.mockRejectedValue(new Error("ENOENT"));

    mockFetch.mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "text/html" }),
    });

    const entry = makeEntry();
    await expect(downloadAllImages([entry], "/tmp/test-images")).rejects.toThrow(
      /Invalid content type/,
    );
  });
});

// ─── Database seed tests ────────────────────────────────────────────────────

describe("seedDestinations", () => {
  let db: ReturnType<typeof drizzle>;
  let sqlite: InstanceType<typeof Database>;

  beforeEach(() => {
    ({ db, sqlite } = createTestDb());
  });

  afterEach(() => {
    sqlite.close();
  });

  it("inserts new destinations", async () => {
    const entries = [
      makeEntry({ name: "Bali", image: { sourceUrl: "https://images.unsplash.com/photo-bali?w=800&q=80", filename: "bali.jpg" } }),
      makeEntry({ name: "Kyoto", image: { sourceUrl: "https://images.unsplash.com/photo-kyoto?w=800&q=80", filename: "kyoto.jpg" } }),
    ];

    await seedDestinations(db, entries);

    const result = db.select().from(destinations).all();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Bali");
    expect(result[0].image).toBe("bali.jpg");
    expect(result[1].name).toBe("Kyoto");
    expect(result[1].image).toBe("kyoto.jpg");
  });

  it("updates existing destinations by name", async () => {
    const entry = makeEntry({
      name: "Bali",
      rating: 4.0,
      image: { sourceUrl: "https://images.unsplash.com/photo-bali?w=800&q=80", filename: "bali.jpg" },
    });

    await seedDestinations(db, [entry]);

    let result = db.select().from(destinations).all();
    expect(result).toHaveLength(1);
    expect(result[0].rating).toBe(4.0);

    const updated = makeEntry({
      name: "Bali",
      rating: 4.7,
      image: { sourceUrl: "https://images.unsplash.com/photo-bali?w=800&q=80", filename: "bali.jpg" },
    });

    await seedDestinations(db, [updated]);

    result = db.select().from(destinations).all();
    expect(result).toHaveLength(1);
    expect(result[0].rating).toBe(4.7);
  });

  it("stores local filename, not CDN URL", async () => {
    const entry = makeEntry({
      name: "Paris",
      image: {
        sourceUrl: "https://images.unsplash.com/photo-paris?w=800&q=80",
        filename: "paris.jpg",
      },
    });

    await seedDestinations(db, [entry]);

    const result = db.select().from(destinations).all();
    expect(result[0].image).toBe("paris.jpg");
    expect(result[0].image).not.toContain("unsplash.com");
  });

  it("handles mix of inserts and updates", async () => {
    const bali = makeEntry({
      name: "Bali",
      country: "Indonesia",
      image: { sourceUrl: "https://images.unsplash.com/bali?w=800&q=80", filename: "bali.jpg" },
    });

    await seedDestinations(db, [bali]);
    expect(db.select().from(destinations).all()).toHaveLength(1);

    const updatedBali = makeEntry({
      name: "Bali",
      country: "Indonesia",
      description: "Updated description",
      image: { sourceUrl: "https://images.unsplash.com/bali?w=800&q=80", filename: "bali.jpg" },
    });
    const kyoto = makeEntry({
      name: "Kyoto",
      country: "Japan",
      image: { sourceUrl: "https://images.unsplash.com/kyoto?w=800&q=80", filename: "kyoto.jpg" },
    });

    await seedDestinations(db, [updatedBali, kyoto]);

    const result = db.select().from(destinations).all();
    expect(result).toHaveLength(2);

    const baliRow = result.find((d) => d.name === "Bali");
    expect(baliRow?.description).toBe("Updated description");

    const kyotoRow = result.find((d) => d.name === "Kyoto");
    expect(kyotoRow?.country).toBe("Japan");
  });
});
