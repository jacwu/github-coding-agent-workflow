import path from "path";
import fs from "fs/promises";
import { pathToFileURL } from "url";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";

import * as schema from "./schema";
import { destinations } from "./schema";
import { DESTINATION_SEED_DATA } from "./destination-seed-data";

import type { DestinationSeedEntry } from "./destination-seed-data";

// ─── Configuration ──────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/app.db";

const IMAGE_DIR = path.resolve("public/images/destinations");

const ALLOWED_HOSTS = new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "www.pexels.com",
]);

// ─── Helper Functions ───────────────────────────────────────────────────────

export function isAllowedHost(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return false;
    }
    return ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function resolveImagePath(
  baseDir: string,
  filename: string,
): string {
  const resolved = path.resolve(baseDir, filename);
  const normalizedBase = path.resolve(baseDir);
  if (!resolved.startsWith(normalizedBase + path.sep)) {
    throw new Error(
      `Filename "${filename}" resolves outside the target directory`,
    );
  }
  return resolved;
}

export function isImageContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().startsWith("image/");
}

// ─── Download Logic ─────────────────────────────────────────────────────────

export async function downloadImage(
  sourceUrl: string,
  destPath: string,
): Promise<void> {
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(
      `Failed to download ${sourceUrl}: ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get("content-type");
  if (!isImageContentType(contentType)) {
    throw new Error(
      `Invalid content type for ${sourceUrl}: ${contentType}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(arrayBuffer));
}

export async function downloadAllImages(
  entries: DestinationSeedEntry[],
  imageDir: string,
): Promise<void> {
  await fs.mkdir(imageDir, { recursive: true });

  for (const entry of entries) {
    const { sourceUrl, filename } = entry.image;

    if (!isAllowedHost(sourceUrl)) {
      throw new Error(
        `Source URL host not allowed for "${entry.name}": ${sourceUrl}`,
      );
    }

    const destPath = resolveImagePath(imageDir, filename);

    try {
      await fs.access(destPath);
      console.log(`  ✓ Skipping "${entry.name}" — ${filename} already exists`);
      continue;
    } catch (error: unknown) {
      const accessError = error as NodeJS.ErrnoException;
      if (accessError.code !== "ENOENT") {
        throw error;
      }
    }

    console.log(`  ↓ Downloading "${entry.name}" → ${filename}...`);
    await downloadImage(sourceUrl, destPath);
    console.log(`  ✓ Saved ${filename}`);
  }
}

// ─── Database Logic ─────────────────────────────────────────────────────────

export async function seedDestinations(
  db: ReturnType<typeof drizzle>,
  entries: DestinationSeedEntry[],
): Promise<void> {
  const existing = db.select().from(destinations).all();
  const existingByName = new Map(existing.map((d) => [d.name, d]));

  for (const entry of entries) {
    const match = existingByName.get(entry.name);

    const values = {
      name: entry.name,
      description: entry.description,
      country: entry.country,
      region: entry.region,
      category: entry.category,
      priceLevel: entry.priceLevel,
      rating: entry.rating,
      bestSeason: entry.bestSeason,
      latitude: entry.latitude,
      longitude: entry.longitude,
      image: entry.image.filename,
    };

    if (match) {
      db.update(destinations)
        .set(values)
        .where(eq(destinations.id, match.id))
        .run();
      console.log(`  ✏ Updated "${entry.name}"`);
    } else {
      db.insert(destinations).values(values).run();
      console.log(`  ✚ Inserted "${entry.name}"`);
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("🌍 Starting destination seed...\n");

  // 1. Download images
  console.log("📸 Downloading images...");
  await downloadAllImages(DESTINATION_SEED_DATA, IMAGE_DIR);
  console.log("✅ All images ready.\n");

  // 2. Seed database
  console.log("💾 Seeding database...");
  const sqlite = new Database(DATABASE_URL);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });

  try {
    await seedDestinations(db, DESTINATION_SEED_DATA);
    console.log("✅ Database seeded successfully.\n");
  } finally {
    sqlite.close();
  }

  console.log(
    `🎉 Done! ${DESTINATION_SEED_DATA.length} destinations ready.`,
  );
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main().catch((error: unknown) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
}
