import { describe, it, expect } from "vitest";

import {
  DESTINATION_SEED_DATA,
} from "./destination-seed-data";

describe("destination seed data manifest", () => {
  it("contains exactly 30 destinations", () => {
    expect(DESTINATION_SEED_DATA).toHaveLength(30);
  });

  it("has unique destination names", () => {
    const names = DESTINATION_SEED_DATA.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has unique image filenames", () => {
    const filenames = DESTINATION_SEED_DATA.map((d) => d.image.filename);
    expect(new Set(filenames).size).toBe(filenames.length);
  });

  it("every priceLevel is between 1 and 5", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.priceLevel).toBeGreaterThanOrEqual(1);
      expect(entry.priceLevel).toBeLessThanOrEqual(5);
    }
  });

  it("every rating is between 0 and 5", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.rating).toBeGreaterThanOrEqual(0);
      expect(entry.rating).toBeLessThanOrEqual(5);
    }
  });

  it("every entry has required string fields", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.name).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.country).toBeTruthy();
      expect(entry.region).toBeTruthy();
      expect(entry.category).toBeTruthy();
      expect(entry.bestSeason).toBeTruthy();
      expect(entry.image.sourceUrl).toBeTruthy();
      expect(entry.image.filename).toBeTruthy();
    }
  });

  it("every entry has valid coordinates", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.latitude).toBeGreaterThanOrEqual(-90);
      expect(entry.latitude).toBeLessThanOrEqual(90);
      expect(entry.longitude).toBeGreaterThanOrEqual(-180);
      expect(entry.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("every image sourceUrl uses HTTPS", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.image.sourceUrl).toMatch(/^https:\/\//);
    }
  });

  it("every image filename ends with .jpg", () => {
    for (const entry of DESTINATION_SEED_DATA) {
      expect(entry.image.filename).toMatch(/\.jpg$/);
    }
  });

  it("covers all four categories", () => {
    const categories = new Set(DESTINATION_SEED_DATA.map((d) => d.category));
    expect(categories).toEqual(
      new Set(["beach", "mountain", "city", "countryside"]),
    );
  });

  it("includes the specific destinations from the design document", () => {
    const names = new Set(DESTINATION_SEED_DATA.map((d) => d.name));
    const expectedNames = [
      "Bali",
      "Maldives",
      "Cancún",
      "Phuket",
      "Santorini",
      "Zanzibar",
      "Maui",
      "Boracay",
      "Swiss Alps",
      "Banff",
      "Patagonia",
      "Nepal Himalayas",
      "Dolomites",
      "Mount Fuji",
      "Queenstown",
      "Kyoto",
      "Paris",
      "Barcelona",
      "Istanbul",
      "New York",
      "Marrakech",
      "Singapore",
      "Buenos Aires",
      "Tuscany",
      "Provence",
      "Cotswolds",
      "Ubud",
      "Luang Prabang",
      "Napa Valley",
      "Chiang Mai",
    ];
    for (const name of expectedNames) {
      expect(names.has(name)).toBe(true);
    }
  });
});
