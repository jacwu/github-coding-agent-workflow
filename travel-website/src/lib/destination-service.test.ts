import { describe, it, expect, beforeEach, vi } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";

import * as schema from "@/db/schema";

vi.mock("server-only", () => ({}));

const { listDestinations, getDestinationById, isValidSort } = await import(
  "./destination-service"
);

function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const testDb = drizzle(sqlite, { schema });

  testDb.run(sql`
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
      created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
    )
  `);

  testDb.run(sql`CREATE INDEX destinations_region_idx ON destinations (region)`);
  testDb.run(sql`CREATE INDEX destinations_category_idx ON destinations (category)`);

  return testDb;
}

type TestDb = ReturnType<typeof createTestDb>;

function insertFixtures(testDb: TestDb) {
  testDb.run(sql`
    INSERT INTO destinations (id, name, description, country, region, category, price_level, rating, best_season, latitude, longitude, image)
    VALUES
      (1, 'Bali', 'A tropical paradise with stunning temples', 'Indonesia', 'Asia', 'beach', 2, 4.7, 'Apr-Oct', -8.34, 115.09, 'bali.jpg'),
      (2, 'Maldives', 'Crystal clear waters and overwater villas', 'Maldives', 'Asia', 'beach', 5, 4.9, 'Nov-Apr', 3.20, 73.22, 'maldives.jpg'),
      (3, 'Paris', 'The city of light and love', 'France', 'Europe', 'city', 4, 4.7, 'Apr-Jun', 48.85, 2.35, 'paris.jpg'),
      (4, 'Swiss Alps', 'Majestic mountain scenery', 'Switzerland', 'Europe', 'mountain', 5, 4.8, 'Jun-Sep', 46.57, 7.65, 'swiss-alps.jpg'),
      (5, 'Tuscany', 'Rolling hills and vineyards', 'Italy', 'Europe', 'countryside', 4, 4.7, 'Apr-Jun', 43.35, 11.35, 'tuscany.jpg'),
      (6, 'Nepal Himalayas', 'The roof of the world', 'Nepal', 'Asia', 'mountain', 1, 4.5, 'Mar-May', 27.98, 86.93, 'nepal.jpg'),
      (7, 'Banff', 'Canadian Rockies wonderland', 'Canada', 'North America', 'mountain', 3, 4.7, 'Jun-Sep', 51.17, -115.57, 'banff.jpg'),
      (8, 'Istanbul', 'Where East meets West', 'Turkey', 'Europe', 'city', 2, 4.5, 'Apr-May', 41.00, 28.97, 'istanbul.jpg')
  `);
}

