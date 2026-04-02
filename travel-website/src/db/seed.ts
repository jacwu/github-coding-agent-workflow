/**
 * Database seed script — standalone CLI entrypoint.
 *
 * Downloads destination images from configured CDN URLs into
 * `travel-website/public/images/destinations/` and upserts all 30 canonical
 * destination rows into the SQLite database.
 *
 * **Must not** import from `./index` because that module has a `server-only`
 * guard. Instead it creates its own database connection via the helpers
 * exported from `./utils`.
 *
 * Run via: `npm run db:seed` (which executes `tsx src/db/seed.ts`).
 */

import fs from "fs/promises";
import path from "path";

import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";
import { destinations } from "./schema";
import { getDatabaseUrl, resolveDatabasePath } from "./utils";
import {
  DESTINATION_SEED_DATA,
  DestinationSeedEntry,
} from "./destination-seed-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeedDb = BetterSQLite3Database<typeof schema>;

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Create a standalone Drizzle database connection that mirrors the pragmas
 * used by the main app connection in `./index.ts` without the `server-only`
 * import.
 */
export function createSeedDb(): { db: SeedDb; sqliteDb: InstanceType<typeof Database> } {
  const dbUrl = getDatabaseUrl();
  const dbPath = resolveDatabasePath(dbUrl);
  const sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
  const db = drizzle(sqliteDb, { schema });
  return { db, sqliteDb };
}

/**
 * Apply the existing Drizzle migrations so the seed script works against a
 * fresh clone whose SQLite database file has not been initialized yet.
 */
export function ensureSeedSchema(db: SeedDb): void {
  migrate(db, {
    migrationsFolder: path.resolve(__dirname, "../../drizzle"),
  });
}

/**
 * Download a single image from `sourceUrl` and write it to `destPath`.
 * Throws on non-OK HTTP responses.
 */
export async function downloadImage(
  sourceUrl: string,
  destPath: string,
): Promise<void> {
  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download image from ${sourceUrl}: HTTP ${response.status}`,
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

/**
 * Upsert a single destination row. Inserts on first run and updates all
 * fields on subsequent runs, keeping IDs stable.
 */
export function upsertDestination(db: SeedDb, entry: DestinationSeedEntry): void {
  const values = {
    id: entry.id,
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
    image: entry.filename,
  };

  db.insert(destinations)
    .values(values)
    .onConflictDoUpdate({
      target: destinations.id,
      set: {
        name: values.name,
        description: values.description,
        country: values.country,
        region: values.region,
        category: values.category,
        priceLevel: values.priceLevel,
        rating: values.rating,
        bestSeason: values.bestSeason,
        latitude: values.latitude,
        longitude: values.longitude,
        image: values.image,
      },
    })
    .run();
}

/**
 * Top-level seed orchestrator. Downloads images and upserts database rows.
 */
export async function runSeed(): Promise<void> {
  // Create standalone DB connection
  const { db, sqliteDb } = createSeedDb();
  ensureSeedSchema(db);

  const imagesDir = path.resolve(
    __dirname,
    "../../public/images/destinations",
  );

  // Ensure the target directory exists
  await fs.mkdir(imagesDir, { recursive: true });

  let imagesDownloaded = 0;
  let imagesSkipped = 0;
  let rowsInserted = 0;
  let rowsUpdated = 0;

  try {
    for (const entry of DESTINATION_SEED_DATA) {
      const destPath = path.join(imagesDir, entry.filename);

      // Download image if it doesn't already exist
      let fileExists = false;
      try {
        await fs.access(destPath);
        fileExists = true;
      } catch {
        // File does not exist — will download
      }

      if (fileExists) {
        imagesSkipped++;
      } else {
        console.log(`Downloading ${entry.name} → ${entry.filename}...`);
        await downloadImage(entry.sourceUrl, destPath);
        imagesDownloaded++;
      }

      // Check if row already exists
      const existing = db
        .select({ id: destinations.id })
        .from(destinations)
        .where(eq(destinations.id, entry.id))
        .get();

      // Upsert destination row
      upsertDestination(db, entry);

      if (existing) {
        rowsUpdated++;
      } else {
        rowsInserted++;
      }
    }

    console.log("\n--- Seed Summary ---");
    console.log(`Images downloaded: ${imagesDownloaded}`);
    console.log(`Images skipped (already exist): ${imagesSkipped}`);
    console.log(`Destination rows inserted: ${rowsInserted}`);
    console.log(`Destination rows updated: ${rowsUpdated}`);
    console.log(`Total destinations: ${DESTINATION_SEED_DATA.length}`);
  } finally {
    sqliteDb.close();
  }
}

// ---------------------------------------------------------------------------
// CLI entry point — run when executed directly
// ---------------------------------------------------------------------------

const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith("seed.ts") ||
    process.argv[1].endsWith("seed.js"));

if (isDirectExecution) {
  runSeed()
    .then(() => {
      console.log("\nSeed completed successfully.");
      process.exit(0);
    })
    .catch((error: unknown) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