describe("destination-service", () => {
  let testDb: TestDb;

  beforeEach(() => {
    testDb = createTestDb();
    insertFixtures(testDb);
  });

  describe("isValidSort", () => {
    it("accepts valid sort values", () => {
      expect(isValidSort("rating")).toBe(true);
      expect(isValidSort("price")).toBe(true);
      expect(isValidSort("popularity")).toBe(true);
    });

    it("rejects invalid sort values", () => {
      expect(isValidSort("name")).toBe(false);
      expect(isValidSort("")).toBe(false);
      expect(isValidSort("RATING")).toBe(false);
    });
  });

  describe("listDestinations", () => {
    describe("basic listing", () => {
      it("returns all destinations with default pagination", async () => {
        const result = await listDestinations({}, testDb);
        expect(result.data).toHaveLength(8);
        expect(result.total).toBe(8);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(12);
      });

      it("returns empty data from empty table", async () => {
        const emptyDb = createTestDb();
        const result = await listDestinations({}, emptyDb);
        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });

    describe("keyword search (q)", () => {
      it("matches by name", async () => {
        const result = await listDestinations({ q: "Bali" }, testDb);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe("Bali");
      });

      it("matches by country", async () => {
        const result = await listDestinations({ q: "France" }, testDb);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe("Paris");
      });

      it("matches by description", async () => {
        const result = await listDestinations({ q: "temples" }, testDb);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe("Bali");
      });

      it("is case-insensitive", async () => {
        const result = await listDestinations({ q: "bali" }, testDb);
        expect(result.data).toHaveLength(1);
        expect(result.data[0].name).toBe("Bali");
      });

      it("ignores empty/whitespace q", async () => {
        const result = await listDestinations({ q: "   " }, testDb);
        expect(result.data).toHaveLength(8);
      });

      it("matches across multiple columns with OR", async () => {
        // "Asia" appears in description of none directly, but appears in the region.
        // Use a word that appears in country and name differently
        const result = await listDestinations({ q: "Nepal" }, testDb);
        expect(result.total).toBe(1);
        expect(result.data[0].name).toBe("Nepal Himalayas");
      });
    });

    describe("region filter", () => {
      it("filters by exact region match", async () => {
        const result = await listDestinations({ region: "Asia" }, testDb);
        expect(result.total).toBe(3); // Bali, Maldives, Nepal
        result.data.forEach((d) => {
          // Region is not in list response, but we can check the items
          expect(["Bali", "Maldives", "Nepal Himalayas"]).toContain(d.name);
        });
      });

      it("is case-insensitive", async () => {
        const result = await listDestinations({ region: "europe" }, testDb);
        expect(result.total).toBe(4); // Paris, Swiss Alps, Tuscany, Istanbul
      });
    });

    describe("category filter", () => {
      it("filters by exact category match", async () => {
        const result = await listDestinations({ category: "beach" }, testDb);
        expect(result.total).toBe(2); // Bali, Maldives
      });

      it("is case-insensitive", async () => {
        const result = await listDestinations({ category: "MOUNTAIN" }, testDb);
        expect(result.total).toBe(3); // Swiss Alps, Nepal, Banff
      });
    });

    describe("price range filter", () => {
      it("filters with price_min only", async () => {
        const result = await listDestinations({ priceMin: 4 }, testDb);
        // price_level >= 4: Maldives(5), Paris(4), Swiss Alps(5), Tuscany(4)
        expect(result.total).toBe(4);
      });

      it("filters with price_max only", async () => {
        const result = await listDestinations({ priceMax: 2 }, testDb);
        // price_level <= 2: Bali(2), Nepal(1), Istanbul(2)
        expect(result.total).toBe(3);
      });

      it("filters with both bounds", async () => {
        const result = await listDestinations({ priceMin: 3, priceMax: 4 }, testDb);
        // price_level 3-4: Paris(4), Banff(3), Tuscany(4)
        expect(result.total).toBe(3);
      });

      it("handles boundary values", async () => {
        const result = await listDestinations({ priceMin: 5, priceMax: 5 }, testDb);
        // price_level = 5: Maldives, Swiss Alps
        expect(result.total).toBe(2);
      });
    });

    describe("combined filters", () => {
      it("combines region and category", async () => {
        const result = await listDestinations(
          { region: "Europe", category: "city" },
          testDb,
        );
        // Europe + city: Paris, Istanbul
        expect(result.total).toBe(2);
      });

      it("combines keyword search and price range", async () => {
        // q searches name, country, description — not category
        // "scenery" matches Swiss Alps description (price=5), so with priceMax=5 we get 1 result
        const result = await listDestinations(
          { q: "scenery", priceMax: 5 },
          testDb,
        );
        expect(result.total).toBe(1);
        expect(result.data[0].name).toBe("Swiss Alps");
      });

      it("returns empty when filters exclude everything", async () => {
        const result = await listDestinations(
          { region: "Asia", category: "countryside" },
          testDb,
        );
        expect(result.total).toBe(0);
        expect(result.data).toHaveLength(0);
      });
    });

    describe("sorting", () => {
      it("sorts by rating (descending) by default", async () => {
        const result = await listDestinations({}, testDb);
        expect(result.data[0].name).toBe("Maldives"); // 4.9
        expect(result.data[1].name).toBe("Swiss Alps"); // 4.8
      });

      it("sorts by rating with name tie-breaking", async () => {
        const result = await listDestinations({ sort: "rating" }, testDb);
        // 4.7: Bali, Banff, Paris, Tuscany — alphabetical order
        const rating47 = result.data.filter((d) => d.rating === 4.7);
        expect(rating47.map((d) => d.name)).toEqual(["Bali", "Banff", "Paris", "Tuscany"]);
      });

      it("sorts by price ascending", async () => {
        const result = await listDestinations({ sort: "price" }, testDb);
        expect(result.data[0].name).toBe("Nepal Himalayas"); // price 1
        // price 2: Bali(4.7), Istanbul(4.5) — by rating desc
        expect(result.data[1].name).toBe("Bali");
        expect(result.data[2].name).toBe("Istanbul");
      });

      it("popularity sorts same as rating", async () => {
        const resultRating = await listDestinations({ sort: "rating" }, testDb);
        const resultPop = await listDestinations({ sort: "popularity" }, testDb);
        expect(resultPop.data.map((d) => d.name)).toEqual(
          resultRating.data.map((d) => d.name),
        );
      });
    });

    describe("pagination", () => {
      it("paginates correctly with custom limit", async () => {
        const result = await listDestinations({ limit: 3 }, testDb);
        expect(result.data).toHaveLength(3);
        expect(result.total).toBe(8);
        expect(result.page).toBe(1);
        expect(result.limit).toBe(3);
      });

      it("returns correct page 2", async () => {
        const page1 = await listDestinations({ limit: 3, page: 1 }, testDb);
        const page2 = await listDestinations({ limit: 3, page: 2 }, testDb);
        expect(page2.data).toHaveLength(3);
        expect(page2.page).toBe(2);
        // No overlap
        const page1Names = page1.data.map((d) => d.name);
        const page2Names = page2.data.map((d) => d.name);
        page2Names.forEach((name) => {
          expect(page1Names).not.toContain(name);
        });
      });

      it("returns empty data for out-of-range page", async () => {
        const result = await listDestinations({ page: 100, limit: 12 }, testDb);
        expect(result.data).toHaveLength(0);
        expect(result.total).toBe(8);
        expect(result.page).toBe(100);
      });

      it("total reflects filtered count, not table count", async () => {
        const result = await listDestinations({ category: "beach" }, testDb);
        expect(result.total).toBe(2);
      });
    });
  });

  describe("getDestinationById", () => {
    it("returns the full destination detail when found", async () => {
      const result = await getDestinationById(1, testDb);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(1);
      expect(result!.name).toBe("Bali");
      expect(result!.description).toBe("A tropical paradise with stunning temples");
      expect(result!.country).toBe("Indonesia");
      expect(result!.region).toBe("Asia");
      expect(result!.category).toBe("beach");
      expect(result!.price_level).toBe(2);
      expect(result!.rating).toBe(4.7);
      expect(result!.best_season).toBe("Apr-Oct");
      expect(result!.latitude).toBe(-8.34);
      expect(result!.longitude).toBe(115.09);
      expect(result!.image).toBe("/images/destinations/bali.jpg");
    });

    it("returns null when destination does not exist", async () => {
      const result = await getDestinationById(999, testDb);
      expect(result).toBeNull();
    });
  });

  describe("response mapping", () => {
    it("list items use snake_case and full image paths", async () => {
      const result = await listDestinations({ q: "Bali" }, testDb);
      const item = result.data[0];
      expect(item).toEqual({
        id: 1,
        name: "Bali",
        country: "Indonesia",
        category: "beach",
        price_level: 2,
        rating: 4.7,
        image: "/images/destinations/bali.jpg",
      });
    });

    it("list items exclude description, region, best_season, latitude, longitude", async () => {
      const result = await listDestinations({ q: "Bali" }, testDb);
      const item = result.data[0] as Record<string, unknown>;
      expect(item).not.toHaveProperty("description");
      expect(item).not.toHaveProperty("region");
      expect(item).not.toHaveProperty("best_season");
      expect(item).not.toHaveProperty("latitude");
      expect(item).not.toHaveProperty("longitude");
      expect(item).not.toHaveProperty("createdAt");
      expect(item).not.toHaveProperty("created_at");
    });

    it("detail response includes all fields except createdAt", async () => {
      const result = await getDestinationById(1, testDb);
      expect(result).not.toBeNull();
      const detail = result as Record<string, unknown>;
      expect(detail).toHaveProperty("description");
      expect(detail).toHaveProperty("region");
      expect(detail).toHaveProperty("best_season");
      expect(detail).toHaveProperty("latitude");
      expect(detail).toHaveProperty("longitude");
      expect(detail).not.toHaveProperty("createdAt");
      expect(detail).not.toHaveProperty("created_at");
    });

    it("detail converts image filename to full path", async () => {
      const result = await getDestinationById(4, testDb);
      expect(result!.image).toBe("/images/destinations/swiss-alps.jpg");
    });
  });
});
